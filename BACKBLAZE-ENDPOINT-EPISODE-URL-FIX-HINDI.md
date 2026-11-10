# MovieFlex ChunkUpload project: B2 URL error fix

## 1) Render Environment values

Render Dashboard > your `movieflex99` backend > Environment:

```env
B2_KEY_ID=your_real_key_id
B2_APPLICATION_KEY=your_real_application_key
B2_BUCKET=your_real_bucket_name
B2_REGION=us-east-005
B2_ENDPOINT=https://s3.us-east-005.backblazeb2.com
```

Use the exact region displayed for your bucket. This code now also normalizes a bare host such as `s3.us-east-005.backblazeb2.com`, but the full `https://` URL is recommended. Never put B2 credentials in Vercel.

## 2) Deploy

1. Replace the old repository files with this ZIP's project files.
2. Push the connected branch to GitHub.
3. Save the Render Environment values and trigger a fresh deploy.
4. Open `https://movieflex99.onrender.com/api/upload/status`.
5. Confirm `b2Configured: true`, `configurationError: null`, and `endpoint` begins with `https://`.

## 3) Episode upload

1. Sign in as an admin.
2. Open Admin > Series > select a series > Add Episode.
3. Select a small MP4 and wait for `Upload completed successfully!`.
4. Confirm the Video URL field is filled with `b2://videos/...`.
5. Click Save Episode.
6. Open the episode player. The API signs the stored private B2 key when the player requests the episode.

The admin episode-list API now returns the stable `b2://` key to authenticated admins, so editing an episode does not accidentally clear its video URL.

## Important Render Free limitation

This specific older chunk implementation stores temporary chunks on the Render filesystem (`UPLOAD_TEMP_DIR`). Render Free does not provide persistent disks. It may work while the same service instance stays alive, but an instance restart/redeploy can remove in-progress chunks and prevent resume. Permanent finished videos are stored in B2. For reliable upload resume across restarts, use the newer direct-to-B2 multipart architecture rather than this local-temp-chunk implementation.
