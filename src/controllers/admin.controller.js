import User from '../models/user.model.js';
import Candidate from '../models/candidate.model.js';
import Institution from '../models/institution.model.js';
import Job from '../models/job.model.js';
import Application from '../models/application.model.js';
import Training from '../models/training.model.js';
import Vendor from '../models/vendor.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { paginateResults } from '../utils/helpers.js';
import cloudinaryService from '../services/cloudinary.service.js';
import ServiceRequest from '../models/serviceRequest.model.js';
import TrainingEnrollment from '../models/trainingEnrollment.model.js';
import SearchHistory from '../models/searchHistory.model.js';
// ================================================================
//  TRAINING MANAGEMENT - ADMIN FULL CRUD + BANNER
// ================================================================

// @desc    Admin Create Training
// @route   POST /api/v1/admin/trainings
// @access  Private (Admin)
export const adminCreateTraining = asyncHandler(async (req, res) => {
    const trainingData = { ...req.body };

    trainingData.createdBy = req.user._id;
    trainingData.isApproved = true;

    // Number conversions
    trainingData.totalSeats = Number(trainingData.totalSeats) || 0;
    trainingData.availableSeats = trainingData.totalSeats;

    if (typeof trainingData.duration === 'object') {
        trainingData.duration = {
            value: Number(trainingData.duration.value) || 0,
            unit: trainingData.duration.unit || 'days'
        };
    }

    if (typeof trainingData.fees === 'object') {
        trainingData.fees = {
            amount: trainingData.fees.isFree ? 0 : (Number(trainingData.fees.amount) || 0),
            isFree: trainingData.fees.isFree || false
        };
    }

    if (typeof trainingData.venue === 'object') {
        trainingData.venue = {
            city: trainingData.venue.city || '',
            state: trainingData.venue.state || 'Madhya Pradesh'
        };
    }

    const training = await Training.create(trainingData);

    res.status(201).json(
        new ApiResponse(201, { training }, 'Training created successfully')
    );
});

// @desc    Admin Update Training
// @route   PUT /api/v1/admin/trainings/:id
// @access  Private (Admin)
export const adminUpdateTraining = asyncHandler(async (req, res) => {
    let training = await Training.findById(req.params.id);

    if (!training) {
        throw new ApiError(404, 'Training not found');
    }

    const updateData = { ...req.body };

    if (typeof updateData.duration === 'object') {
        updateData.duration = {
            value: Number(updateData.duration.value) || training.duration?.value || 0,
            unit: updateData.duration.unit || training.duration?.unit || 'days'
        };
    }

    if (typeof updateData.fees === 'object') {
        updateData.fees = {
            amount: updateData.fees.isFree ? 0 : (Number(updateData.fees.amount) || 0),
            isFree: updateData.fees.isFree || false
        };
    }

    if (typeof updateData.venue === 'object') {
        updateData.venue = {
            city: updateData.venue.city || training.venue?.city || '',
            state: updateData.venue.state || training.venue?.state || 'Madhya Pradesh'
        };
    }

    if (updateData.totalSeats) {
        updateData.totalSeats = Number(updateData.totalSeats);
        const enrolled = training.enrollmentCount || 0;
        updateData.availableSeats = Math.max(0, updateData.totalSeats - enrolled);
    }

    training = await Training.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
    );

    res.status(200).json(
        new ApiResponse(200, { training }, 'Training updated successfully')
    );
});

// @desc    Admin Delete Training
// @route   DELETE /api/v1/admin/trainings/:id
// @access  Private (Admin)
export const adminDeleteTraining = asyncHandler(async (req, res) => {
    const training = await Training.findById(req.params.id);

    if (!training) {
        throw new ApiError(404, 'Training not found');
    }

    const activeEnrollments = await TrainingEnrollment.countDocuments({
        training: req.params.id,
        status: { $in: ['confirmed', 'in_progress'] }
    });

    if (activeEnrollments > 0) {
        throw new ApiError(400, `Cannot delete: ${activeEnrollments} active enrollment(s) exist`);
    }

    // Delete banner from cloudinary
    if (training.banner?.public_id) {
        try {
            await cloudinaryService.deleteFile(training.banner.public_id);
        } catch (err) {
            console.error('Failed to delete banner:', err.message);
        }
    }

    await TrainingEnrollment.deleteMany({ training: req.params.id });
    await Training.findByIdAndDelete(req.params.id);

    res.status(200).json(
        new ApiResponse(200, null, 'Training deleted successfully')
    );
});

