
const User = require("../models/User");
const cloudinary = require("../config/cloudinary");

exports.uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select an image",
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Upload image to Cloudinary
    const result = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
      {
        folder: "movieflex/profile",
        resource_type: "image",
        transformation: [
          { width: 500, height: 500, crop: "fill", gravity: "face" },
        ],
      }
    );

    // Delete old photo if present
    if (user.profileImagePublicId) {
      await cloudinary.uploader.destroy(user.profileImagePublicId);
    }

    user.profileImage = result.secure_url;
    user.profileImagePublicId = result.public_id;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile photo updated successfully",
      user,
    });
  } catch (error) {
    console.error("Profile photo upload error:", error);

    return res.status(500).json({
      success: false,
      message: "Profile photo upload failed",
    });
  }
};

exports.removeProfilePhoto = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.profileImagePublicId) {
      await cloudinary.uploader.destroy(user.profileImagePublicId);
    }

    user.profileImage = "";
    user.profileImagePublicId = "";

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile photo removed successfully",
      user,
    });
  } catch (error) {
    console.error("Remove profile photo error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not remove profile photo",
    });
  }
};
