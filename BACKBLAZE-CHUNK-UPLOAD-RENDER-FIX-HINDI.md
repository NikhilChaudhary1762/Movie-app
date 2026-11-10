# MovieFlex: Render + Backblaze B2 chunk upload fix

## Code changes in this package
- Chunk requests now verify that the upload session exists before Multer writes a chunk.
- Chunk merging now appends each part sequentially and waits for disk writes to finish.
- Browser upload no longer forces a multipart Content-Type header (the browser must add its boundary).
- If the server reports a lost session (404) or missing chunk (409), the browser clears the stale session and retries once from chunk 0.

## IMPORTANT: Render storage configuration
The chunk API temporarily stores parts on the backend filesystem. Render's normal filesystem is ephemeral and is not shared between multiple instances. This can cause exactly the reported error: a chunk request or `/complete` reaches an instance that cannot see the metadata/previous chunks.

For reliable large uploads:
1. In the Render dashboard, open the MovieFlex BACKEND web service.
2. Attach a persistent disk and set its mount path to `/var/data`.
3. In Environment, set `UPLOAD_TEMP_DIR=/var/data/movieflex-uploads`.
4. Run exactly ONE backend instance for this implementation. Do not use multiple instances/autoscaling until chunk storage is moved to shared storage or B2 multipart upload.
5. Confirm `B2_ENDPOINT` and `B2_REGION` match the real bucket region (for example, us-east-005 endpoint with us-east-005 region).
6. Redeploy the backend after saving settings.

A Render persistent disk may require a paid service plan. Without persistent storage, an app restart/deploy can erase chunks. Do not keep retrying the same old upload session after deploying; choose the file again so a fresh session starts.

## Deploy
From the project root:
```bash
git add .
git commit -m "Fix B2 chunk upload session and merge"
git push origin main
```
Wait for the Render deployment to finish, then hard-refresh the frontend and try a small MP4 first.

## Test
Open:
`https://YOUR-BACKEND.onrender.com/api/upload/status`

It should return `b2Configured: true`, `bucketConfigured: true`, and the expected region/endpoint. This endpoint only checks configuration; a successful response does not itself prove a video can upload.

If upload still fails, copy the JSON response body for the failed request and the Render log lines beginning with `Chunk upload error` or `Chunk completion error`. Never share B2 application keys or secrets.