// @desc    Update Training Status (Admin)
// @route   PATCH /api/v1/admin/trainings/:id/status
// @access  Private (Admin)
export const updateTrainingStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const validStatuses = ['upcoming', 'ongoing', 'completed', 'cancelled'];

    if (!status || !validStatuses.includes(status)) {
        throw new ApiError(400, `Invalid status. Must be: ${validStatuses.join(', ')}`);
    }

    const training = await Training.findById(req.params.id);

    if (!training) {
        throw new ApiError(404, 'Training not found');
    }

    const transitions = {
        upcoming: ['ongoing', 'cancelled'],
        ongoing: ['completed', 'cancelled'],
        completed: [],
        cancelled: ['upcoming']
    };

    if (!transitions[training.status]?.includes(status)) {
        throw new ApiError(400, `Cannot change '${training.status}' → '${status}'. Allowed: ${transitions[training.status]?.join(', ') || 'none'}`);
    }

    training.status = status;

    if (status === 'ongoing') training.actualStartDate = new Date();
    if (status === 'completed') training.endDate = new Date();
    if (status === 'cancelled') training.isActive = false;
    if (status === 'upcoming') training.isActive = true;

    await training.save();

    res.status(200).json(
        new ApiResponse(200, { training }, `Status updated to '${status}'`)
    );
});

// @desc    Get Training Details (Admin)
// @route   GET /api/v1/admin/trainings/:id
// @access  Private (Admin)
export const getTrainingDetails = asyncHandler(async (req, res) => {
    const training = await Training.findById(req.params.id)
        .populate('institution', 'organizationName logo address about website')
        .populate('createdBy', 'name email');

    if (!training) {
        throw new ApiError(404, 'Training not found');
    }

    const enrollmentStats = await TrainingEnrollment.aggregate([
        { $match: { training: training._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.status(200).json(
        new ApiResponse(200, { training, enrollmentStats }, 'Training details fetched')
    );
});

// @desc    Admin Upload/Update Training Banner
// @route   POST /api/v1/admin/trainings/:id/banner
// @access  Private (Admin)
export const adminUploadBanner = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, 'Please upload an image');
    }

    const training = await Training.findById(req.params.id);

    if (!training) {
        throw new ApiError(404, 'Training not found');
    }

    // Delete old banner from cloudinary if exists
    if (training.banner?.public_id) {
        try {
            await cloudinaryService.deleteFile(training.banner.public_id);
        } catch (err) {
            console.error('Failed to delete old banner:', err.message);
        }
    }

    // Upload new banner
    const result = await cloudinaryService.uploadBanner(
        req.file.path,
        req.params.id,
        'training'
    );

    training.banner = {
        public_id: result.public_id,
        url: result.url
    };

    await training.save();

    res.status(200).json(
        new ApiResponse(200, { banner: training.banner }, 'Banner uploaded successfully')
    );
});

// @desc    Get Admin Dashboard Stats
// @route   GET /api/v1/admin/dashboard
// @access  Private (Admin)
export const getDashboardStats = asyncHandler(async (req, res) => {
    const [
        totalUsers,
        totalCandidates,
        totalInstitutions,
        totalJobs,
        activeJobs,
        totalApplications,
        totalTrainings,
        totalVendors,
        recentUsers,
        recentJobs
    ] = await Promise.all([
        User.countDocuments(),
        Candidate.countDocuments(),
        Institution.countDocuments(),
        Job.countDocuments(),
        Job.countDocuments({ status: 'active' }),
        Application.countDocuments(),
        Training.countDocuments(),
        Vendor.countDocuments(),
        User.find().select('name email role createdAt').sort({ createdAt: -1 }).limit(5),
        Job.find()
            .populate('institution', 'organizationName')
            .select('title status createdAt')
            .sort({ createdAt: -1 })
            .limit(5)
    ]);

    // Get monthly stats for charts
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyStats = await User.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo } } },
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' }
                },
                count: { $sum: 1 }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.status(200).json(
        new ApiResponse(200, {
            stats: {
                totalUsers,
                totalCandidates,
                totalInstitutions,
                totalJobs,
                activeJobs,
                totalApplications,
                totalTrainings,
                totalVendors
            },
            recentUsers,
            recentJobs,
            monthlyStats
        }, 'Dashboard stats fetched successfully')
    );
});

