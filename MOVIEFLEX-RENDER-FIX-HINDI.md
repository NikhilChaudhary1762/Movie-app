# MovieFlex — Render Free + Backblaze B2 Fix

## Is ZIP mein kya sudhara gaya

1. `B2_ENDPOINT` ko absolute HTTPS URL mein normalize kiya jata hai. Host ke beech spaces/newlines aur aakhir mein accidental `undefined` remove hote hain.
2. Endpoint aur `B2_REGION` mismatch par readable configuration error milta hai.
3. Episode APIs (`get episode`, `season episodes`, `all episodes`) stored `b2://` object key se signed playback/download URL banati hain. Database mein expiring signed URL save nahi hota.
4. Render Free ke liye temporary upload directory `/tmp/movieflex-uploads` use hoti hai; `/var/data` persistent disk ki zaroorat assume nahi ki gayi.
5. Upload completion error mein B2 configuration ke liye actionable hint diya jata hai.

## Render Free ki important limitation

Render Free par Persistent Disk nahi milti. `/tmp` temporary hai: restart, redeploy ya spin-down par incomplete chunks mit sakte hain. Free instance ki temporary disk capacity bhi limited hai. Isliye is local-chunk architecture ko 167-minute / bahut badi movies ke liye guaranteed solution nahi kaha ja sakta. Reliable large uploads ke liye browser se direct Backblaze multipart upload (presigned part URLs) architecture chahiye; sirf `MAX_VIDEO_SIZE=50GB` set karne se Render Free 50GB upload support nahi karta.

## Backblaze values

Render Dashboard > existing MovieFlex backend service > Environment mein apne bucket ke exact values rakhein:

```env
B2_KEY_ID=YOUR_BACKBLAZE_KEY_ID
B2_APPLICATION_KEY=YOUR_BACKBLAZE_APPLICATION_KEY
B2_BUCKET=YOUR_BUCKET_NAME
B2_ENDPOINT=https://s3.us-east-005.backblazeb2.com
B2_REGION=us-east-005
UPLOAD_TEMP_DIR=/tmp/movieflex-uploads
UPLOAD_CHUNK_SIZE=8388608
MAX_VIDEO_SIZE=53687091200
```

`us-east-005` example hai. Backblaze B2 bucket Details mein diya exact endpoint aur region use karein. `B2_ENDPOINT` ke end mein `undefined`, spaces, bucket name, quotes ya path mat lagayein. Credentials chat mein share na karein.

## Existing Render service mein update

Naya Render service banane ki zaroorat nahi. Is ZIP ke `Movie-app-main` ke files ko usi GitHub repository mein update/commit karna hoga jise aapka existing Render service deploy karta hai. Code change live tabhi hoga jab existing service ka next deploy/redeploy complete hoga; bina redeploy running server ka code change nahi ho sakta.

Deploy ke baad `https://YOUR-BACKEND.onrender.com/api/upload/status` kholein. `b2Configured: true`, `configurationError: null`, endpoint aur region sahi hone chahiye. Pehle chhoti test video aur phir episode test karein.

## Safety

B2 Application Key ko frontend code mein kabhi mat rakhein. Sirf Render backend Environment mein rakhein. Purane incomplete uploads ko restart ke baad resume na karein; naya upload session shuru karein.
