import api from "./api";

const SESSION_PREFIX = "movieflex-upload:";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function fingerprint(file) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

// 8 MB parts; server reports actual chunk size. Retries transient network/server errors.
export async function uploadVideoChunks(file, { onProgress = () => {}, onMessage = () => {}, onUploaded = () => {} } = {}) {
  const key = SESSION_PREFIX + fingerprint(file);
  let uploadId = localStorage.getItem(key);
  const init = await api.post("/upload/chunk/init", {
    uploadId, name: file.name, size: file.size, type: file.type || "video/*",
  });
  uploadId = init.data.uploadId;
  localStorage.setItem(key, uploadId);

  const chunkSize = init.data.chunkSize || 8 * 1024 * 1024;
  const total = init.data.totalChunks;
  const received = new Set(init.data.receivedChunks || []);
  let uploadedBytes = [...received].reduce((sum, index) => sum + Math.min(chunkSize, file.size - index * chunkSize), 0);
  onProgress(Math.min(99, Math.round(uploadedBytes * 100 / file.size)));

  for (let index = 0; index < total; index++) {
    if (received.has(index)) continue;
    const start = index * chunkSize;
    const chunk = file.slice(start, Math.min(file.size, start + chunkSize));
    let success = false, lastError;
    for (let attempt = 1; attempt <= 4 && !success; attempt++) {
      try {
        const data = new FormData();
        data.append("chunk", chunk, `${index}.part`);
        await api.post(`/upload/chunk/${uploadId}/${index}`, data, {
          // Let the browser/Axios set the multipart boundary automatically.
          timeout: 0,
        });
        success = true;
      } catch (error) {
        lastError = error;
        if (attempt < 4) {
          onMessage(`Chunk ${index + 1}/${total}: retry ${attempt}/3`);
          await sleep(1000 * attempt);
        }
      }
    }
    if (!success) throw lastError;
    uploadedBytes += chunk.size;
    onProgress(Math.min(99, Math.round(uploadedBytes * 100 / file.size)));
    onMessage(`Uploading chunk ${index + 1}/${total}`);
  }

  onMessage("Combining chunks and saving to Backblaze B2…");
  const complete = await api.post(`/upload/chunk/${uploadId}/complete`, {}, { timeout: 0 });
  localStorage.removeItem(key);
  onProgress(100);
  onUploaded(complete.data);
  return complete.data;
}
