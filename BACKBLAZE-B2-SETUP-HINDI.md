# MovieFlex + Backblaze B2 Setup (Hindi)

## 1) B2 bucket
- Backblaze Console > B2 Cloud Storage > Buckets > Create a Bucket.
- Name: `movieflex-videos` (ya apna bucket name).
- MovieFlex video streaming ke liye bucket ko **Public** karna hoga, ya custom domain/public URL configure karna hoga. Private bucket ki direct URL browser mein play nahi hogi.

## 2) Application Key
- App Keys > Add a New Application Key.
- Bucket access ko apne bucket tak limit karein.
- Read and Write permission choose karein.
- `keyID` aur `applicationKey` ko secure rakhein. Secret ko frontend/GitHub par kabhi na daalein.

## 3) Backend environment
- `backend/.env.example` ko copy karke `backend/.env` banayein.
- B2 Key ID, Application Key, bucket, endpoint, region fill karein.
- Endpoint/region exact bucket details se lein (example values ko blindly copy na karein).
- `B2_PUBLIC_BASE_URL` bucket ka public download URL/custom domain ho. Example format: `https://f004.backblazeb2.com/file/BUCKET_NAME` (apna correct file host/region use karein).
- MongoDB URI aur JWT_SECRET bhi apne values se set karein.

## 4) Install & run
```bash
cd backend
npm install
npm run dev
```
Frontend:
```bash
cd frontend
npm install
npm run dev
```

## 5) Upload
- Admin > Movie Upload: `/api/upload/movie` B2 mein movie upload karta hai aur watch/download URL return karta hai.
- Admin > Series & Episodes: Episode video file select karein. Upload complete hone par Video URL auto-fill hota hai. `Add Episode`/`Save Episode` button se episode database mein save karein.
- Poster/thumbnail upload current image upload flow (Cloudinary) par hi hai; B2 is ZIP mein video files ke liye configured hai.

## Notes
- B2 public bucket means uploaded video links can be accessed by anyone who has the URL. Do not upload copyrighted/private content without rights.
- Backend temporarily video disk par stream karta hai and upload complete hone par temp file delete karta hai. VPS/host par free disk space required hai.
- MAX_VIDEO_SIZE default 50 GiB; hosting provider, proxy, and timeout limits can still be lower.
- `Content-Type` is currently `video/*`; browser playback may work better if a specific MIME type is needed. Configure custom domain/HTTPS for production.
