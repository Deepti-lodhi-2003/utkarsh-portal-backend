import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import ApiError from '../utils/ApiError.js';
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZES } from '../utils/constants.js';

// Storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/temp');
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// File filter
const fileFilter = (allowedTypes) => (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new ApiError(400, `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`), false);
    }
};

// Create multer instances for different file types
export const uploadResume = multer({
    storage,
    fileFilter: fileFilter(ALLOWED_FILE_TYPES.RESUME),
    limits: { fileSize: MAX_FILE_SIZES.RESUME }
}).single('resume');

export const uploadAvatar = multer({
    storage,
    fileFilter: fileFilter(ALLOWED_FILE_TYPES.IMAGE),
    limits: { fileSize: MAX_FILE_SIZES.IMAGE }
}).single('avatar');

export const uploadLogo = multer({
    storage,
    fileFilter: fileFilter(ALLOWED_FILE_TYPES.IMAGE),
    limits: { fileSize: MAX_FILE_SIZES.LOGO }
}).single('logo');

export const uploadBanner = multer({
    storage,
    fileFilter: fileFilter(ALLOWED_FILE_TYPES.IMAGE),
    limits: { fileSize: MAX_FILE_SIZES.IMAGE }
}).single('banner');

export const uploadDocument = multer({
    storage,
    fileFilter: fileFilter(ALLOWED_FILE_TYPES.DOCUMENT),
    limits: { fileSize: MAX_FILE_SIZES.DOCUMENT }
}).single('document');

export const uploadGallery = multer({
    storage,
    fileFilter: fileFilter(ALLOWED_FILE_TYPES.IMAGE),
    limits: { fileSize: MAX_FILE_SIZES.IMAGE }
}).array('images', 10);

export const uploadMultipleDocuments = multer({
    storage,
    fileFilter: fileFilter(ALLOWED_FILE_TYPES.DOCUMENT),
    limits: { fileSize: MAX_FILE_SIZES.DOCUMENT }
}).array('documents', 5);

// Handle multer errors
export const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new ApiError(400, 'File size too large'));
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return next(new ApiError(400, 'Too many files'));
        }
        return next(new ApiError(400, err.message));
    }
    next(err);
};