// @desc    Create User (Admin)
// @route   POST /api/v1/admin/users
// @access  Private (Admin)
export const createUser = asyncHandler(async (req, res) => {
    const { name, email, mobile, password, role } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { mobile }] });
    if (existingUser) {
        throw new ApiError(400, 'User with this email or mobile already exists');
    }

    const user = await User.create({
        name,
        email,
        mobile,
        password,
        role,
        isMobileVerified: true,
        isEmailVerified: true
    });

    // Create empty profile
    if (role === 'candidate') {
        await Candidate.create({ user: user._id, candidateType: 'fresher' });
    } else if (role === 'institution') {
        await Institution.create({
            user: user._id,
            institutionType: 'industry',
            organizationName: name,
            contactPerson: { name: name }
        });
    }

    res.status(201).json(
        new ApiResponse(201, { user }, 'User created successfully')
    );
});

// @desc    Update User (Admin)
// @route   PUT /api/v1/admin/users/:id
// @access  Private (Admin)
export const updateUser = asyncHandler(async (req, res) => {
    const { name, email, mobile, role, isActive } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    if ((email && email !== user.email) || (mobile && mobile !== user.mobile)) {
        const existingUser = await User.findOne({
            $or: [{ email }, { mobile }],
            _id: { $ne: user._id }
        });
        if (existingUser) {
            throw new ApiError(400, 'Email or mobile already in use');
        }
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (mobile) user.mobile = mobile;
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    res.status(200).json(
        new ApiResponse(200, { user }, 'User updated successfully')
    );
});

// @desc    Get All Users
// @route   GET /api/v1/admin/users
// @access  Private (Admin)
export const getAllUsers = asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginateResults(req.query.page, req.query.limit);

    const filter = {};

    if (req.query.role) {
        filter.role = req.query.role;
    }

    if (req.query.isActive !== undefined) {
        filter.isActive = req.query.isActive === 'true';
    }

    if (req.query.q) {
        filter.$or = [
            { name: { $regex: req.query.q, $options: 'i' } },
            { email: { $regex: req.query.q, $options: 'i' } },
            { mobile: { $regex: req.query.q, $options: 'i' } }
        ];
    }

    const users = await User.find(filter)
        .select('name email mobile role isActive isMobileVerified createdAt lastLogin')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await User.countDocuments(filter);

    res.status(200).json(
        new ApiResponse(200, {
            users,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        }, 'Users fetched successfully')
    );
});

// @desc    Get User Details
// @route   GET /api/v1/admin/users/:id
// @access  Private (Admin)
export const getUserDetails = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    let profile = null;
    let activity = {
        outgoingRequests: [],
        incomingRequests: [],
        applications: [],
        enrollments: [],
        jobs: [],
        trainings: [],
        vendor: null
    };

    // Common: Outgoing Service Requests (User requesting a service)
    activity.outgoingRequests = await ServiceRequest.find({ requester: user._id })
        .select('serviceName status createdAt')
        .populate('vendor', 'businessName') // If Vendor model has businessName
        .sort({ createdAt: -1 });


    if (user.role === 'candidate') {
        profile = await Candidate.findOne({ user: user._id });

        if (profile) {
            const [applications, enrollments] = await Promise.all([
                Application.find({ candidate: profile._id }).populate('job', 'title status location'),
                TrainingEnrollment.find({ candidate: profile._id }).populate('training', 'title status startDate')
            ]);
            activity.applications = applications;
            activity.enrollments = enrollments;
        }
    } else if (user.role === 'institution') {
        profile = await Institution.findOne({ user: user._id });

        if (profile) {
            const [jobs, trainings, vendorProfile] = await Promise.all([
                Job.find({ institution: profile._id }).select('title status applicationsCount createdAt'),
                Training.find({ institution: profile._id }).select('title status enrollmentCount startDate'),
                Vendor.findOne({ institution: profile._id })
            ]);
            activity.jobs = jobs;
            activity.trainings = trainings;

            if (vendorProfile) {
                activity.vendor = vendorProfile;
                // Incoming Service Requests (Vendor receiving a request)
                activity.incomingRequests = await ServiceRequest.find({ vendor: vendorProfile._id })
                    .select('serviceName status createdAt requesterName')
                    .sort({ createdAt: -1 });
            }
        }
    }

    res.status(200).json(
        new ApiResponse(200, { user, profile, activity }, 'User details fetched successfully')
    );
});

