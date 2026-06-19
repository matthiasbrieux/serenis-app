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

function makeDiskStorage() {
  const photoDisk = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/uploads/photos')),
    filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname).toLowerCase()),
  });
  const docDisk = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/uploads/documents')),
    filename: docFilename,
  });
  return {
    uploadPhoto: multer({ storage: photoDisk, limits: { fileSize: 20 * 1024 * 1024 } }),
    uploadDocument: multer({ storage: docDisk, limits: { fileSize: 50 * 1024 * 1024 } }),
    cloudinary,
  };
}

if (process.env.CLOUDINARY_URL) {
  try {
    const _cloudinary = require('cloudinary').v2;
    const { CloudinaryStorage } = require('multer-storage-cloudinary');
    _cloudinary.config(true); // Lit CLOUDINARY_URL automatiquement via le SDK officiel
    cloudinary = _cloudinary;

    const photoStorage = new CloudinaryStorage({
      cloudinary,
      params: { folder: 'serenis/photos', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'], transformation: [{ width: 1920, height: 1280, crop: 'limit', quality: 85 }] },
    });

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
  } catch (err) {
    console.error('⚠️  CLOUDINARY_URL malformée — fallback stockage local:', err.message);
    module.exports = makeDiskStorage();
  }
} else {
  module.exports = makeDiskStorage();
}
