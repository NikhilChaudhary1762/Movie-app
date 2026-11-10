import api from "../services/api";

export const VIDEO_CHUNK_SIZE = 8 * 1024 * 1024;

function uploadKey(file) {
  return `movieflex-upload:${file.name}:${file.size}:${file.lastModified}`;
}

// Compatibility fallback. The Admin UI uses direct-to-B2 multipart uploads.
export async function uploadVideoInChunks(file, onProgress = () => {}) {
  if (!file) throw new Error("Video file is required");
  if (file.size <= 0) throw new Error("Video file is empty");

  const key = uploadKey(file);
  let uploadId = localStorage.getItem(key) || crypto.randomUUID();
  localStorage.setItem(key, uploadId);

  const init = await api.post("/upload/chunk/init", {
    uploadId, name: file.name, size: file.size, type: file.type || "application/octet-stream",
  }, { timeout: 30000 });
  uploadId = init.data.uploadId;
  const totalChunks = init.data.totalChunks;
  const received = new Set(init.data.receivedChunks || []);

  for (let index = 0; index < totalChunks; index++) {
    if (received.has(index)) {
      onProgress(Math.round(((index + 1) / totalChunks) * 100));
      continue;
    }
    const chunk = file.slice(index * init.data.chunkSize, Math.min((index + 1) * init.data.chunkSize, file.size));
    const form = new FormData();
    form.append("chunk", chunk, `${file.name}.part`);

    await api.post(`/upload/chunk/${encodeURIComponent(uploadId)}/${index}`, form, {
      timeout: 0,
      onUploadProgress: (event) => {
        const part = event.total ? event.loaded / event.total : 0;
        onProgress(Math.min(99, Math.round(((index + part) / totalChunks) * 100)));
      },
    });
    onProgress(Math.min(99, Math.round(((index + 1) / totalChunks) * 100)));
  }

  const result = await api.post(`/upload/chunk/${encodeURIComponent(uploadId)}/complete`, {}, { timeout: 0 });
  localStorage.removeItem(key);
  onProgress(100);
  return result.data;
}
