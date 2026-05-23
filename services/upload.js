const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

if (process.env.CLOUDINARY_URL) {
  cloudinary.config({ cloud_name: process.env.CLOUDINARY_URL.split('@')[1], api_key: process.env.CLOUDINARY_URL.split('://')[1].split(':')[0], api_secret: process.env.CLOUDINARY_URL.split(':')[2].split('@')[0] });
}

const photoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'serenis/photos',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1920, height: 1280, crop: 'limit', quality: 85 }],
  },
});

const docStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'serenis/documents',
    allowed_formats: ['pdf'],
    resource_type: 'raw',
  },
});

const memoryStorage = multer.memoryStorage();

const uploadPhoto = process.env.CLOUDINARY_URL
  ? multer({ storage: photoStorage, limits: { fileSize: 20 * 1024 * 1024 } })
  : multer({ storage: memoryStorage, limits: { fileSize: 20 * 1024 * 1024 } });

const uploadDocument = process.env.CLOUDINARY_URL
  ? multer({ storage: docStorage, limits: { fileSize: 50 * 1024 * 1024 } })
  : multer({ storage: memoryStorage, limits: { fileSize: 50 * 1024 * 1024 } });

module.exports = { uploadPhoto, uploadDocument, cloudinary };
