import express from 'express';
import {
    getProfile,
    updateProfile,
    uploadLogo,
    uploadCoverImage,
    uploadGalleryImages,
    deleteGalleryImage,
    uploadDocument,
    getInstitutionById,
    getAllInstitutions,
    getInstitutionJobs,
    getDashboardStats
} from '../controllers/institution.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { 
    uploadLogo as uploadLogoMiddleware, 
    uploadAvatar as uploadCoverMiddleware,
    uploadGallery as uploadGalleryMiddleware,
    uploadDocument as uploadDocumentMiddleware,
    handleUploadError 
} from '../middlewares/upload.middleware.js';
import { uploadLimiter } from '../middlewares/rateLimiter.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { updateInstitutionSchema } from '../validators/institution.validator.js';

const router = express.Router();

// Profile routes (Institution only)
router.get('/profile', protect, authorize('institution'), getProfile);
router.put('/profile', protect, authorize('institution'), validate(updateInstitutionSchema), updateProfile);

// Dashboard
router.get('/dashboard/stats', protect, authorize('institution'), getDashboardStats);

// File upload routes
router.post('/logo', protect, authorize('institution'), uploadLimiter, uploadLogoMiddleware, handleUploadError, uploadLogo);
router.post('/cover', protect, authorize('institution'), uploadLimiter, uploadCoverMiddleware, handleUploadError, uploadCoverImage);
router.post('/gallery', protect, authorize('institution'), uploadLimiter, uploadGalleryMiddleware, handleUploadError, uploadGalleryImages);
router.delete('/gallery/:imageId', protect, authorize('institution'), deleteGalleryImage);
router.post('/documents', protect, authorize('institution'), uploadLimiter, uploadDocumentMiddleware, handleUploadError, uploadDocument);

// Public routes
router.get('/', getAllInstitutions);
router.get('/:id', getInstitutionById);
router.get('/:id/jobs', getInstitutionJobs);

export default router;   