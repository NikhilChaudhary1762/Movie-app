const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async function streamAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : req.query.token;
    if (!token) return res.status(401).json({ success: false, message: "Login required for video playback" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ success: false, message: "User not found" });
    req.user = user;
    next();
  } catch (_) {
    return res.status(401).json({ success: false, message: "Video access token is invalid or expired" });
  }
};
