import ServiceRequest from '../models/serviceRequest.model.js';
import Vendor from '../models/vendor.model.js';
import Institution from '../models/institution.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { paginateResults } from '../utils/helpers.js';

// @desc    Create a new Service Request
// @route   POST /api/v1/service-requests
// @access  Private (Candidate/User)
export const createRequest = asyncHandler(async (req, res) => {
    const {
        vendorId,
        serviceId,
        serviceName,
        message,
        requirements,
        budget,
        timeline
    } = req.body;

    if (!vendorId || !serviceId) {
        throw new ApiError(400, 'Vendor ID and Service ID are required');
    }

    // Verify vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
        throw new ApiError(404, 'Vendor not found');
    }

    // Verify service exists in vendor's products
    const service = vendor.products.id(serviceId);
    if (!service) {
        throw new ApiError(404, 'Service/Product not found in this vendor');
    }

    const request = await ServiceRequest.create({
        vendor: vendorId,
        requester: req.user._id,
        requesterName: req.user.name,
        requesterEmail: req.user.email,
        requesterMobile: req.user.mobile,
        service: serviceId,
        serviceName: service.name, // Use name from DB to be safe, or req.body if trusted
        serviceImage: service.image?.url,
        message,
        requirements,
        maxBudget: budget,
        expectedDate: timeline ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : undefined, // Placeholder logic for timeline string -> date if needed, or just store string in a different field
        statusHistory: [{ status: 'pending', note: 'Request created' }]
    });

    res.status(201).json(
        new ApiResponse(201, request, 'Service request sent successfully')
    );
});

// @desc    Get Incoming Requests (For Vendor)
// @route   GET /api/v1/service-requests/incoming
// @access  Private (Institution/Vendor)
export const getIncomingRequests = asyncHandler(async (req, res) => {
    // 1. Find the Vendor ID associated with the logged-in Institution
    const institution = await Institution.findOne({ user: req.user._id });
    if (!institution) {
        throw new ApiError(404, 'Institution profile not found');
    }
    const vendor = await Vendor.findOne({ institution: institution._id });
    if (!vendor) {
        throw new ApiError(404, 'Vendor profile not found');
    }

    const { page, limit, skip } = paginateResults(req.query.page, req.query.limit);

    const filter = { vendor: vendor._id };
    if (req.query.status) {
        filter.status = req.query.status;
    }

    const requests = await ServiceRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await ServiceRequest.countDocuments(filter);

    // Get counts for tabs
    const statusCounts = await ServiceRequest.aggregate([
        { $match: { vendor: vendor._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).then(res => res.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}));

    res.status(200).json(
        new ApiResponse(200, {
            requests,
            statusCounts,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        }, 'Incoming requests fetched successfully')
    );
});

// @desc    Get My Sent Requests (For Candidate)
// @route   GET /api/v1/service-requests/my-requests
// @access  Private
export const getMyRequests = asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginateResults(req.query.page, req.query.limit);

    const requests = await ServiceRequest.find({ requester: req.user._id })
        .populate('vendor', 'businessName logo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await ServiceRequest.countDocuments({ requester: req.user._id });

    res.status(200).json(
        new ApiResponse(200, {
            requests,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        }, 'My requests fetched successfully')
    );
});

// @desc    Update Request Status
// @route   PATCH /api/v1/service-requests/:id/status
// @access  Private (Vendor)
export const updateStatus = asyncHandler(async (req, res) => {
    const { status, note } = req.body;
    const { id } = req.params;

    // Verify vendor ownership
    const institution = await Institution.findOne({ user: req.user._id });
    if (!institution) throw new ApiError(404, 'Institution not found');

    const vendor = await Vendor.findOne({ institution: institution._id });
    if (!vendor) throw new ApiError(404, 'Vendor not found');

    const request = await ServiceRequest.findOne({ _id: id, vendor: vendor._id });
    if (!request) {
        throw new ApiError(404, 'Service request not found or unauthorized');
    }

    request.status = status;
    if (note) request.vendorNote = note;

    request.statusHistory.push({
        status,
        note: note || `Status updated to ${status}`,
        changedAt: new Date()
    });

    await request.save();

    res.status(200).json(
        new ApiResponse(200, request, 'Status updated successfully')
    );
});
