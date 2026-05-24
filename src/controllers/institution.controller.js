import Institution from '../models/institution.model.js';
import User from '../models/user.model.js';
import Job from '../models/job.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import cloudinaryService from '../services/cloudinary.service.js';
import { paginateResults } from '../utils/helpers.js';
import Application from '../models/application.model.js';


export const getProfile = asyncHandler(async (req, res) => {
    const institution = await Institution.findOne({ user: req.user._id })
        .populate('user', 'name email mobile avatar');

    if (!institution) {
        throw new ApiError(404, 'Institution profile not found');
    }

    res.status(200).json(
        new ApiResponse(200, institution, 'Profile fetched successfully')
    );
});


export const updateProfile = asyncHandler(async (req, res) => {
    let institution = await Institution.findOne({ user: req.user._id });

    if (!institution) {
        throw new ApiError(404, 'Institution profile not found');
    }

    // Update allowed fields
    const allowedFields = [
        'organizationName', 'contactPerson', 'address', 'officePhone',
        'officeMobile', 'website', 'email', 'about', 'establishedYear',
        'employeeCount', 'industryType', 'offeringIndustries', 'requiredSkills',
        'services', 'products', 'socialLinks', 'registrationDetails'
    ];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            institution[field] = req.body[field];
        }
    });

    await institution.save();

    res.status(200).json(
        new ApiResponse(200, institution, 'Profile updated successfully')
    );
});


export const uploadLogo = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, 'Please upload an image');
    }

    const institution = await Institution.findOne({ user: req.user._id });

    if (!institution) {
        throw new ApiError(404, 'Institution profile not found');
    }

    // Delete old logo
    if (institution.logo?.public_id) {
        await cloudinaryService.deleteFile(institution.logo.public_id);
    }

    // Upload new logo
    const result = await cloudinaryService.uploadLogo(req.file.path, institution._id);

    institution.logo = {
        public_id: result.public_id,
        url: result.url
    };

    await institution.save();

    res.status(200).json(
        new ApiResponse(200, institution.logo, 'Logo uploaded successfully')
    );
});


export const uploadCoverImage = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, 'Please upload an image');
    }

    const institution = await Institution.findOne({ user: req.user._id });

    if (!institution) {
        throw new ApiError(404, 'Institution profile not found');
    }

    // Delete old cover
    if (institution.coverImage?.public_id) {
        await cloudinaryService.deleteFile(institution.coverImage.public_id);
    }

    // Upload new cover
    const result = await cloudinaryService.uploadBanner(req.file.path, institution._id, 'institution');

    institution.coverImage = {
        public_id: result.public_id,
        url: result.url
    };

    await institution.save();

    res.status(200).json(
        new ApiResponse(200, institution.coverImage, 'Cover image uploaded successfully')
    );
});


export const uploadGalleryImages = asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
        throw new ApiError(400, 'Please upload images');
    }

    const institution = await Institution.findOne({ user: req.user._id });

    if (!institution) {
        throw new ApiError(404, 'Institution profile not found');
    }

    const uploadPromises = req.files.map(file => 
        cloudinaryService.uploadGalleryImage(file.path, institution._id)
    );

    const results = await Promise.all(uploadPromises);

    const newImages = results.map((result, index) => ({
        public_id: result.public_id,
        url: result.url,
        caption: req.body.captions?.[index] || ''
    }));

    institution.gallery.push(...newImages);
    await institution.save();

    res.status(200).json(
        new ApiResponse(200, institution.gallery, 'Images uploaded successfully')
    );
});

// @desc    Delete Gallery Image
// @route   DELETE /api/v1/institutions/gallery/:imageId
// @access  Private (Institution)
export const deleteGalleryImage = asyncHandler(async (req, res) => {
    const institution = await Institution.findOne({ user: req.user._id });

    if (!institution) {
        throw new ApiError(404, 'Institution profile not found');
    }

    const image = institution.gallery.id(req.params.imageId);
    if (!image) {
        throw new ApiError(404, 'Image not found');
    }

    // Delete from Cloudinary
    if (image.public_id) {
        await cloudinaryService.deleteFile(image.public_id);
    }

    institution.gallery.pull(req.params.imageId);
    await institution.save();

    res.status(200).json(
        new ApiResponse(200, null, 'Image deleted successfully')
    );
});

