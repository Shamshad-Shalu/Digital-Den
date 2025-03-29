// middleware/upload.js
const multer = require('multer');
const path = require('path');

const createStorage = (destinationPath) => multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../public', destinationPath));
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        cb(null, `${timestamp}${ext}`);
    },
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPEG, PNG, GIF, and WEBP files are allowed'), false);
    }
};

const createUpload = (destinationPath, fieldConfig) => {
    return multer({
        storage: createStorage(destinationPath),
        fileFilter,
        limits: { fileSize: 5 * 1024 * 1024 },
    }).fields(fieldConfig);
};

const uploadSingle = (destinationPath, fieldName) => {
    return multer({
        storage: createStorage(destinationPath),
        fileFilter,
        limits: { fileSize: 5 * 1024 * 1024 },
    }).single(fieldName);
};

module.exports = { createUpload, uploadSingle };