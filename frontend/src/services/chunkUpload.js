import api from './api';

const SESSION_PREFIX = 'movieflex-b2-multipart:';
const DEFAULT_PART_SIZE = 8 * 1024 * 1024;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function fingerprint(file) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

async function requestPartUrl(sessionId, partNumber) {
  const { data } = await api.post('/upload/b2/part-url', { sessionId, partNumber });
  if (!data?.success || !data.uploadUrl) throw new Error(data?.message || `Could not create upload URL for part ${partNumber}`);
  return data.uploadUrl;
}

async function uploadOnePart(file, sessionId, partNumber, partSize, onPartProgress) {
  const start = (partNumber - 1) * partSize;
  const blob = file.slice(start, Math.min(file.size, start + partSize));
  let lastError;

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const uploadUrl = await requestPartUrl(sessionId, partNumber);
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        // Do not manually set Content-Type or Content-Length; the browser sets them.
        mode: 'cors',
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`B2 part ${partNumber} failed (${response.status})${detail ? `: ${detail.slice(0, 250)}` : ''}`);
      }
      onPartProgress(blob.size);
      return blob.size;
    } catch (error) {
      lastError = error;
      if (attempt < 5) await sleep(Math.min(1000 * (2 ** (attempt - 1)), 8000));
    }
  }
  throw lastError || new Error(`Part ${partNumber} failed`);
}

async function uploadParts(file, sessionId, partNumbers, partSize, totalBytes, onProgress, onMessage) {
  if (!partNumbers.length) return;
  let completedBytes = totalBytes;
  const queue = [...partNumbers];
  const workers = Array.from({ length: Math.min(3, queue.length) }, async () => {
    while (queue.length) {
      const partNumber = queue.shift();
      onMessage(`Uploading part ${partNumber} of ${Math.ceil(file.size / partSize)} directly to Backblaze B2…`);
      await uploadOnePart(file, sessionId, partNumber, partSize, (bytes) => {
        completedBytes += bytes;
        onProgress(Math.min(99, Math.floor((completedBytes / file.size) * 100)));
      });
    }
  });
  await Promise.all(workers);
}

/** Direct browser-to-Backblaze B2 multipart upload. Render never receives video bytes. */
export async function uploadVideoChunks(file, { onProgress = () => {}, onMessage = () => {}, onUploaded = () => {} } = {}) {
  if (!file || !file.size) throw new Error('Please select a valid video file');

  const storageKey = SESSION_PREFIX + fingerprint(file);
  let sessionId = localStorage.getItem(storageKey);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(storageKey, sessionId);
  }

  onMessage('Creating secure Backblaze B2 multipart session…');
  let initResponse;
  try {
    initResponse = await api.post('/upload/b2/init', {
      sessionId,
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type || 'application/octet-stream',
    }, { timeout: 60000 });
  } catch (error) {
    // Do not retain a broken local token if the server reports a conflicting file/session.
    if ([400, 403, 404, 409, 415].includes(error.response?.status)) localStorage.removeItem(storageKey);
    throw error;
  }

  if (initResponse.data?.completed && initResponse.data?.videoUrl) {
    localStorage.removeItem(storageKey);
    onProgress(100);
    onUploaded(initResponse.data);
    return initResponse.data;
  }

  const { partSize = DEFAULT_PART_SIZE, totalParts, receivedParts = [] } = initResponse.data || {};
  if (!totalParts || !partSize) throw new Error('Backend returned invalid multipart upload details');
  const received = new Set(receivedParts.map((part) => Number(part.partNumber)));
  const alreadyUploadedBytes = receivedParts.reduce((sum, part) => sum + Number(part.size || 0), 0);
  onProgress(Math.min(99, Math.floor((alreadyUploadedBytes / file.size) * 100)));

  let missingParts = Array.from({ length: totalParts }, (_, index) => index + 1).filter((part) => !received.has(part));
  await uploadParts(file, sessionId, missingParts, partSize, alreadyUploadedBytes, onProgress, onMessage);

  onMessage('Verifying all parts and completing the video in Backblaze B2…');
  let complete;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await api.post('/upload/b2/complete', { sessionId }, { timeout: 120000 });
      complete = response.data;
      break;
    } catch (error) {
      const missing = error.response?.data?.missingParts;
      if (error.response?.status === 409 && Array.isArray(missing) && missing.length && attempt === 0) {
        onMessage('A few parts need retrying. Repairing missing parts…');
        await uploadParts(file, sessionId, missing, partSize, 0, onProgress, onMessage);
        continue;
      }
      throw error;
    }
  }

  if (!complete?.success || !complete?.videoUrl) throw new Error(complete?.message || 'B2 upload finished without returning a video key');
  localStorage.removeItem(storageKey);
  onProgress(100);
  onUploaded(complete);
  return complete;
}
