# MovieFlex private B2 streaming proxy

This update adds authenticated API streaming routes for B2-backed movies and episodes:

- `GET /api/episodes/:id/stream?token=<JWT>`
- `GET /api/movies/:id/stream?token=<JWT>`

The API reads the private B2 object using the server-side S3 credentials and forwards the browser's `Range` header. It returns `206 Partial Content` and `Content-Range` when B2 responds with a ranged object. The browser no longer downloads the B2 presigned URL directly for these players.

## Deploy

1. Deploy the entire updated project, including the backend changes, to the same backend service currently used by the frontend API.
2. Keep the existing B2 environment variables unchanged: `B2_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET`, `B2_ENDPOINT`, `B2_REGION`, and `JWT_SECRET`.
3. Redeploy the frontend as well so the updated player source URLs are published.
4. Sign in again and test an episode/movie. Use DevTools Network: the media request should target your API `/stream` route, not `s3.us-east-005.backblazeb2.com`. A seek request should return `206`.

The media element needs a query token because native HTML video requests cannot attach the Axios Authorization header. The route validates that JWT and the user on every stream request. Query tokens can appear in browser/network and server access logs; avoid logging full request URLs and use reasonably short JWT lifetimes in production.

## Verification status

Backend JavaScript syntax was checked with `node --check`. A live B2 request, deployed HTTP Range test, and frontend production build were not run in this environment. If B2 still returns an error, check the backend logs for `B2 stream request failed` (the server logs the B2 error name/message/status, not the secret key).
