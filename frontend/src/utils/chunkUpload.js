// Backwards-compatible wrapper: all video uploads use direct B2 multipart now.
import { uploadVideoChunks } from '../services/chunkUpload';

export const VIDEO_CHUNK_SIZE = 8 * 1024 * 1024;

export async function uploadVideoInChunks(file, onProgress = () => {}) {
  return uploadVideoChunks(file, { onProgress });
}
