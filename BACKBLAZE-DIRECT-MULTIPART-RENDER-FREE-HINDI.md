# MovieFlex: Backblaze B2 Direct Multipart Upload (Render Free)

This version uploads each video part directly from the browser to Backblaze B2. Render only creates signed part URLs and completes the multipart upload. Video bytes and temporary chunks are not written to Render's filesystem.

## 1. Render environment variables

In Render Dashboard → your `movieflex99` backend service → Environment, keep your existing secret values and confirm these settings:

```env
B2_KEY_ID=YOUR_EXISTING_KEY_ID
B2_APPLICATION_KEY=YOUR_EXISTING_APPLICATION_KEY
B2_BUCKET=YOUR_EXISTING_BUCKET_NAME
B2_REGION=us-east-005
B2_ENDPOINT=https://s3.us-east-005.backblazeb2.com
FRONTEND_URLS=https://movieflex98.onrender.com,http://localhost:5173
UPLOAD_CHUNK_SIZE=8388608
MAX_VIDEO_SIZE=53687091200
B2_PART_URL_EXPIRY=900
```

Important:
- Do not replace your real bucket name or keys with the example text.
- If Backblaze bucket details show a different region, set both `B2_REGION` and `B2_ENDPOINT` to that bucket's real region.
- `FRONTEND_URLS` must contain the exact browser origin(s), comma-separated, with no trailing slash. Add your actual Vercel domain if it differs from `movieflex98.onrender.com`.
- Never put B2 application keys in Vercel or frontend `.env` files.
- The B2 application key must be restricted to the target bucket and have the permissions needed to read objects, create/list/complete multipart uploads, and abort failed uploads (read/write/list/delete file capabilities).

## 2. Configure B2 bucket CORS

The browser must be allowed to send cross-origin `PUT` requests to the bucket. In the Backblaze B2 bucket CORS settings, add a rule with:

```json
{
  "corsRuleName": "movieflex-browser-multipart",
  "allowedOrigins": [
    "https://movieflex98.onrender.com"
  ],
  "allowedOperations": [
    "s3_put",
    "s3_get",
    "s3_head"
  ],
  "allowedHeaders": ["*"],
  "exposeHeaders": ["ETag"],
  "maxAgeSeconds": 3600
}
```

Replace the origin with the exact deployed frontend origin. If there are two frontend origins, add both to `allowedOrigins`. Add `http://localhost:5173` only if you need local development uploads. Do not use the backend Render URL as the browser origin.

## 3. Deploy backend and frontend

1. Replace the repository files with this ZIP's files.
2. Commit and push the changes to the Git branch connected to Render and Vercel.
3. Wait for Render backend deployment to finish.
4. Wait for Vercel/frontend deployment to finish.
5. Open `https://movieflex99.onrender.com/api/upload/status`. It should report `b2Configured: true` and `uploadMode: browser-to-b2-multipart`.

No Persistent Disk is required for this direct-to-B2 upload flow. Render Free's filesystem is not used for video parts.

## 4. Upload flow

- Admin selects a video in Movie upload or Episode upload.
- Backend creates a multipart upload in B2 and stores only the session metadata in MongoDB.
- Browser asks Render for a short-lived signed URL for each part and sends the part directly to B2.
- Backend checks the parts in B2 and completes the multipart object.
- The API returns a stable `b2://videos/...` object key. This is a private storage key, not a public playable URL.
- Movie/Episode saves that key in MongoDB. Playback endpoints create a fresh signed GET URL when needed.

The upload session metadata is kept in MongoDB, so a same-browser retry with the same file can discover parts already received by B2. The browser must reselect the same file to continue. If an upload is abandoned permanently, the admin can start a fresh session; old incomplete multipart uploads should be aborted rather than left indefinitely.

## 5. Verify movie and episode playback

1. Log in as an admin.
2. Upload a small MP4 from the Movie upload panel.
3. Confirm the returned key starts with `b2://videos/`.
4. Save the movie.
5. Open the movie while logged in and confirm the player loads.
6. Upload an episode from Manage Series, save the episode, and open its player.

The Movie access endpoint and Episode detail endpoint sign private B2 keys at playback time. Signed URLs expire; the stable `b2://` key remains in MongoDB.

## 6. Common errors

- **Browser `Failed to fetch` / CORS:** check the bucket CORS rule and `FRONTEND_URLS` exact origin.
- **401:** log in again; upload APIs require an authenticated admin.
- **403:** the account must have admin role, and the B2 application key must have the required bucket permissions.
- **B2 `SignatureDoesNotMatch`:** ensure `B2_REGION`, endpoint, key ID, application key and bucket all belong to the same B2 account/region. Do not add a trailing slash to endpoint.
- **B2 `NoSuchUpload`:** the multipart upload was aborted/expired or the session no longer exists. Reselect the file to create a new session.
- **CORS `ETag`:** ETag is exposed for diagnostics, but the backend uses B2 `ListParts` as the authoritative source when completing.

## 7. Notes and limits

- The configured 8 MiB part size is above the S3 multipart minimum (except the final part, which may be smaller).
- The 50 GiB application limit results in fewer than 10,000 parts at 8 MiB per part.
- This implementation uses MongoDB for upload-session metadata and B2 for all video bytes. It does not require Render Persistent Disk.
- The B2 bucket must remain private. Do not make the bucket public just to enable browser uploads; use the CORS rule and presigned URLs.
