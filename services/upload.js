const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const ALLOWED_DOC_EXT = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif']);

function docFilename(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const safeExt = ALLOWED_DOC_EXT.has(ext) ? ext : '.pdf';
  cb(null, uuidv4() + safeExt);
}

let cloudinary = { uploader: { destroy: async () => {} } };

if (process.env.CLOUDINARY_URL) {
  const _cloudinary = require('cloudinary').v2;
  const { CloudinaryStorage } = require('multer-storage-cloudinary');
  _cloudinary.config({
    cloud_name: process.env.CLOUDINARY_URL.split('@')[1],
    api_key: process.env.CLOUDINARY_URL.split('://')[1].split(':')[0],
    api_secret: process.env.CLOUDINARY_URL.split(':')[2].split('@')[0],
  });
  cloudinary = _cloudinary;

  const photoStorage = new CloudinaryStorage({
    cloudinary,
    params: { folder: 'serenis/photos', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'], transformation: [{ width: 1920, height: 1280, crop: 'limit', quality: 85 }] },
  });

  // Documents: accept PDF + images (for pièces d'identité, plans, etc.)
  const docStorage = new CloudinaryStorage({
    cloudinary,
    params: (req, file) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const isPdf = ext === '.pdf';
      return {
        folder: 'serenis/documents',
        allowed_formats: ['pdf', 'jpg', 'jpeg', 'png', 'webp'],
        resource_type: isPdf ? 'raw' : 'image',
      };
    },
  });

  module.exports = {
    uploadPhoto: multer({ storage: photoStorage, limits: { fileSize: 20 * 1024 * 1024 } }),
    uploadDocument: multer({ storage: docStorage, limits: { fileSize: 50 * 1024 * 1024 } }),
    cloudinary,
  };
} else {
  // Dev mode — local disk storage
  const photoDisk = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/uploads/photos')),
    filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname).toLowerCase()),
  });
  const docDisk = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/uploads/documents')),
    filename: docFilename,
  });

  module.exports = {
    uploadPhoto: multer({ storage: photoDisk, limits: { fileSize: 20 * 1024 * 1024 } }),
    uploadDocument: multer({ storage: docDisk, limits: { fileSize: 50 * 1024 * 1024 } }),
    cloudinary,
  };
}
