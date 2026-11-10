import api from "../services/api";

export const VIDEO_CHUNK_SIZE = 8 * 1024 * 1024;

function uploadKey(file) {
  return `movieflex-upload:${file.name}:${file.size}:${file.lastModified}`;
}

// Upload chunks sequentially. uploadId is kept in localStorage so a retry can
// query server status and skip chunks already uploaded.
export async function uploadVideoInChunks(file, onProgress = () => {}) {
  if (!file) throw new Error("Video file is required");
  if (file.size <= 0) throw new Error("Video file is empty");

  const totalChunks = Math.ceil(file.size / VIDEO_CHUNK_SIZE);
  const key = uploadKey(file);
  let uploadId = localStorage.getItem(key);
  if (!uploadId) {
    uploadId = crypto.randomUUID();
    localStorage.setItem(key, uploadId);
  }

  const status = await api.get(`/upload/status/${uploadId}`);
  const done = new Set(status.data.uploadedChunks || []);

  for (let index = 0; index < totalChunks; index++) {
    if (done.has(index)) {
      onProgress(Math.round(((index + 1) / totalChunks) * 100));
      continue;
    }
    const chunk = file.slice(index * VIDEO_CHUNK_SIZE, Math.min((index + 1) * VIDEO_CHUNK_SIZE, file.size));
    const form = new FormData();
    form.append("uploadId", uploadId);
    form.append("chunkIndex", String(index));
    form.append("totalChunks", String(totalChunks));
    form.append("chunk", chunk, `${file.name}.part`);

    await api.post("/upload/chunk", form, {
      timeout: 0,
      onUploadProgress: (event) => {
        const part = event.total ? event.loaded / event.total : 0;
        onProgress(Math.min(99, Math.round(((index + part) / totalChunks) * 100)));
      },
    });
    onProgress(Math.min(99, Math.round(((index + 1) / totalChunks) * 100)));
  }

  const result = await api.post("/upload/complete", {
    uploadId, totalChunks, originalName: file.name, fileSize: file.size,
  }, { timeout: 0 });

  localStorage.removeItem(key);
  onProgress(100);
  return result.data;
}