// @desc    Update User Status
// @route   PATCH /api/v1/admin/users/:id/status
// @access  Private (Admin)
export const updateUserStatus = asyncHandler(async (req, res) => {
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
        req.params.id,
        { isActive },
        { new: true }
    );

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    res.status(200).json(
        new ApiResponse(200, user, `User ${isActive ? 'activated' : 'deactivated'} successfully`)
    );
});

// @desc    Delete User
// @route   DELETE /api/v1/admin/users/:id
// @access  Private (Admin)
export const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    const userId = user._id;

    // Delete associated profile
    if (user.role === 'candidate') {
        await Candidate.deleteOne({ user: userId });
        // Delete all applications by this candidate
        await Application.deleteMany({ applicant: userId });
        // Delete search history
        await SearchHistory.deleteMany({ user: userId });
        // Delete training enrollments
        await TrainingEnrollment.deleteMany({ user: userId });
    } else if (user.role === 'institution') {
        await Institution.deleteOne({ user: userId });
        // Delete all jobs posted by institution
        await Job.deleteMany({ postedBy: userId });
        // Delete all applications to institution jobs
        await Application.deleteMany({ institution: userId });
        // Delete all trainings created by institution
        await Training.deleteMany({ createdBy: userId });
        // Delete service requests from institution
        await ServiceRequest.deleteMany({ user: userId });
    } else if (user.role === 'vendor') {
        // Delete vendor profile
        await Vendor.deleteOne({ user: userId });
        // Delete service requests from vendor
        await ServiceRequest.deleteMany({ user: userId });
    }

    // Delete user record
    await User.findByIdAndDelete(userId);

    res.status(200).json(
        new ApiResponse(200, null, 'User and all associated data deleted successfully')
    );
});

// @desc    Get Pending Jobs for Approval
// @route   GET /api/v1/admin/jobs/pending
// @access  Private (Admin)
export const getPendingJobs = asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginateResults(req.query.page, req.query.limit);

    const jobs = await Job.find({ status: 'pending', isApproved: false })
        .populate('institution', 'organizationName logo')
        .populate('postedBy', 'name email')
        .select('title location salary jobType createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await Job.countDocuments({ status: 'pending', isApproved: false });

    res.status(200).json(
        new ApiResponse(200, {
            jobs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        }, 'Pending jobs fetched successfully')
    );
});

// @desc    Approve Job
// @route   PATCH /api/v1/admin/jobs/:id/approve
// @access  Private (Admin)
export const approveJob = asyncHandler(async (req, res) => {
    const job = await Job.findById(req.params.id);

    if (!job) {
        throw new ApiError(404, 'Job not found');
    }

    job.isApproved = true;
    job.status = 'active';
    job.approvedAt = new Date();
    job.approvedBy = req.user._id;

    await job.save();

    res.status(200).json(
        new ApiResponse(200, job, 'Job approved successfully')
    );
});

// @desc    Reject Job
// @route   PATCH /api/v1/admin/jobs/:id/reject
// @access  Private (Admin)
export const rejectJob = asyncHandler(async (req, res) => {
    const { reason } = req.body;

    const job = await Job.findById(req.params.id);

    if (!job) {
        throw new ApiError(404, 'Job not found');
    }

    job.status = 'rejected';
    job.rejectionReason = reason;

    await job.save();

    res.status(200).json(
        new ApiResponse(200, job, 'Job rejected')
    );
});

// @desc    Get Pending Institution Verifications
// @route   GET /api/v1/admin/institutions/pending
// @access  Private (Admin)
export const getPendingInstitutions = asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginateResults(req.query.page, req.query.limit);

    const institutions = await Institution.find({ isVerified: false })
        .populate('user', 'name email mobile')
        .select('organizationName institutionType address createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await Institution.countDocuments({ isVerified: false });

    res.status(200).json(
        new ApiResponse(200, {
            institutions,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        }, 'Pending institutions fetched successfully')
    );
});

// @desc    Verify Institution
// @route   PATCH /api/v1/admin/institutions/:id/verify
// @access  Private (Admin)
export const verifyInstitution = asyncHandler(async (req, res) => {
    const institution = await Institution.findById(req.params.id);

    if (!institution) {
        throw new ApiError(404, 'Institution not found');
    }

    institution.isVerified = true;
    institution.verifiedAt = new Date();
    institution.verifiedBy = req.user._id;

    await institution.save();

    res.status(200).json(
        new ApiResponse(200, institution, 'Institution verified successfully')
    );
});

