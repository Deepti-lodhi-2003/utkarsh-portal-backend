import express from 'express';
import {
    createRequest,
    getIncomingRequests,
    getMyRequests,
    updateStatus
} from '../controllers/serviceRequest.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';

const router = express.Router();

// Candidate sends request
router.post('/', protect, createRequest);

// Candidate views their sent requests
router.get('/my-requests', protect, getMyRequests);

// Vendor views incoming requests
router.get('/incoming', protect, authorize('institution'), getIncomingRequests);

// Vendor updates status
router.patch('/:id/status', protect, authorize('institution'), updateStatus);

export default router;
