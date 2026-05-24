import express from 'express';
import {
    getProfile,
    updateProfile,
    addEducation,
    updateEducation,
    deleteEducation,
    addExperience,
    updateExperience,
    deleteExperience,
    updateSkills,
    uploadResume,
    deleteResume,
    uploadAvatar,
    getCandidateById,
    getAllCandidates
} from '../controllers/candidate.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { uploadResume as uploadResumeMiddleware, uploadAvatar as uploadAvatarMiddleware, handleUploadError } from '../middlewares/upload.middleware.js';
import { uploadLimiter } from '../middlewares/rateLimiter.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
    updateProfileSchema,
    addEducationSchema,
    updateEducationSchema,
    addExperienceSchema,
    updateExperienceSchema,
    updateSkillsSchema
} from '../validators/candidate.validator.js';

const router = express.Router();

// Profile routes (Candidate only)
router.get('/profile', protect, authorize('candidate'), getProfile);
router.put('/profile', protect, authorize('candidate'), validate(updateProfileSchema), updateProfile);

// Education routes
router.post('/education', protect, authorize('candidate'), validate(addEducationSchema), addEducation);
router.put('/education/:eduId', protect, authorize('candidate'), validate(updateEducationSchema), updateEducation);
router.delete('/education/:eduId', protect, authorize('candidate'), deleteEducation);

// Experience routes
router.post('/experience', protect, authorize('candidate'), validate(addExperienceSchema), addExperience);
router.put('/experience/:expId', protect, authorize('candidate'), validate(updateExperienceSchema), updateExperience);
router.delete('/experience/:expId', protect, authorize('candidate'), deleteExperience);

// Skills routes
router.put('/skills', protect, authorize('candidate'), validate(updateSkillsSchema), updateSkills);

// File upload routes
router.post('/resume', protect, authorize('candidate'), uploadLimiter, uploadResumeMiddleware, handleUploadError, uploadResume);
router.delete('/resume', protect, authorize('candidate'), deleteResume);
router.post('/avatar', protect, authorize('candidate'), uploadLimiter, uploadAvatarMiddleware, handleUploadError, uploadAvatar);

// Public routes
router.get('/:id', getCandidateById);

// Institution/Admin routes
router.get('/', protect, authorize('institution', 'admin'), getAllCandidates);

export default router;