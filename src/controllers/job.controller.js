import Job from '../models/job.model.js';
import Application from '../models/application.model.js';
import Institution from '../models/institution.model.js';
import Candidate from '../models/candidate.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import emailService from '../services/email.service.js';
import { paginateResults } from '../utils/helpers.js';

// @desc    Create Job
// @route   POST /api/v1/jobs
// @access  Private (Institution/Admin)
export const createJob = asyncHandler(async (req, res) => {
    let institution;

    if (req.user.role === 'institution') {
        institution = await Institution.findOne({ user: req.user._id });
        if (!institution) {
            throw new ApiError(404, 'Institution profile not found');
        }
        if (!institution.isVerified) {
            throw new ApiError(403, 'Your institution must be verified to post jobs');
        }
    } else if (req.user.role === 'admin') {
        if (req.body.institution) {
            institution = await Institution.findById(req.body.institution);
            if (!institution) {
                throw new ApiError(404, 'Institution not found');
            }
        } else {
            // Optional: If you want to allow admins to post without explicit institution ID 
            // by finding a default one or creating a system one. 
            // For now, we'll enforce providing an ID or require the admin to be linked to an institution.
            // But to make it easier for testing, let's see if we can just use the body's institution if present.
            throw new ApiError(400, "Admin must provide 'institution' ID to create a job");
        }
    }

    const job = await Job.create({
        ...req.body,
        institution: institution._id,
        postedBy: req.user._id
    });

    // Update institution job count
    institution.totalJobsPosted += 1;
    await institution.save();

    res.status(201).json(
        new ApiResponse(201, job, 'Job created successfully')
    );
});

// @desc    Get All Jobs (Public)
// @route   GET /api/v1/jobs
// @access  Public
export const getAllJobs = asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginateResults(req.query.page, req.query.limit);

    const filter = {
        status: 'active',
        isApproved: true
    };

    // Search by keyword
    if (req.query.q) {
        filter.$or = [
            { title: { $regex: req.query.q, $options: 'i' } },
            { 'skills.name': { $regex: req.query.q, $options: 'i' } }
        ];
    }

    // Filter by location
    if (req.query.location) {
        filter['location.city'] = { $regex: req.query.location, $options: 'i' };
    }

    // Filter by job type
    if (req.query.jobType) {
        filter.jobType = req.query.jobType;
    }

    // Filter by experience level
    if (req.query.experienceLevel) {
        filter.experienceLevel = req.query.experienceLevel;
    }

    // Filter by experience range
    if (req.query.experienceMin || req.query.experienceMax) {
        filter.experience = {};
        if (req.query.experienceMin) {
            filter['experience.min'] = { $lte: parseInt(req.query.experienceMin) };
        }
        if (req.query.experienceMax) {
            filter['experience.max'] = { $gte: parseInt(req.query.experienceMax) };
        }
    }

    // Filter by salary
    if (req.query.salaryMin || req.query.salaryMax) {
        if (req.query.salaryMin) {
            filter['salary.min'] = { $gte: parseInt(req.query.salaryMin) };
        }
        if (req.query.salaryMax) {
            filter['salary.max'] = { $lte: parseInt(req.query.salaryMax) };
        }
    }

    // Filter by posted date
    if (req.query.postedWithin) {
        const dateMap = {
            '24h': 1,
            '7d': 7,
            '30d': 30
        };
        const days = dateMap[req.query.postedWithin];
        if (days) {
            filter.createdAt = {
                $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
            };
        }
    }

    // Sort options
    let sortOption = { createdAt: -1 };
    if (req.query.sortBy === 'salary') {
        sortOption = { 'salary.min': req.query.sortOrder === 'asc' ? 1 : -1 };
    } else if (req.query.sortBy === 'applicants') {
        sortOption = { applicationsCount: -1 };
    }

    // Add featured jobs first
    sortOption = { isFeatured: -1, ...sortOption };

    const jobs = await Job.find(filter)
        .populate('institution', 'organizationName logo address')
        .select('title slug location salary jobType experienceLevel experience createdAt views applicationsCount isFeatured banner')
        .sort(sortOption)
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

// @desc    Get Job by ID/Slug
// @route   GET /api/v1/jobs/:idOrSlug
// @access  Public
export const getJob = asyncHandler(async (req, res) => {
    const { idOrSlug } = req.params;

    let job;

    // Try to find by ID first, then by slug
    if (idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
        job = await Job.findById(idOrSlug)
            .populate('institution', 'organizationName logo address about website employeeCount');
    } else {
        job = await Job.findOne({ slug: idOrSlug })
            .populate('institution', 'organizationName logo address about website employeeCount');
    }

    if (!job) {
        throw new ApiError(404, 'Job not found');
    }

    // Increment views
    job.views += 1;
    await job.save();

    // Check if user has already applied (if logged in)
    let hasApplied = false;
    if (req.user && req.user.role === 'candidate') {
        const candidate = await Candidate.findOne({ user: req.user._id });
        if (candidate) {
            const application = await Application.findOne({
                job: job._id,
                candidate: candidate._id
            });
            hasApplied = !!application;
        }
    }

    res.status(200).json(
        new ApiResponse(200, {
            job,
            hasApplied
        }, 'Job fetched successfully')
    );
});

