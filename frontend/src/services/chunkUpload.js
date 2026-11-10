import api from "./api";

const SESSION_PREFIX = "movieflex-upload:";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function fingerprint(file) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

/**
 * Upload in sequential chunks. If the backend reports a lost session or a
 * missing chunk, discard the stale local session and retry once from chunk 0.
 * Render deployments should use one backend instance and a persistent disk
 * for UPLOAD_TEMP_DIR so all chunk requests see the same files.
 */
export async function uploadVideoChunks(
  file,
  { onProgress = () => {}, onMessage = () => {}, onUploaded = () => {} } = {},
  restarted = false
) {
  const key = SESSION_PREFIX + fingerprint(file);
  let uploadId = localStorage.getItem(key);

  const init = await api.post("/upload/chunk/init", {
    uploadId,
    name: file.name,
    size: file.size,
    type: file.type || "video/*",
  }, { timeout: 30000 });

  uploadId = init.data.uploadId;
  localStorage.setItem(key, uploadId);

  const chunkSize = Number(init.data.chunkSize) || 8 * 1024 * 1024;
  const total = Number(init.data.totalChunks);
  const received = new Set(init.data.receivedChunks || []);
  let uploadedBytes = [...received].reduce(
    (sum, index) => sum + Math.min(chunkSize, file.size - index * chunkSize),
    0
  );

  onProgress(Math.min(99, Math.round((uploadedBytes * 100) / file.size)));

  try {
    for (let index = 0; index < total; index++) {
      if (received.has(index)) continue;

      const start = index * chunkSize;
      const chunk = file.slice(start, Math.min(file.size, start + chunkSize));
      let success = false;
      let lastError;

      for (let attempt = 1; attempt <= 4 && !success; attempt++) {
        try {
          const data = new FormData();
          data.append("chunk", chunk, `${index}.part`);

          // Do not manually set multipart Content-Type; the browser/Axios
          // must add the multipart boundary.
          await api.post(`/upload/chunk/${uploadId}/${index}`, data, {
            timeout: 0,
          });
          success = true;
        } catch (error) {
          lastError = error;
          if (error.response?.status === 404 || error.response?.status === 409) {
            throw error;
          }
          if (attempt < 4) {
            onMessage(`Chunk ${index + 1}/${total}: retry ${attempt}/3`);
            await sleep(1000 * attempt);
          }
        }
      }

      if (!success) throw lastError;

      uploadedBytes += chunk.size;
      onProgress(Math.min(99, Math.round((uploadedBytes * 100) / file.size)));
      onMessage(`Uploading chunk ${index + 1}/${total}`);
    }

    onMessage("Combining chunks and saving to Backblaze B2…");
    const complete = await api.post(
      `/upload/chunk/${uploadId}/complete`,
      {},
      { timeout: 0 }
    );

    if (!complete.data?.success || !complete.data?.videoUrl) {
      throw new Error(
        complete.data?.message || "Upload completed but B2 file key was not returned"
      );
    }

    localStorage.removeItem(key);
    onProgress(100);
    onUploaded(complete.data);
    return complete.data;
  } catch (error) {
    const status = error.response?.status;
    const code = error.response?.data?.code;
    const isLostSession =
      status === 404 ||
      status === 409 ||
      code === "UPLOAD_SESSION_NOT_FOUND";

    if (isLostSession && !restarted) {
      localStorage.removeItem(key);
      onProgress(0);
      onMessage("Upload session expired or a chunk is missing. Restarting upload…");
      return uploadVideoChunks(file, { onProgress, onMessage, onUploaded }, true);
    }

    throw error;
  }
}
