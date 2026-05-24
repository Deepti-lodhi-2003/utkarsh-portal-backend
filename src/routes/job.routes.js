import express from 'express';
import {
    createJob,
    getAllJobs,
    getJob,
    updateJob,
    deleteJob,
    getMyJobs,
    changeJobStatus,
    getSimilarJobs,
    uploadBanner
} from '../controllers/job.controller.js';
import {
    applyForJob,
    getJobApplications
} from '../controllers/application.controller.js';
import { protect, optionalAuth } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { uploadResume, uploadBanner as uploadBannerMiddleware, handleUploadError } from '../middlewares/upload.middleware.js';
import { createJobSchema, updateJobSchema, applyJobSchema } from '../validators/job.validator.js';

const router = express.Router();

// Public routes
router.get('/', getAllJobs);
router.get('/:idOrSlug', optionalAuth, getJob);
router.get('/:id/similar', getSimilarJobs);

// Institution routes
router.post('/', protect, authorize('institution', 'admin'), validate(createJobSchema), createJob);
router.get('/institution/my-jobs', protect, authorize('institution', 'admin'), getMyJobs);
router.put('/:id', protect, authorize('institution', 'admin'), validate(updateJobSchema), updateJob);
router.delete('/:id', protect, authorize('institution', 'admin'), deleteJob);
router.patch('/:id/status', protect, authorize('institution', 'admin'), changeJobStatus);
router.post('/:id/banner', protect, authorize('institution', 'admin'), uploadBannerMiddleware, handleUploadError, uploadBanner);

// Application routes
router.post('/:jobId/apply', protect, authorize('candidate'), uploadResume, handleUploadError, validate(applyJobSchema), applyForJob);
router.get('/:jobId/applications', protect, authorize('institution', 'admin'), getJobApplications);

export default router;