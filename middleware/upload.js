// const multer = require('multer');
// const path = require('path');
// const fs = require('fs'); 


// const uploadDir = path.join(__dirname, '../public/uploads/products'); 
// if (!fs.existsSync (uploadDir) ) {
//     fs.mkdirSync(uploadDir, { recursive: true }); 
// }

// const storage = multer.diskStorage({
//     destination: (req, file, cb) => cb(null, uploadDir),
//     filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
// });

// const upload = multer({
//     storage,
//     limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
//     fileFilter: (req, file, cb) => {
//         const filetypes = /jpeg|jpg|png|gif|webp/;
//         const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
//         const mimetype = filetypes.test(file.mimetype);
//         if (extname && mimetype) {
//             return cb(null, true);
//         }
//         cb(new Error("Only images (JPEG, PNG, GIF, WEBP) are allowed"));
//     }
// });

// module.exports = upload;



const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads/products'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
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

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, 
}).fields([
  { name: 'cardImage', maxCount: 1 },
  { name: 'productImages', maxCount: 4 },
]);

module.exports = upload;