// @desc    Update Job
// @route   PUT /api/v1/jobs/:id
// @access  Private (Institution - Owner)
export const updateJob = asyncHandler(async (req, res) => {
    let job = await Job.findById(req.params.id);

    if (!job) {
        throw new ApiError(404, 'Job not found');
    }

    // Check ownership or admin
    if (job.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        throw new ApiError(403, 'Not authorized to update this job');
    }

    // Update job
    job = await Job.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );

    res.status(200).json(
        new ApiResponse(200, job, 'Job updated successfully')
    );
});

// @desc    Delete Job
// @route   DELETE /api/v1/jobs/:id
// @access  Private (Institution - Owner/Admin)
export const deleteJob = asyncHandler(async (req, res) => {
    const job = await Job.findById(req.params.id);

    if (!job) {
        throw new ApiError(404, 'Job not found');
    }

    // Check ownership or admin
    if (job.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        throw new ApiError(403, 'Not authorized to delete this job');
    }

    await Job.findByIdAndDelete(req.params.id);

    // Update institution job count
    const institution = await Institution.findById(job.institution);
    if (institution) {
        institution.totalJobsPosted = Math.max(0, institution.totalJobsPosted - 1);
        await institution.save();
    }

    res.status(200).json(
        new ApiResponse(200, null, 'Job deleted successfully')
    );
});

// @desc    Get Institution's Jobs
// @route   GET /api/v1/jobs/institution/my-jobs
// @access  Private (Institution)
export const getMyJobs = asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginateResults(req.query.page, req.query.limit);

    const institution = await Institution.findOne({ user: req.user._id });

    if (!institution) {
        throw new ApiError(404, 'Institution profile not found');
    }

    const filter = { institution: institution._id };

    if (req.query.status) {
        filter.status = req.query.status;
    }

    const jobs = await Job.find(filter)
        .select('title status views applicationsCount createdAt applicationDeadline banner experience salary location jobType vacancies')
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

// @desc    Change Job Status
// @route   PATCH /api/v1/jobs/:id/status
// @access  Private (Institution - Owner)
export const changeJobStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;

    const job = await Job.findById(req.params.id);

    if (!job) {
        throw new ApiError(404, 'Job not found');
    }

    if (job.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        throw new ApiError(403, 'Not authorized');
    }

    job.status = status;
    await job.save();

    res.status(200).json(
        new ApiResponse(200, job, 'Job status updated successfully')
    );
});

// @desc    Get Similar Jobs
// @route   GET /api/v1/jobs/:id/similar
// @access  Public
export const getSimilarJobs = asyncHandler(async (req, res) => {
    const job = await Job.findById(req.params.id);

    if (!job) {
        throw new ApiError(404, 'Job not found');
    }

    const skills = job.skills.map(s => s.name);

    const similarJobs = await Job.find({
        _id: { $ne: job._id },
        status: 'active',
        isApproved: true,
        $or: [
            { 'skills.name': { $in: skills } },
            { 'location.city': job.location.city },
            { experienceLevel: job.experienceLevel }
        ]
    })
        .populate('institution', 'organizationName logo')
        .select('title slug location salary jobType createdAt')
        .limit(5);

    res.status(200).json(
        new ApiResponse(200, similarJobs, 'Similar jobs fetched')
    );
});

// @desc    Upload Job Banner
// @route   POST /api/v1/jobs/:id/banner
// @access  Private (Institution - Owner)
export const uploadBanner = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, 'Please upload an image');
    }

    const job = await Job.findById(req.params.id);

    if (!job) {
        throw new ApiError(404, 'Job not found');
    }

    // Check ownership or admin
    if (job.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        throw new ApiError(403, 'Not authorized to update this job');
    }

    // Import cloudinary service
    const cloudinaryService = (await import('../services/cloudinary.service.js')).default;

    // Delete old banner if exists
    if (job.banner?.public_id) {
        await cloudinaryService.deleteFile(job.banner.public_id);
    }

    // Upload new banner
    const result = await cloudinaryService.uploadBanner(req.file.path, req.params.id, 'job');

    job.banner = {
        public_id: result.public_id,
        url: result.url
    };

    await job.save();

    res.status(200).json(
        new ApiResponse(200, job.banner, 'Banner uploaded successfully')
    );
});