// @desc    Upload Document
// @route   POST /api/v1/institutions/documents
// @access  Private (Institution)
export const uploadDocument = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, 'Please upload a document');
    }

    const institution = await Institution.findOne({ user: req.user._id });

    if (!institution) {
        throw new ApiError(404, 'Institution profile not found');
    }

    // FIX: Convert IDs to string and clean name
    const result = await cloudinaryService.uploadDocument(
        req.file.path,
        institution._id.toString(),
        (req.body.name || 'document').replace(/\s+/g, '_')
    );

    // Only push required fields
    const docData = {
        name: req.body.name || req.file.originalname,
        type: req.body.type || 'other',
        public_id: result.public_id,
        url: result.url
    };

    institution.documents.push(docData);
    await institution.save();

    res.status(200).json(
        new ApiResponse(200, docData, 'Document uploaded successfully')
    );
});
// @desc    Get Institution by ID
// @route   GET /api/v1/institutions/:id
// @access  Public
export const getInstitutionById = asyncHandler(async (req, res) => {
    const institution = await Institution.findById(req.params.id)
        .populate('user', 'name avatar');

    if (!institution) {
        throw new ApiError(404, 'Institution not found');
    }

    // Get active jobs count
    const activeJobsCount = await Job.countDocuments({
        institution: institution._id,
        status: 'active',
        isApproved: true
    });

    res.status(200).json(
        new ApiResponse(200, {
            institution,
            activeJobsCount
        }, 'Institution fetched successfully')
    );
});

// @desc    Get All Institutions
// @route   GET /api/v1/institutions
// @access  Public
export const getAllInstitutions = asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginateResults(req.query.page, req.query.limit);

    const filter = {
        isActive: true,
        isVerified: true
    };

    // Filter by type
    if (req.query.type) {
        filter.institutionType = req.query.type;
    }

    // Filter by location
    if (req.query.location) {
        filter['address.city'] = { $regex: req.query.location, $options: 'i' };
    }

    // Search
    if (req.query.q) {
        filter.$or = [
            { organizationName: { $regex: req.query.q, $options: 'i' } },
            { industryType: { $regex: req.query.q, $options: 'i' } }
        ];
    }

    const institutions = await Institution.find(filter)
        .select('organizationName institutionType logo address about totalJobsPosted rating')
        .sort({ isFeatured: -1, rating: -1 })
        .skip(skip)
        .limit(limit);

    const total = await Institution.countDocuments(filter);

    res.status(200).json(
        new ApiResponse(200, {
            institutions,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        }, 'Institutions fetched successfully')
    );
});

// @desc    Get Institution's Public Jobs
// @route   GET /api/v1/institutions/:id/jobs
// @access  Public
export const getInstitutionJobs = asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginateResults(req.query.page, req.query.limit);

    const jobs = await Job.find({
        institution: req.params.id,
        status: 'active',
        isApproved: true
    })
    .select('title slug location salary jobType experienceLevel createdAt')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    const total = await Job.countDocuments({
        institution: req.params.id,
        status: 'active',
        isApproved: true
    });

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

// @desc    Get Dashboard Stats (Institution)
// @route   GET /api/v1/institutions/dashboard/stats
// @access  Private (Institution)
export const getDashboardStats = asyncHandler(async (req, res) => {
    const institution = await Institution.findOne({ user: req.user._id });

    if (!institution) {
        throw new ApiError(404, 'Institution profile not found');
    }

    // Get various counts
    const [
        activeJobs,
        totalApplications,
        pendingApplications,
        shortlistedCandidates,
        recentApplications
    ] = await Promise.all([
        Job.countDocuments({ institution: institution._id, status: 'active' }),
        Job.aggregate([
            { $match: { institution: institution._id } },
            { $group: { _id: null, total: { $sum: '$applicationsCount' } } }
        ]),
        Application.countDocuments({ institution: institution._id, status: 'applied' }),
        Application.countDocuments({ institution: institution._id, status: 'shortlisted' }),
        Application.find({ institution: institution._id })
            .populate({
                path: 'job',
                select: 'title'
            })
            .populate({
                path: 'candidate',
                populate: { path: 'user', select: 'name avatar' }
            })
            .select('status createdAt')
            .sort({ createdAt: -1 })
            .limit(5)
    ]);

    res.status(200).json(
        new ApiResponse(200, {
            stats: {
                totalJobsPosted: institution.totalJobsPosted,
                activeJobs,
                totalApplications: totalApplications[0]?.total || 0,
                pendingApplications,
                shortlistedCandidates,
                totalHires: institution.totalHires
            },
            recentApplications
        }, 'Dashboard stats fetched successfully')
    );
});