// @desc    Reject Institution Verification
// @route   PATCH /api/v1/admin/institutions/:id/reject
// @access  Private (Admin)
export const rejectInstitution = asyncHandler(async (req, res) => {
    const { reason } = req.body;

    const institution = await Institution.findById(req.params.id);

    if (!institution) {
        throw new ApiError(404, 'Institution not found');
    }

    institution.isActive = false;

    await institution.save();

    // Optionally send email with rejection reason

    res.status(200).json(
        new ApiResponse(200, institution, 'Institution rejected')
    );
});

// @desc    Get All Jobs (Admin)
// @route   GET /api/v1/admin/jobs
// @access  Private (Admin)
export const getAllJobs = asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginateResults(req.query.page, req.query.limit);

    const filter = {};

    if (req.query.status) {
        filter.status = req.query.status;
    }

    if (req.query.isApproved !== undefined) {
        filter.isApproved = req.query.isApproved === 'true';
    }

    const jobs = await Job.find(filter)
        .populate('institution', 'organizationName')
        .select('title status isApproved location createdAt applicationsCount')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await Job.countDocuments(filter);

    res.status(200).json(
        new ApiResponse(200, {
            jobs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        }, 'Jobs fetched successfully')
    );
});

// @desc    Feature/Unfeature Job
// @route   PATCH /api/v1/admin/jobs/:id/feature
// @access  Private (Admin)
export const featureJob = asyncHandler(async (req, res) => {
    const { isFeatured, featuredUntil } = req.body;

    const job = await Job.findByIdAndUpdate(
        req.params.id,
        { isFeatured, featuredUntil },
        { new: true }
    );

    if (!job) {
        throw new ApiError(404, 'Job not found');
    }

    res.status(200).json(
        new ApiResponse(200, job, `Job ${isFeatured ? 'featured' : 'unfeatured'} successfully`)
    );
});

// @desc    Get All Trainings (Admin)
// @route   GET /api/v1/admin/trainings
// @access  Private (Admin)
export const getAllTrainings = asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginateResults(req.query.page, req.query.limit);

    const filter = {};

    if (req.query.status) {
        filter.status = req.query.status;
    }

    if (req.query.isApproved !== undefined) {
        filter.isApproved = req.query.isApproved === 'true';
    }

    const trainings = await Training.find(filter)
        .populate('institution', 'organizationName')
        .select('title status isApproved category startDate enrollmentCount')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await Training.countDocuments(filter);

    res.status(200).json(
        new ApiResponse(200, {
            trainings,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        }, 'Trainings fetched successfully')
    );
});

// @desc    Approve Training
// @route   PATCH /api/v1/admin/trainings/:id/approve
// @access  Private (Admin)
export const approveTraining = asyncHandler(async (req, res) => {
    const training = await Training.findById(req.params.id);

    if (!training) {
        throw new ApiError(404, 'Training not found');
    }

    training.isApproved = true;
    await training.save();

    res.status(200).json(
        new ApiResponse(200, training, 'Training approved successfully')
    );
});

// @desc    Get Reports
// @route   GET /api/v1/admin/reports
// @access  Private (Admin)
export const getReports = asyncHandler(async (req, res) => {
    const { startDate, endDate, type } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    let report = {};

    switch (type) {
        case 'users':
            report = await User.aggregate([
                { $match: dateFilter.createdAt ? { createdAt: dateFilter } : {} },
                {
                    $group: {
                        _id: '$role',
                        count: { $sum: 1 }
                    }
                }
            ]);
            break;

        case 'jobs':
            report = await Job.aggregate([
                { $match: dateFilter.createdAt ? { createdAt: dateFilter } : {} },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        totalApplications: { $sum: '$applicationsCount' }
                    }
                }
            ]);
            break;

        case 'applications':
            report = await Application.aggregate([
                { $match: dateFilter.createdAt ? { createdAt: dateFilter } : {} },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]);
            break;

        case 'trainings':
            report = await Training.aggregate([
                { $match: dateFilter.createdAt ? { createdAt: dateFilter } : {} },
                {
                    $group: {
                        _id: '$category',
                        count: { $sum: 1 },
                        totalEnrollments: { $sum: '$enrollmentCount' }
                    }
                }
            ]);
            break;

        default:
            // General overview
            report = {
                users: await User.countDocuments(dateFilter.createdAt ? { createdAt: dateFilter } : {}),
                jobs: await Job.countDocuments(dateFilter.createdAt ? { createdAt: dateFilter } : {}),
                applications: await Application.countDocuments(dateFilter.createdAt ? { createdAt: dateFilter } : {}),
                trainings: await Training.countDocuments(dateFilter.createdAt ? { createdAt: dateFilter } : {})
            };
    }

    res.status(200).json(
        new ApiResponse(200, report, 'Report generated successfully')
    );
});

