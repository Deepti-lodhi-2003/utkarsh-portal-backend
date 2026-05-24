import express from 'express';
import {
    createTraining,
    getAllTrainings,
    getTraining,
    updateTraining,
    deleteTraining,
    enrollInTraining,
    getMyEnrollments,
    getTrainingEnrollments,
    updateEnrollmentStatus,
    issueCertificate,
    uploadBanner,
    getMyTrainings
} from '../controllers/training.controller.js';
import { protect, optionalAuth } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { uploadBanner as uploadBannerMiddleware, handleUploadError } from '../middlewares/upload.middleware.js';
import { uploadLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = express.Router();

// Public routes
router.get('/', getAllTrainings);
router.get('/:idOrSlug', optionalAuth, getTraining);

// Candidate routes
router.post('/:id/enroll', protect, authorize('candidate'), enrollInTraining);
router.get('/enrollments/my', protect, authorize('candidate'), getMyEnrollments);

// Institution routes
router.post('/', protect, authorize('institution', 'admin'), createTraining);
router.get('/institution/my-trainings', protect, authorize('institution'), getMyTrainings);
router.put('/:id', protect, authorize('institution', 'admin'), updateTraining);
router.delete('/:id', protect, authorize('institution', 'admin'), deleteTraining);
router.post('/:id/banner', protect, authorize('institution', 'admin'), uploadLimiter, uploadBannerMiddleware, handleUploadError, uploadBanner);
router.get('/:id/enrollments', protect, authorize('institution'), getTrainingEnrollments);
router.patch('/enrollments/:enrollmentId/status', protect, authorize('institution'), updateEnrollmentStatus);
router.post('/enrollments/:enrollmentId/certificate', protect, authorize('institution'), issueCertificate);

export default router;