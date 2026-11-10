import api from "./api";

const SESSION_PREFIX = "movieflex-b2-multipart:";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const fingerprint = (file) => `${file.name}:${file.size}:${file.lastModified}`;

async function putPart(url, blob) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const response = await fetch(url, { method: "PUT", body: blob });
      if (!response.ok) throw new Error(`Backblaze part upload failed (${response.status})`);
      const etag = response.headers.get("ETag") || response.headers.get("etag");
      if (!etag) throw new Error("Backblaze CORS must expose the ETag response header");
      return etag;
    } catch (error) {
      lastError = error;
      if (attempt < 4) await sleep(attempt * 1200);
    }
  }
  throw lastError;
}

/** Direct browser-to-Backblaze multipart upload. Video data never passes through Render. */
export async function uploadVideoChunks(file, { onProgress = () => {}, onMessage = () => {}, onUploaded = () => {} } = {}) {
  const storageKey = SESSION_PREFIX + fingerprint(file);
  let session;
  try { session = JSON.parse(localStorage.getItem(storageKey) || "null"); } catch { session = null; }

  if (!session?.key || !session?.uploadId || !session?.partSize || !session?.sessionToken) {
    const init = await api.post("/upload/multipart/init", { name:file.name, size:file.size, type:file.type || "application/octet-stream" }, { timeout:30000 });
    session = { key:init.data.key, uploadId:init.data.uploadId, partSize:init.data.partSize, totalParts:init.data.totalParts, sessionToken:init.data.sessionToken };
    localStorage.setItem(storageKey, JSON.stringify(session));
  }

  try {
    const status = await api.get(`/upload/multipart/${encodeURIComponent(session.uploadId)}/status`, { params:{ key:session.key }, headers:{ "X-Multipart-Session":session.sessionToken }, timeout:30000 });
    const done = new Map((status.data.parts || []).map(part => [Number(part.PartNumber), part]));
    const parts = [];
    let uploadedBytes = 0;
    for (const part of done.values()) uploadedBytes += Number(part.Size || 0);
    onProgress(Math.min(99, Math.round(uploadedBytes * 100 / file.size)));

    for (let partNumber = 1; partNumber <= session.totalParts; partNumber++) {
      const existing = done.get(partNumber);
      if (existing) { parts.push({ PartNumber:partNumber, ETag:existing.ETag }); continue; }
      const start = (partNumber - 1) * session.partSize;
      const blob = file.slice(start, Math.min(file.size, start + session.partSize));
      onMessage(`Direct upload to Backblaze: part ${partNumber}/${session.totalParts}`);
      const signed = await api.post("/upload/multipart/part-url", { key:session.key, uploadId:session.uploadId, partNumber, sessionToken:session.sessionToken }, { timeout:30000 });
      const etag = await putPart(signed.data.url, blob);
      parts.push({ PartNumber:partNumber, ETag:etag });
      uploadedBytes += blob.size;
      onProgress(Math.min(99, Math.round(uploadedBytes * 100 / file.size)));
    }

    onMessage("Finalizing video in Backblaze B2…");
    const complete = await api.post("/upload/multipart/complete", { key:session.key, uploadId:session.uploadId, parts, name:file.name, size:file.size, sessionToken:session.sessionToken }, { timeout:120000 });
    if (!complete.data?.success || !complete.data?.videoUrl) throw new Error(complete.data?.message || "B2 did not return the completed video key");
    localStorage.removeItem(storageKey);
    onProgress(100); onUploaded(complete.data);
    return complete.data;
  } catch (error) {
    // Keep the multipart session in localStorage so the user can retry and
    // continue from parts already stored in B2. Do not silently discard it.
    throw error;
  }
}
