# MovieFlex – Render Free + Backblaze B2 Direct Multipart Upload

## Render Environment Variables
Keep the real existing values; do not copy placeholder credentials.

```env
B2_KEY_ID=YOUR_REAL_KEY_ID
B2_APPLICATION_KEY=YOUR_REAL_APPLICATION_KEY
B2_BUCKET=YOUR_REAL_BUCKET_NAME
B2_REGION=YOUR_BUCKET_REGION
B2_ENDPOINT=https://s3.YOUR_BUCKET_REGION.backblazeb2.com
FRONTEND_URLS=https://YOUR-FRONTEND-DOMAIN
UPLOAD_CHUNK_SIZE=8388608
MAX_VIDEO_SIZE=53687091200
B2_PART_URL_EXPIRY=900
```

`B2_REGION` and `B2_ENDPOINT` must match the bucket details exactly. Never expose B2 keys in Vercel/frontend variables. The B2 application key needs permission to create, list, complete and abort multipart uploads and read objects.

## Vercel Environment Variable
Optional but recommended:

```env
VITE_API_URL=https://movieflex99.onrender.com
```

Use the actual Render backend origin without `/api`. Redeploy Vercel after changing it.

## Backblaze bucket CORS
Set a CORS rule on the bucket. Use the exact frontend origin, not the Render backend URL:

```json
{
  "corsRuleName": "movieflex-browser-multipart",
  "allowedOrigins": ["https://YOUR-FRONTEND-DOMAIN"],
  "allowedOperations": ["s3_put", "s3_get", "s3_head"],
  "allowedHeaders": ["*"],
  "exposeHeaders": ["ETag"],
  "maxAgeSeconds": 3600
}
```

If you use a second frontend domain, add it as another allowed origin. Keep the bucket private.

## Upload architecture
1. Browser asks Render for an authenticated upload session.
2. Render creates B2 multipart metadata and saves only session metadata in MongoDB.
3. Browser requests one signed URL per part and uploads the bytes directly to B2.
4. Render lists B2 parts, validates all part numbers and sizes, and completes the multipart object.
5. MongoDB receives a stable `b2://videos/...` object key.
6. Movie and Episode playback endpoints create short-lived signed GET URLs.

The `b2://` value is a private object key, not a public HTTP URL. It must be saved in Movie/Episode documents. The player receives an HTTPS signed URL from the backend when it loads the media.

## Deploy
1. Replace the repository files with this ZIP's files.
2. Commit and push to the branch connected to Render and Vercel.
3. Wait for Render deploy to finish.
4. Wait for Vercel deploy to finish.
5. Open `https://YOUR-RENDER-SERVICE.onrender.com/api/upload/status`.
6. Log in as an admin and upload a small MP4 first.

## If upload fails
- `401`: login token missing/expired. Login again.
- `403`: logged-in account is not admin, or B2 key lacks permissions.
- `503`: B2 environment variables missing or region/endpoint mismatch.
- Browser `Failed to fetch`: configure B2 bucket CORS for the exact frontend origin and allow `s3_put`.
- `SignatureDoesNotMatch`: verify key ID, application key, bucket region, endpoint, and server clock.
- `NoSuchUpload` / `410`: old multipart session no longer exists; select the file again to create a new session.
- `409` with `missingParts`: browser retries the missing part numbers; if it repeats, inspect B2 CORS/network errors and Render logs.
- `500`: read the `B2 multipart ... error` log line in Render; response now includes the AWS/B2 error code/message.

## Limits
This avoids Render's ephemeral filesystem: Render never receives video bytes. The browser sends 8 MiB parts directly to B2, with up to three concurrent requests. Render Free sleep/cold-start and bandwidth limits still apply to API calls and playback, and Backblaze storage/transaction/egress charges or free allowances still apply.
