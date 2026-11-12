const Episode = require("../models/Episode");
const Movie = require("../models/Movie");
const { getVideoObject } = require("../config/b2Storage");

function pipeObject(req, res, value) {
  if (!value) return res.status(404).json({ success: false, message: "Video is not attached" });
  if (!value.startsWith("b2://")) return res.status(400).json({ success: false, message: "This media is not stored in private B2" });
  getVideoObject(value, req.headers.range).then((obj) => {
    const status = obj.ContentRange ? 206 : 200;
    res.status(status);
    res.set({
      "Content-Type": obj.ContentType || "application/octet-stream",
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      ...(obj.ContentLength != null ? { "Content-Length": String(obj.ContentLength) } : {}),
      ...(obj.ContentRange ? { "Content-Range": obj.ContentRange } : {})
    });
    if (req.method === "HEAD") { obj.Body?.destroy?.(); return res.end(); }
    obj.Body.on("error", (err) => {
      console.error("B2 stream body error:", err.message);
      if (!res.headersSent) res.status(502).end("Video storage stream failed"); else res.destroy(err);
    });
    obj.Body.pipe(res);
  }).catch((err) => {
    console.error("B2 stream request failed:", { name: err.name, message: err.message, status: err.$metadata?.httpStatusCode });
    if (!res.headersSent) res.status(err.$metadata?.httpStatusCode === 404 ? 404 : 502).json({ success: false, message: "Unable to read video from private storage", storageStatus: err.$metadata?.httpStatusCode || null });
    else res.destroy(err);
  });
}

exports.streamEpisode = async (req, res) => {
  try { const item = await Episode.findById(req.params.id).select("videoUrl").lean();
    if (!item) return res.status(404).json({ success: false, message: "Episode not found" });
    return pipeObject(req, res, item.videoUrl);
  } catch (e) { return res.status(400).json({ success: false, message: "Invalid episode ID" }); }
};
exports.streamMovie = async (req, res) => {
  try { const item = await Movie.findById(req.params.id).select("watchUrl").lean();
    if (!item) return res.status(404).json({ success: false, message: "Movie not found" });
    return pipeObject(req, res, item.watchUrl);
  } catch (e) { return res.status(400).json({ success: false, message: "Invalid movie ID" }); }
};
