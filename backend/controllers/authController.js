
const User = require('../models/User')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const nodemailer = require('nodemailer')

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}

// Signup
const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      })
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const existingUser = await User.findOne({
      email: normalizedEmail,
    })

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered',
      })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    })

    const token = generateToken(user._id)

    res.status(201).json({
      success: true,
      message: 'Signup successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Signup Error:', error.message)

    res.status(500).json({
      success: false,
      message: 'Signup failed',
    })
  }
}

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      })
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    })

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      })
    }

    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      })
    }

    const token = generateToken(user._id)

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Login Error:', error.message)

    res.status(500).json({
      success: false,
      message: 'Login failed',
    })
  }
}

// Forgot Password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      })
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    })

    // Same response whether account exists or not
    const message =
      'If this email is registered, a password reset link has been sent.'

    if (!user) {
      return res.status(200).json({
        success: true,
        message,
      })
    }

    // Generate random token
    const resetToken = crypto.randomBytes(32).toString('hex')

    // Store only token hash in database
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex')

    // Token expires after 15 minutes
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000

    await user.save()

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })

    const resetUrl =
      `${process.env.FRONTEND_URL}/reset-password/${resetToken}`

    try {
      await transporter.sendMail({
        from: `"MovieFlex" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'MovieFlex Password Reset',
        text: `Reset your MovieFlex password using this link: ${resetUrl}. This link expires in 15 minutes.`,
        html: `
          <h2>MovieFlex Password Reset</h2>
          <p>You requested a password reset.</p>
          <p>
            <a href="${resetUrl}">Reset Password</a>
          </p>
          <p>This link expires in 15 minutes.</p>
          <p>If you did not request this, ignore this email.</p>
        `,
      })
    } catch (mailError) {
      // Clear token if email could not be sent
      user.resetPasswordToken = undefined
      user.resetPasswordExpires = undefined
      await user.save()

      throw mailError
    }

    return res.status(200).json({
      success: true,
      message,
    })
  } catch (error) {
    console.error('Forgot Password Error:', error.message)

    res.status(500).json({
      success: false,
      message: 'Unable to send reset email. Please try again later.',
    })
  }
}

// Reset Password
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params
    const { password } = req.body

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      })
    }

    // Hash the token received from URL
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex')

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    })

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Reset link is invalid or expired',
      })
    }

    // Hash new password
    user.password = await bcrypt.hash(password, 10)

    // Single-use token: clear after successful reset
    user.resetPasswordToken = undefined
    user.resetPasswordExpires = undefined

    await user.save()

    return res.status(200).json({
      success: true,
      message: 'Password reset successful. Please login.',
    })
  } catch (error) {
    console.error('Reset Password Error:', error.message)

    res.status(500).json({
      success: false,
      message: 'Password reset failed',
    })
  }
}

// Update Profile
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    const { name } = req.body

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name is required',
      })
    }

    user.name = name.trim()
    await user.save()

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Update Profile Error:', error.message)

    res.status(500).json({
      success: false,
      message: 'Profile update failed',
    })
  }
}

// Change Password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Both passwords are required',
      })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters',
      })
    }

    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    const isMatch = await bcrypt.compare(
      currentPassword,
      user.password
    )

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      })
    }

    user.password = await bcrypt.hash(newPassword, 10)
    await user.save()

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    })
  } catch (error) {
    console.error('Change Password Error:', error.message)

    res.status(500).json({
      success: false,
      message: 'Password change failed',
    })
  }
}

// Export Controllers
module.exports = {
  signup,
  login,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
}
