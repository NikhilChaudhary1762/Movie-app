MOVIEFLEX B2 FIXES
==================

Applied:
1. Movie creation now saves the uploaded B2 object key (b2://...) into Movie.watchUrl.
2. Removed the duplicate POST /api/movies route and the old local-disk multer createMovie path.
3. Movie watch/download access now converts private b2:// keys into temporary signed URLs.
4. Admin movie form treats b2:// as a text identifier, not a browser URL (type=url rejects it).
5. Episode creation now returns a clear error if the B2 upload URL is missing.

IMPORTANT:
- Deploy this project to the same Render backend and Vercel frontend.
- Keep B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET, B2_ENDPOINT and B2_REGION set in Render.
- B2_ENDPOINT must match bucket region, e.g. https://s3.us-east-005.backblazeb2.com for us-east-005.
- The upload API currently assembles chunks on the Render instance's local disk. Render ephemeral disk/restarts or multiple instances can interrupt an in-progress upload. Test with a small MP4 first.
- The app stores b2:// object keys, not permanent public URLs. The player/access endpoint generates expiring signed URLs.
- Do not expose B2 application keys in frontend variables or source code.
