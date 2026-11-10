# MovieFlex – Private Backblaze B2 Fix (Hindi)

## Render Backend Environment Variables

Backblaze Dashboard → Buckets → apne bucket ke details se **S3 Endpoint** copy karein. Agar dashboard ka endpoint `https://s3.us-west-005.backblazeb2.com` hai, tab ye values set karein:

```env
B2_KEY_ID=your_application_key_id
B2_APPLICATION_KEY=your_application_key
B2_BUCKET=your_exact_bucket_name
B2_ENDPOINT=https://s3.us-west-005.backblazeb2.com
B2_REGION=us-west-005
```

**Important:** Endpoint aur region ko bucket details se exactly copy karein. Agar dashboard kisi aur endpoint ko dikhata hai, dono values usi ke hisaab se badlein. `B2_PUBLIC_BASE_URL` ki zarurat nahi hai; bucket Private hi rahega.

Application Key S3-compatible API ke liye banaya hua non-master key hona chahiye. All bucket access key acceptable hai. Key ID aur Application Key ko aapas mein swap na karein.

## Deploy

1. Backend folder mein `npm install` chalayein. `@aws-sdk/s3-request-presigner` dependency required hai.
2. Backend commit/push karein.
3. Render par Environment Variables save karke latest deploy karein.
4. Browser mein `https://YOUR-BACKEND.onrender.com/api/upload/status` kholein.
5. JSON mein `b2Configured: true`, `b2.endpointRegion: "us-west-005"`, aur `b2.configuredRegion: "us-west-005"` aana chahiye. Secrets response mein expose nahi hote.
6. Admin panel se chhota MP4 upload karein. Upload success ke baad form mein `b2://videos/...mp4` reference set hona chahiye.
7. **Add Episode / Save Episode** dabayein. Upload hona aur MongoDB mein Episode save hona do alag steps hain.
8. Saved Episode play karein. Backend private B2 key se temporary signed HTTPS URL generate karega.

## Agar URL phir bhi missing ho

Render → Logs mein `Backblaze B2 upload failed` search karein. Common causes:
- `InvalidAccessKeyId` / `SignatureDoesNotMatch`: Key ID/Application Key galat ya swapped.
- `AccessDenied`: key ke paas bucket par read/write permission nahi.
- `NoSuchBucket`: `B2_BUCKET` exact bucket name nahi.
- `PermanentRedirect` / endpoint error: `B2_ENDPOINT` bucket region se match nahi karta.
- `B2_REGION does not match B2_ENDPOINT region`: endpoint se region copy karke dono equal karein.

Secret Application Key kabhi chat, screenshot, GitHub ya frontend Vercel environment mein share/put na karein. Sirf Render backend environment mein rakhein.
