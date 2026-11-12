# MovieFlex CORS and private B2 streaming update

## Changes included

1. `backend/server.js`
   - Allows the stable Render frontend origins already used by this project.
   - Reads comma-separated `FRONTEND_URL` and `ALLOWED_ORIGINS` values.
   - Allows Vercel preview hosts matching `movie-app99-...-nikhilchaudhary1762.vercel.app` or `movie-...-nikhilchaudhary1762.vercel.app`.
   - Allows the `Range` request header and exposes `Content-Range`, `Accept-Ranges`, `Content-Length`, and `Content-Type` for browser video playback.
   - Applies CORS before parsers and API routes, including OPTIONS preflight.

2. `backend/controllers/episodeController.js`
   - Keeps private `b2://` episode video keys in API responses instead of replacing them with temporary signed B2 URLs.
   - This allows `frontend/src/pages/EpisodePlayer.jsx` to use `/api/episodes/:id/stream?token=...` and the private B2 streaming proxy.
   - Download URLs remain signed separately.

3. Existing movie and episode streaming proxy routes are retained. They forward the browser's `Range` header to B2 and return `206 Partial Content` when B2 returns a partial object.

## Render environment

Set `FRONTEND_URL` to the permanent frontend origin, without a trailing slash, for example:

`https://your-production-frontend.vercel.app`

Multiple origins may be comma-separated. Keep the existing B2 variables and `JWT_SECRET` configured. Do not put B2 credentials in the frontend.

## Deployment and verification

1. Deploy the updated backend folder to Render.
2. Redeploy the frontend from this same project ZIP so its player changes stay aligned with the backend routes.
3. Sign in and open a movie and an episode.
4. In browser DevTools > Network, check that the video request targets the Render API `/api/movies/:id/stream` or `/api/episodes/:id/stream` endpoint, not the B2 hostname.
5. A seek/range request should return `206 Partial Content` with `Content-Range` and `Accept-Ranges: bytes`.

## Checks performed in this environment

- `node --check` passed for the changed backend server, episode controller, streaming controller, auth middleware, and movie/episode routes.
- The CORS origin matcher was checked against stable Render origins, representative Vercel preview origins, and an unrelated origin (which was rejected).
- A live Render deployment, real B2 credential/object read, browser playback, and live HTTP 206 request were not run here. Therefore this package does not claim that the B2 403 has been resolved; check Render logs and the B2 bucket/key/application-key permissions if it persists.
- Frontend production build was not run because dependencies are not installed in this environment.
