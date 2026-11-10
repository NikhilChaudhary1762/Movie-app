# MovieFlex — Render Free + Backblaze B2 Direct Multipart Upload

## Is update mein kya badla
- Browser video ke 8 MiB parts seedhe Backblaze B2 ko PUT karta hai. Render Free server video file receive/merge nahi karta.
- Backend sirf multipart session banata hai, har part ka short-lived signed URL deta hai aur completion verify karta hai.
- Retry/resume ke liye browser `localStorage` mein B2 upload key aur upload ID rakhta hai; status B2 se read hota hai.
- Episode aur movie ke existing upload UI ko wahi `uploadVideoChunks()` function use karna hai.

## Existing deployment update
1. ZIP extract karke iske `Movie-app-main` folder ke contents ko apne existing GitHub repository mein replace/merge karein. Naya Render Web Service banane ki zarurat nahi.
2. Existing Render service ka Root Directory/Build/Start command pehle jaisa rakhein; backend start command `npm start` hai (backend folder ke andar).
3. Existing Render Environment Variables mein ye values verify karein:
   - `B2_KEY_ID` = Backblaze key ID
   - `B2_APPLICATION_KEY` = application key (secret)
   - `B2_BUCKET` = bucket ka exact naam
   - `B2_ENDPOINT` = `https://s3.<bucket-region>.backblazeb2.com`
   - `B2_REGION` = endpoint mein diya wahi region, jaise `us-east-005`
   - `MAX_VIDEO_SIZE` = `53687091200` (50 GiB app limit; B2/account limits still apply)
   - `UPLOAD_CHUNK_SIZE` = `8388608` (8 MiB)
   - `FRONTEND_URL` = frontend ka exact origin, e.g. `https://your-frontend.onrender.com` (scheme ke saath, trailing slash ke bina)
4. Same existing Render service ko deploy/redeploy karna zaroori hai taaki naye backend routes live hon. Ye naya service/deployment target banana nahi hai.

## Backblaze B2 CORS (required for browser direct upload)
B2 Console → Buckets → apna bucket → CORS Rules mein browser frontend origin allow karein. Rule mein:
- Allowed Origins: frontend ka exact HTTPS origin (e.g. `https://your-frontend.onrender.com`)
- Allowed Operations: `b2_upload_file`, `b2_upload_part` (agar UI S3 CORS operation labels dikhata hai to PUT/OPTIONS allow karein)
- Allowed Headers: `*`
- Expose Headers: `ETag`
- Max Age: `3600`

B2 S3 CORS editor ke JSON mode ke liye example (apna frontend origin replace karein):
```json
[{
  "corsRuleName": "movieflex-browser-multipart",
  "allowedOrigins": ["https://your-frontend.onrender.com"],
  "allowedOperations": ["s3_put", "s3_post", "s3_head"],
  "allowedHeaders": ["*"],
  "exposeHeaders": ["ETag"],
  "maxAgeSeconds": 3600
}]
```
B2 console ke current accepted operation names ke mutabik UI mein rule save karein; browser response mein `ETag` visible hona mandatory hai.

## Test
1. Existing backend `/api/upload/status` kholein; `b2Configured: true` aur `directMultipartUpload: true` hona chahiye.
2. Chhoti test video upload karein. Browser Network tab mein `/api/upload/multipart/init`, `part-url`, phir `https://s3...backblazeb2.com` par direct PUT requests dikhni chahiye.
3. Movie/Episode save karein; database mein `b2://videos/...` object key save hoti hai. Playback API signed URL banati hai.

## Important limits
- Render Free ke local disk par video/chunks store nahi hote; isliye `/var/data` persistent disk ki zarurat nahi.
- Browser tab band hone par bhi session details localStorage mein rehti hain; same browser/device aur same selected file se retry/resume ho sakta hai. Browser data clear ya device change hone par resume key lost ho sakti hai.
- Direct upload ke liye B2 bucket CORS rule mandatory hai. B2 credentials kabhi frontend code mein na daalein.
- App ke 50 GiB limit ka matlab ye nahi ki Backblaze account/plan par unlimited upload available hai.


## सुरक्षा सुधार और B2 CORS (नया)

- सभी `/api/upload/*` endpoints अब `protect + admin` से सुरक्षित हैं।
- Multipart upload session token 7 दिन के लिए signed है और उसी admin account से bound है।
- Part URL, status, complete और abort पर उसी signed session की जाँच होती है।
- Series और Episode create/update/delete केवल admin कर सकता है। Episode media URL लेने के लिए login आवश्यक है।
- Admin Series poster/thumbnail upload के लिए `/api/upload` Cloudinary endpoint जोड़ा गया है; इसके लिए `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` आवश्यक हैं।

### Backblaze B2 Bucket CORS

B2 Console → Bucket → CORS Rules में अपने वास्तविक frontend origin को allow करें। Rule में:
- Allowed origins: `https://movieflex98.onrender.com`
- Allowed methods: `PUT`, `GET`, `HEAD`
- Allowed headers: `*`
- Expose headers: `ETag`
- Max age: `3600`

CORS में `ETag` expose नहीं होगा तो browser multipart upload पूरा नहीं कर पाएगा।
