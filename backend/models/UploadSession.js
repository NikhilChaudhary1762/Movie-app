const mongoose = require('mongoose');

const uploadSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  b2UploadId: { type: String, required: true },
  objectKey: { type: String, required: true },
  fileName: { type: String, required: true },
  fileSize: { type: Number, required: true },
  contentType: { type: String, required: true },
  partSize: { type: Number, required: true },
  totalParts: { type: Number, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['uploading', 'completed', 'aborted'], default: 'uploading', index: true },
  videoUrl: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

uploadSessionSchema.index({ createdAt:  1 }, { expireAfterSeconds: 60 * 60 * 24 * 14 });

module.exports = mongoose.model('UploadSession', uploadSessionSchema);