// @desc    Get System Settings
// @route   GET /api/v1/admin/settings
// @access  Private (Admin)
export const getSettings = asyncHandler(async (req, res) => {
    // You can store these in a Settings model or env
    const settings = {
        siteName: 'Utkarsh Ujjain',
        siteDescription: 'Job Portal for Ujjain',
        contactEmail: process.env.SMTP_USER,
        maxFileSize: '3MB',
        allowedFileTypes: ['pdf', 'doc', 'docx'],
        otpExpireMinutes: process.env.OTP_EXPIRE_MINUTES,
        jwtExpire: process.env.JWT_EXPIRE
    };

    res.status(200).json(
        new ApiResponse(200, settings, 'Settings fetched successfully')
    );
});

// @desc    Admin Update Institution
// @route   PUT /api/v1/admin/institutions/:id
// @access  Private (Admin)
export const adminUpdateInstitution = asyncHandler(async (req, res) => {
    const { organizationName, institutionType, address, website, about, contactPerson, officePhone, officeMobile } = req.body;

    let institution = await Institution.findById(req.params.id);

    if (!institution) {
        throw new ApiError(404, 'Institution not found');
    }

    if (organizationName) institution.organizationName = organizationName;
    if (institutionType) institution.institutionType = institutionType;

    if (address) {
        institution.address = {
            ...institution.address,
            ...address
        };
    }

    if (contactPerson) {
        institution.contactPerson = {
            ...institution.contactPerson,
            ...contactPerson
        };
    }

    if (website !== undefined) institution.website = website;
    if (about !== undefined) institution.about = about;
    if (officePhone !== undefined) institution.officePhone = officePhone;
    if (officeMobile !== undefined) institution.officeMobile = officeMobile;

    await institution.save();

    res.status(200).json(
        new ApiResponse(200, institution, 'Institution updated successfully')
    );
});

// ================================================================
//  VENDOR MANAGEMENT
// ================================================================

// @desc    Get All Pending Vendors
// @route   GET /api/v1/admin/vendors/pending
// @access  Private (Admin)
export const getPendingVendors = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search } = req.query;

    let filter = { verificationStatus: 'pending' };

    if (search) {
        filter.$or = [
            { businessName: { $regex: search, $options: 'i' } },
            { businessType: { $regex: search, $options: 'i' } }
        ];
    }

    const vendors = await Vendor.find(filter)
        .populate('user', 'email phone')
        .populate('institution', 'organizationName')
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 });

    const total = await Vendor.countDocuments(filter);

    res.status(200).json(
        new ApiResponse(
            200,
            {
                vendors,
                pagination: paginateResults(page, limit, total)
            },
            'Pending vendors fetched successfully'
        )
    );
});

// @desc    Get All Verified Vendors
// @route   GET /api/v1/admin/vendors/verified
// @access  Private (Admin)
export const getVerifiedVendors = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search } = req.query;

    let filter = { verificationStatus: 'verified' };

    if (search) {
        filter.$or = [
            { businessName: { $regex: search, $options: 'i' } },
            { businessType: { $regex: search, $options: 'i' } }
        ];
    }

    const vendors = await Vendor.find(filter)
        .populate('user', 'email phone')
        .populate('institution', 'organizationName')
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 });

    const total = await Vendor.countDocuments(filter);

    res.status(200).json(
        new ApiResponse(
            200,
            {
                vendors,
                pagination: paginateResults(page, limit, total)
            },
            'Verified vendors fetched successfully'
        )
    );
});

