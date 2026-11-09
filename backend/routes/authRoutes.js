
const express = require('express')
const router = express.Router()

const multer = require("multer");
const {
  forgotPassword,
  resetPassword,
} = require('../controllers/authController')

// Forgot Password
router.post('/forgot-password', forgotPassword)

// Reset Password
router.post('/reset-password/:token', resetPassword)

const {
  uploadProfilePhoto,
  removeProfilePhoto,
} = require("../controllers/profileController");



const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});


const {
  signup,
  login,
  updateProfile,
  changePassword,
} = require('../controllers/authController')

const protect = require('../middleware/authMiddleware')

// Signup
router.post('/signup', signup)

// Login
router.post('/login', login)

// Update Profile
router.put('/profile', protect, updateProfile)

// Change Password
router.put('/change-password', protect, changePassword)

// Protected Profile Route
router.get('/me', protect, (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  })
})

router.put(
  "/profile/photo",
  protect,
  upload.single("profileImage"),
  uploadProfilePhoto
);

router.delete(
  "/profile/photo",
  protect,
  removeProfilePhoto
);


module.exports = router
