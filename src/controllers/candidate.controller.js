import Candidate from '../models/candidate.model.js';
import User from '../models/user.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import cloudinaryService from '../services/cloudinary.service.js';
import { calculateExperience, paginateResults } from '../utils/helpers.js';

// @desc    Get Candidate Profile
// @route   GET /api/v1/candidates/profile
// @access  Private (Candidate)
export const getProfile = asyncHandler(async (req, res) => {
    const candidate = await Candidate.findOne({ user: req.user._id })
        .populate('user', 'name email mobile avatar');

    if (!candidate) {
        throw new ApiError(404, 'Candidate profile not found');
    }

    res.status(200).json(
        new ApiResponse(200, candidate, 'Profile fetched successfully')
    );
});

// @desc    Update Candidate Profile
// @route   PUT /api/v1/candidates/profile
// @access  Private (Candidate)
export const updateProfile = asyncHandler(async (req, res) => {
    let candidate = await Candidate.findOne({ user: req.user._id });

    if (!candidate) {
        throw new ApiError(404, 'Candidate profile not found');
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
        if (req.body[key] !== undefined) {
            candidate[key] = req.body[key];
        }
    });

    // Calculate profile completion
    candidate.calculateProfileCompletion();

    await candidate.save();

    res.status(200).json(
        new ApiResponse(200, candidate, 'Profile updated successfully')
    );
});

// @desc    Add Education
// @route   POST /api/v1/candidates/education
// @access  Private (Candidate)
export const addEducation = asyncHandler(async (req, res) => {
    const candidate = await Candidate.findOne({ user: req.user._id });

    if (!candidate) {
        throw new ApiError(404, 'Candidate profile not found');
    }

    candidate.education.push(req.body);
    candidate.calculateProfileCompletion();
    await candidate.save();

    res.status(201).json(
        new ApiResponse(201, candidate.education, 'Education added successfully')
    );
});

// @desc    Update Education
// @route   PUT /api/v1/candidates/education/:eduId
// @access  Private (Candidate)
export const updateEducation = asyncHandler(async (req, res) => {
    const candidate = await Candidate.findOne({ user: req.user._id });

    if (!candidate) {
        throw new ApiError(404, 'Candidate profile not found');
    }

    const education = candidate.education.id(req.params.eduId);
    if (!education) {
        throw new ApiError(404, 'Education not found');
    }

    Object.keys(req.body).forEach(key => {
        education[key] = req.body[key];
    });

    await candidate.save();

    res.status(200).json(
        new ApiResponse(200, candidate.education, 'Education updated successfully')
    );
});

// @desc    Delete Education
// @route   DELETE /api/v1/candidates/education/:eduId
// @access  Private (Candidate)
export const deleteEducation = asyncHandler(async (req, res) => {
    const candidate = await Candidate.findOne({ user: req.user._id });

    if (!candidate) {
        throw new ApiError(404, 'Candidate profile not found');
    }

    candidate.education.pull(req.params.eduId);
    candidate.calculateProfileCompletion();
    await candidate.save();

    res.status(200).json(
        new ApiResponse(200, null, 'Education deleted successfully')
    );
});

// @desc    Add Experience
// @route   POST /api/v1/candidates/experience
// @access  Private (Candidate)
export const addExperience = asyncHandler(async (req, res) => {
    const candidate = await Candidate.findOne({ user: req.user._id });

    if (!candidate) {
        throw new ApiError(404, 'Candidate profile not found');
    }

    candidate.experience.push(req.body);
    
    // Update total experience
    candidate.totalExperience = calculateExperience(candidate.experience);
    
    // Update candidate type if adding experience
    if (candidate.experience.length > 0) {
        candidate.candidateType = 'experienced';
    }

    candidate.calculateProfileCompletion();
    await candidate.save();

    res.status(201).json(
        new ApiResponse(201, candidate.experience, 'Experience added successfully')
    );
});

// @desc    Update Experience
// @route   PUT /api/v1/candidates/experience/:expId
// @access  Private (Candidate)
export const updateExperience = asyncHandler(async (req, res) => {
    const candidate = await Candidate.findOne({ user: req.user._id });

    if (!candidate) {
        throw new ApiError(404, 'Candidate profile not found');
    }

    const experience = candidate.experience.id(req.params.expId);
    if (!experience) {
        throw new ApiError(404, 'Experience not found');
    }

    Object.keys(req.body).forEach(key => {
        experience[key] = req.body[key];
    });

    // Recalculate total experience
    candidate.totalExperience = calculateExperience(candidate.experience);
    await candidate.save();

    res.status(200).json(
        new ApiResponse(200, candidate.experience, 'Experience updated successfully')
    );
});

