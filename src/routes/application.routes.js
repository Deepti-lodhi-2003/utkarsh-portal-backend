import express from 'express';
import {
    getMyApplications,
    getApplication,
    updateApplicationStatus,
    shortlistApplication,
    scheduleInterview,
    addInterviewFeedback,
    makeOffer,
    respondToOffer,
    withdrawApplication,
    addNote,
    submitFeedback,
    getInstitutionApplications
} from '../controllers/application.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';

const router = express.Router();

// Candidate routes
router.get('/my-applications', protect, authorize('candidate'), getMyApplications);
router.post('/:id/respond-offer', protect, authorize('candidate'), respondToOffer);
router.post('/:id/withdraw', protect, authorize('candidate'), withdrawApplication);
router.post('/:id/feedback', protect, authorize('candidate'), submitFeedback);


// Institution routes
router.get('/institution/applications', protect, authorize('institution'), getInstitutionApplications);
router.patch('/:id/status', protect, authorize('institution'), updateApplicationStatus);
router.post('/:id/shortlist', protect, authorize('institution'), shortlistApplication);
router.post('/:id/schedule-interview', protect, authorize('institution'), scheduleInterview);
router.post('/:id/interview-feedback', protect, authorize('institution'), addInterviewFeedback);
router.post('/:id/offer', protect, authorize('institution'), makeOffer);
router.post('/:id/notes', protect, authorize('institution'), addNote);

// Common route
router.get('/:id', protect, getApplication);

export default router;