// @desc    Get All Vendors (Admin)
// @route   GET /api/v1/admin/vendors
// @access  Private (Admin)
export const getAllVendorsAdmin = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search } = req.query;

    let filter = {};

    if (search) {
        filter.$or = [
            { businessName: { $regex: search, $options: 'i' } },
            { businessType: { $regex: search, $options: 'i' } }
        ];
    }

    const vendors = await Vendor.find(filter)
        .populate('user', 'email phone')
        .populate('institution', 'organizationName')
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 });

    const total = await Vendor.countDocuments(filter);

    res.status(200).json(
        new ApiResponse(
            200,
            {
                vendors,
                pagination: paginateResults(page, limit, total)
            },
            'All vendors fetched successfully'
        )
    );
});

// @desc    Get Vendor Details (Admin)
// @route   GET /api/v1/admin/vendors/:id
// @access  Private (Admin)
export const getVendorDetailsAdmin = asyncHandler(async (req, res) => {
    const vendor = await Vendor.findById(req.params.id)
        .populate('user', 'email phone firstName lastName')
        .populate('institution', 'organizationName')
        .populate('services');

    if (!vendor) {
        throw new ApiError(404, 'Vendor not found');
    }

    res.status(200).json(
        new ApiResponse(200, { vendor }, 'Vendor details fetched successfully')
    );
});

// @desc    Verify Vendor
// @route   PATCH /api/v1/admin/vendors/:id/verify
// @access  Private (Admin)
export const verifyVendor = asyncHandler(async (req, res) => {
    let vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
        throw new ApiError(404, 'Vendor not found');
    }

    vendor.verificationStatus = 'verified';
    vendor.isVerified = true;
    vendor.verifiedAt = new Date();
    vendor.verifiedBy = req.user._id;

    await vendor.save();

    res.status(200).json(
        new ApiResponse(200, { vendor }, 'Vendor verified successfully')
    );
});

// @desc    Reject Vendor
// @route   PATCH /api/v1/admin/vendors/:id/reject
// @access  Private (Admin)
export const rejectVendor = asyncHandler(async (req, res) => {
    const { reason } = req.body;

    let vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
        throw new ApiError(404, 'Vendor not found');
    }

    vendor.verificationStatus = 'rejected';
    vendor.rejectionReason = reason || 'No reason provided';
    vendor.rejectedAt = new Date();
    vendor.rejectedBy = req.user._id;

    await vendor.save();

    res.status(200).json(
        new ApiResponse(200, { vendor }, 'Vendor rejected successfully')
    );
});

// @desc    Update Vendor (Admin)
// @route   PUT /api/v1/admin/vendors/:id
// @access  Private (Admin)
export const adminUpdateVendor = asyncHandler(async (req, res) => {
    const { businessName, businessType, businessDescription, website, establishedYear, annualTurnover, employeeCount } = req.body;

    let vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
        throw new ApiError(404, 'Vendor not found');
    }

    if (businessName) vendor.businessName = businessName;
    if (businessType) vendor.businessType = businessType;
    if (businessDescription) vendor.businessDescription = businessDescription;
    if (website) vendor.website = website;
    if (establishedYear) vendor.establishedYear = establishedYear;
    if (annualTurnover) vendor.annualTurnover = annualTurnover;
    if (employeeCount) vendor.employeeCount = employeeCount;

    await vendor.save();

    res.status(200).json(
        new ApiResponse(200, { vendor }, 'Vendor updated successfully')
    );
});

// @desc    Delete Vendor (Admin)
// @route   DELETE /api/v1/admin/vendors/:id
// @access  Private (Admin)
export const deleteVendorAdmin = asyncHandler(async (req, res) => {
    const vendor = await Vendor.findByIdAndDelete(req.params.id);

    if (!vendor) {
        throw new ApiError(404, 'Vendor not found');
    }

    // Clean up related data
    await ServiceRequest.deleteMany({ vendor: req.params.id });

    res.status(200).json(
        new ApiResponse(200, {}, 'Vendor deleted successfully')
    );
});

// @desc    Toggle Vendor Active Status (Admin)
// @route   PATCH /api/v1/admin/vendors/:id/toggle-status
// @access  Private (Admin)
export const toggleVendorStatus = asyncHandler(async (req, res) => {
    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
        throw new ApiError(404, 'Vendor not found');
    }

    vendor.isActive = !vendor.isActive;
    await vendor.save();

    res.status(200).json(
        new ApiResponse(
            200,
            { vendor, status: vendor.isActive ? 'active' : 'inactive' },
            `Vendor ${vendor.isActive ? 'activated' : 'deactivated'} successfully`
        )
    );
});

