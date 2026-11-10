// Admin image uploads → Cloudinary (resized and served as WebP/AVIF automatically).
const express = require('express');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { protect, adminOnly } = require('../middleware/auth');
const AppError = require('../utils/AppError');
const config = require('../config');

const router = express.Router();

if (config.cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    ALLOWED.includes(file.mimetype) ? cb(null, true) : cb(AppError.badRequest('Only JPG, PNG, WebP or AVIF images are allowed')),
});

const uploadBuffer = (buffer, folder) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder: `hungrybirds/${folder}`, resource_type: 'image', transformation: [{ width: 1200, height: 1200, crop: 'limit' }] },
        (err, result) => (err ? reject(err) : resolve(result)),
      )
      .end(buffer);
  });

// @POST /api/uploads?folder=restaurants|menu|agents  (multipart field: "image")
router.post('/', protect, adminOnly, upload.single('image'), async (req, res) => {
  if (!config.cloudinaryEnabled) throw AppError.unavailable('Image uploads are not configured on this server');
  if (!req.file) throw AppError.badRequest('Attach an image in the "image" field');
  const folder = ['restaurants', 'menu', 'agents'].includes(req.query.folder) ? req.query.folder : 'misc';
  const result = await uploadBuffer(req.file.buffer, folder);
  // f_auto,q_auto → Cloudinary serves the best format/quality for each browser.
  const url = result.secure_url.replace('/upload/', '/upload/f_auto,q_auto/');
  res.status(201).json({ url, width: result.width, height: result.height });
});

module.exports = router;
