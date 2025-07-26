import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Create upload directories if they don't exist
const createUploadDirs = () => {
  const dirs = ['uploads/posts', 'uploads/stories', 'uploads/profiles', 'uploads/services', 'uploads/chat'];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createUploadDirs();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';
    
    if (req.route.path.includes('posts')) uploadPath += 'posts/';
    else if (req.route.path.includes('stories')) uploadPath += 'stories/';
    else if (req.route.path.includes('profile')) uploadPath += 'profiles/';
    else if (req.route.path.includes('services')) uploadPath += 'services/';
    else if (req.route.path.includes('chat')) uploadPath += 'chat/';
    else uploadPath += 'general/';
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allow images and videos
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image and video files are allowed!'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

export const uploadSingle = upload.single('file');
export const uploadMultiple = upload.array('files', 10);
export const uploadFields = upload.fields([
  { name: 'media', maxCount: 10 },
  { name: 'images', maxCount: 10 }
]);