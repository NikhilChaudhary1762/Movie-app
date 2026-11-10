# MovieFlex Private Backblaze B2 Fix

## Render Environment Variables
Set these on the backend service:
- B2_KEY_ID = Backblaze keyID
- B2_APPLICATION_KEY = Backblaze applicationKey (secret)
- B2_BUCKET = exact bucket name
- B2_ENDPOINT = https://s3.us-west-005.backblazeb2.com
- B2_REGION = us-west-005

Do not set B2_PUBLIC_BASE_URL. The bucket stays Private.

## Important deployment steps
1. Replace the project with this complete source tree.
2. In `backend`, run `npm install` (the AWS presigner dependency was added to package.json).
3. Commit and push all files, including `backend/package-lock.json` if npm updates it.
4. Render backend build command should run `cd backend && npm install`; start command `cd backend && npm start` (or configure Root Directory as `backend` and use `npm install` / `npm start`).
5. Redeploy frontend.
6. Test `GET https://YOUR-BACKEND/api/upload/status`; it should report `b2Configured: true`, `region: us-west-005`, and `storage: Backblaze B2 Private`.
7. Upload a fresh MP4. The completed upload response must contain `videoUrl: "b2://videos/...mp4"`.
8. Click Add Episode / Save Episode. Opening `/api/episodes/:id` while logged in generates a fresh temporary signed URL.

## Fixed bugs
- The generic `/chunk/:uploadId/:index` route now passes the reserved `complete` segment to the actual completion route. Previously it intercepted `/complete` and rejected it as a non-numeric chunk index.
- Upload no longer requires `B2_PUBLIC_BASE_URL`; it returns a stable private B2 object key.
- Episode GET converts `b2://` object keys to temporary signed S3 URLs.
- Upload status reports missing environment variable names without exposing secrets.
- Player displays the actual API/playback error instead of always saying Episode Not Found.

Never expose B2_APPLICATION_KEY in frontend code, GitHub, screenshots, or chat.