// @desc    Delete Experience
// @route   DELETE /api/v1/candidates/experience/:expId
// @access  Private (Candidate)
export const deleteExperience = asyncHandler(async (req, res) => {
    const candidate = await Candidate.findOne({ user: req.user._id });

    if (!candidate) {
        throw new ApiError(404, 'Candidate profile not found');
    }

    candidate.experience.pull(req.params.expId);
    
    // Recalculate total experience
    candidate.totalExperience = calculateExperience(candidate.experience);
    
    // Update candidate type if no experience
    if (candidate.experience.length === 0) {
        candidate.candidateType = 'fresher';
    }

    candidate.calculateProfileCompletion();
    await candidate.save();

    res.status(200).json(
        new ApiResponse(200, null, 'Experience deleted successfully')
    );
});

// @desc    Update Skills
// @route   PUT /api/v1/candidates/skills
// @access  Private (Candidate)
export const updateSkills = asyncHandler(async (req, res) => {
    const { skills } = req.body;

    const candidate = await Candidate.findOneAndUpdate(
        { user: req.user._id },
        { skills },
        { new: true, runValidators: true }
    );

    if (!candidate) {
        throw new ApiError(404, 'Candidate profile not found');
    }

    candidate.calculateProfileCompletion();
    await candidate.save();

    res.status(200).json(
        new ApiResponse(200, candidate.skills, 'Skills updated successfully')
    );
});

// @desc    Upload Resume
// @route   POST /api/v1/candidates/resume
// @access  Private (Candidate)
export const uploadResume = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, 'Please upload a resume file');
    }

    const candidate = await Candidate.findOne({ user: req.user._id });

    if (!candidate) {
        throw new ApiError(404, 'Candidate profile not found');
    }

    // Delete old resume if exists
    if (candidate.resume?.public_id) {
        await cloudinaryService.deleteFile(candidate.resume.public_id, 'raw');
    }

    // Upload new resume
    const result = await cloudinaryService.uploadResume(req.file.path, req.user._id);

    candidate.resume = {
        public_id: result.public_id,
        url: result.url,
        filename: req.file.originalname,
        uploadedAt: new Date()
    };

    candidate.calculateProfileCompletion();
    await candidate.save();

    res.status(200).json(
        new ApiResponse(200, candidate.resume, 'Resume uploaded successfully')
    );
});

// @desc    Delete Resume
// @route   DELETE /api/v1/candidates/resume
// @access  Private (Candidate)
export const deleteResume = asyncHandler(async (req, res) => {
    const candidate = await Candidate.findOne({ user: req.user._id });

    if (!candidate) {
        throw new ApiError(404, 'Candidate profile not found');
    }

    if (candidate.resume?.public_id) {
        await cloudinaryService.deleteFile(candidate.resume.public_id, 'raw');
    }

    candidate.resume = undefined;
    candidate.calculateProfileCompletion();
    await candidate.save();

    res.status(200).json(
        new ApiResponse(200, null, 'Resume deleted successfully')
    );
});

// @desc    Upload Avatar
// @route   POST /api/v1/candidates/avatar
// @access  Private (Candidate)
export const uploadAvatar = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, 'Please upload an image');
    }

    const user = await User.findById(req.user._id);

    // Delete old avatar if exists
    if (user.avatar?.public_id) {
        await cloudinaryService.deleteFile(user.avatar.public_id);
    }

    // Upload new avatar
    const result = await cloudinaryService.uploadAvatar(req.file.path, req.user._id);

    user.avatar = {
        public_id: result.public_id,
        url: result.url
    };

    await user.save();

    res.status(200).json(
        new ApiResponse(200, user.avatar, 'Avatar uploaded successfully')
    );
});

// @desc    Get Candidate by ID (Public)
// @route   GET /api/v1/candidates/:id
// @access  Public
export const getCandidateById = asyncHandler(async (req, res) => {
    const candidate = await Candidate.findById(req.params.id)
        .populate('user', 'name avatar');

    if (!candidate) {
        throw new ApiError(404, 'Candidate not found');
    }

    if (!candidate.isProfilePublic) {
        throw new ApiError(403, 'This profile is private');
    }

    res.status(200).json(
        new ApiResponse(200, candidate, 'Candidate fetched successfully')
    );
});

// @desc    Get All Candidates (for Institutions)
// @route   GET /api/v1/candidates
// @access  Private (Institution/Admin)
export const getAllCandidates = asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginateResults(req.query.page, req.query.limit);

    const filter = {
        isProfilePublic: true,
        isOpenToWork: true
    };

    // Apply filters
    if (req.query.candidateType) {
        filter.candidateType = req.query.candidateType;
    }

    if (req.query.location) {
        filter['currentAddress.city'] = { $regex: req.query.location, $options: 'i' };
    }

    if (req.query.skills) {
        const skillsArray = Array.isArray(req.query.skills) 
            ? req.query.skills 
            : req.query.skills.split(',');
        filter['skills.name'] = { $in: skillsArray.map(s => new RegExp(s, 'i')) };
    }

    const candidates = await Candidate.find(filter)
        .populate('user', 'name avatar')
        .select('headline skills currentAddress totalExperience candidateType profileCompletion')
        .sort({ profileCompletion: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await Candidate.countDocuments(filter);

    res.status(200).json(
        new ApiResponse(200, {
            candidates,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        }, 'Candidates fetched successfully')
    );
});