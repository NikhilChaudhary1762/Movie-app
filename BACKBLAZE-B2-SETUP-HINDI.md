# MovieFlex + Private Backblaze B2 Setup (Hindi)

MovieFlex ab Private Backblaze B2 bucket ke saath kaam karta hai. Bucket ko Public karne ki zaroorat nahi hai.

## 1) Backblaze B2 bucket aur Application Key

1. Backblaze Console > B2 Cloud Storage > Buckets mein apna bucket **Private** hi rakhein.
2. App Keys > Add a New Application Key par jaayein.
3. Apne video bucket tak restricted access dein.
4. Application key ko Read and Write permissions chahiye.
5. `keyID` aur `applicationKey` ko secret rakhein. Inhe frontend ya GitHub par kabhi commit na karein.

## 2) Render Backend Environment Variables

Render > Backend Web Service > Environment mein ye variables add karein:

```env
B2_KEY_ID=your_application_key_id
B2_APPLICATION_KEY=your_application_key
B2_BUCKET=your_bucket_name
B2_ENDPOINT=https://s3.YOUR_REGION.backblazeb2.com
B2_REGION=YOUR_REGION
```

`YOUR_REGION` ko apne actual bucket region se replace karein, jaise `us-west-004`. Endpoint aur region dono ek hi region ke hone chahiye. `B2_PUBLIC_BASE_URL` ki zaroorat nahi hai.

MongoDB aur app ke existing variables bhi set hone chahiye:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
```

## 3) Install & run

Backend:

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

## 4) Episode upload aur playback

1. Admin login karein.
2. Series & Episodes page kholein.
3. Episode select karke video upload karein.
4. Upload 100% hone ke baad `b2://videos/...` object key form mein auto-fill hogi.
5. **Add Episode / Save Episode** zaroor click karein. Upload aur MongoDB episode save do alag steps hain.
6. Episode ko logged-in account se open karein. Backend B2 key se temporary signed HTTPS URL banayega aur player us URL ko stream karega.

MongoDB mein permanent `b2://...` object key save hoti hai, temporary signed URL nahi. Signed URL 6 ghante ke liye valid hoti hai aur episode dobara load karne par nayi URL generate hoti hai.

## 5) Video format

Browser playback ke liye sabse compatible format **MP4 (H.264 video + AAC audio)** hai. MKV, AVI, FLV aur kuch MOV files browser mein native play nahi hoti; upload successful hone ke baad bhi aise format ko MP4 mein convert/transcode karna padega.

## 6) Deployment

- Backend changes GitHub par push karke Render redeploy karein.
- Frontend changes push karke Vercel redeploy karein.
- Render logs mein B2 credentials/region errors check karein.
- Application Key ko kabhi chat, screenshot, GitHub ya frontend `.env` mein share na karein.

## Notes

- Render ka local disk temporary chunk merge ke liye use hota hai. Upload complete hone par temporary files delete ho jaati hain.
- Large upload ke dauran Render instance restart ya disk limit issue aane par chunk session lose ho sakta hai; same file dobara select karke retry karein.
- Bucket Private rahega. Video dekhne ke liye user ko MovieFlex mein login karna hoga.
