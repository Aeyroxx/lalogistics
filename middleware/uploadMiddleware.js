const multer = require('multer');
const path = require('path');

// Configure profile picture storage
const profileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/profile/');
  },
  filename: function (req, file, cb) {
    cb(null, `${req.user._id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

// Configure ID storage
const idStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/ids/');
  },
  filename: function (req, file, cb) {
    cb(null, `${req.user._id}-${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

// Initialize upload for profile pictures
const profileUpload = multer({
  storage: profileStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
}).single('profilePicture');

// Initialize upload for ID cards (primary and secondary)
const idUpload = multer({
  storage: idStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
}).fields([
  { name: 'primaryId', maxCount: 1 },
  { name: 'secondaryId', maxCount: 1 }
]);

module.exports = {
  profileUpload,
  idUpload
};
