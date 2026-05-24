import Training from '../models/training.model.js';
import TrainingEnrollment from '../models/trainingEnrollment.model.js';
import Institution from '../models/institution.model.js';
import Candidate from '../models/candidate.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import cloudinaryService from '../services/cloudinary.service.js';
import emailService from '../services/email.service.js';
import { paginateResults } from '../utils/helpers.js';

// @desc    Create Training
// @route   POST /api/v1/trainings
// @access  Private (Institution - Training Institute)
export const createTraining = asyncHandler(async (req, res) => {
    let institution;

    if (req.user.role === 'admin') {
        if (!req.body.institution) {
            throw new ApiError(400, "Admin must provide 'institution' ID");
        }
        institution = await Institution.findById(req.body.institution);
    } else {
        institution = await Institution.findOne({ user: req.user._id });
    }

    if (!institution) {
        throw new ApiError(404, 'Institution profile not found');
    }

    if (!['training_institute', 'university'].includes(institution.institutionType)) {
        throw new ApiError(403, 'Only training institutes and universities can create trainings');
    }

    const training = await Training.create({
        ...req.body,
        institution: institution._id,
        createdBy: req.user._id,
        availableSeats: req.body.totalSeats
    });

    res.status(201).json(
        new ApiResponse(201, training, 'Training created successfully')
    );
});

// @desc    Get All Trainings
// @route   GET /api/v1/trainings
// @access  Public
// @desc    Get All Trainings (Admin)
// @route   GET /api/v1/admin/trainings
// @access  Private (Admin)
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

    if (req.query.category) {
        filter.category = req.query.category;
    }

    if (req.query.q) {
        filter.$or = [
            { title: { $regex: req.query.q, $options: 'i' } }
        ];
    }

    //  .select() HATAYA - ab sab fields aayengi (banner bhi)
    const trainings = await Training.find(filter)
        .populate('institution', 'organizationName logo')
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

// @desc    Get Training by ID/Slug
// @route   GET /api/v1/trainings/:idOrSlug
// @access  Public
export const getTraining = asyncHandler(async (req, res) => {
    const { idOrSlug } = req.params;

    let training;

    if (idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
        training = await Training.findById(idOrSlug)
            .populate('institution', 'organizationName logo address about website');
    } else {
        training = await Training.findOne({ slug: idOrSlug })
            .populate('institution', 'organizationName logo address about website');
    }

    if (!training) {
        throw new ApiError(404, 'Training not found');
    }

    // Check if user is enrolled
    let isEnrolled = false;
    if (req.user && req.user.role === 'candidate') {
        const candidate = await Candidate.findOne({ user: req.user._id });
        if (candidate) {
            const enrollment = await TrainingEnrollment.findOne({
                training: training._id,
                candidate: candidate._id
            });
            isEnrolled = !!enrollment;
        }
    }

    res.status(200).json(
        new ApiResponse(200, { training, isEnrolled }, 'Training fetched successfully')
    );
});

// @desc    Update Training
// @route   PUT /api/v1/trainings/:id
// @access  Private (Institution - Owner)
export const updateTraining = asyncHandler(async (req, res) => {
    let training = await Training.findById(req.params.id);

    if (!training) {
        throw new ApiError(404, 'Training not found');
    }

    if (training.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        throw new ApiError(403, 'Not authorized');
    }

    training = await Training.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );

    res.status(200).json(
        new ApiResponse(200, training, 'Training updated successfully')
    );
});

// @desc    Delete Training
// @route   DELETE /api/v1/trainings/:id
// @access  Private (Institution - Owner/Admin)
export const deleteTraining = asyncHandler(async (req, res) => {
    const training = await Training.findById(req.params.id);

    if (!training) {
        throw new ApiError(404, 'Training not found');
    }

    if (training.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        throw new ApiError(403, 'Not authorized');
    }

    // Check if there are enrollments
    const enrollmentCount = await TrainingEnrollment.countDocuments({ training: req.params.id });
    if (enrollmentCount > 0) {
        throw new ApiError(400, 'Cannot delete training with active enrollments');
    }

    await Training.findByIdAndDelete(req.params.id);

    res.status(200).json(
        new ApiResponse(200, null, 'Training deleted successfully')
    );
});

// @desc    Enroll in Training
// @route   POST /api/v1/trainings/:id/enroll
// @access  Private (Candidate)
export const enrollInTraining = asyncHandler(async (req, res) => {
    const training = await Training.findById(req.params.id)
        .populate('institution');

    if (!training) {
        throw new ApiError(404, 'Training not found');
    }

    if (!['upcoming', 'ongoing'].includes(training.status)) {
        throw new ApiError(400, 'This training is not accepting enrollments');
    }

    if (training.availableSeats <= 0) {
        throw new ApiError(400, 'No seats available');
    }

    const candidate = await Candidate.findOne({ user: req.user._id });

    if (!candidate) {
        throw new ApiError(404, 'Please complete your profile first');
    }

    // Check existing enrollment
    const existingEnrollment = await TrainingEnrollment.findOne({
        training: req.params.id,
        candidate: candidate._id
    });

    if (existingEnrollment) {
        throw new ApiError(400, 'You are already enrolled in this training');
    }

    // Create enrollment
    const enrollment = await TrainingEnrollment.create({
        training: req.params.id,
        candidate: candidate._id,
        user: req.user._id,
        payment: {
            amount: training.fees.amount,
            status: training.fees.isFree ? 'waived' : 'pending'
        }
    });

    // Update available seats
    training.availableSeats -= 1;
    training.enrollmentCount += 1;
    await training.save();

    // Send confirmation email
    try {
        await emailService.sendTrainingEnrollmentConfirmation(req.user, training);
    } catch (error) {
        console.error('Failed to send enrollment email:', error.message);
    }

    res.status(201).json(
        new ApiResponse(201, enrollment, 'Enrolled successfully')
    );
});

// @desc    Get My Enrollments (Candidate)
// @route   GET /api/v1/trainings/enrollments/my
// @access  Private (Candidate)
export const getMyEnrollments = asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginateResults(req.query.page, req.query.limit);

    const candidate = await Candidate.findOne({ user: req.user._id });

    if (!candidate) {
        throw new ApiError(404, 'Candidate profile not found');
    }

    const filter = { candidate: candidate._id };

    if (req.query.status) {
        filter.status = req.query.status;
    }

    const enrollments = await TrainingEnrollment.find(filter)
        .populate({
            path: 'training',
            select: 'title category mode startDate endDate venue status',
            populate: {
                path: 'institution',
                select: 'organizationName logo'
            }
        })
        .select('status enrolledAt progress certificate')
        .sort({ enrolledAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await TrainingEnrollment.countDocuments(filter);

    res.status(200).json(
        new ApiResponse(200, {
            enrollments,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        }, 'Enrollments fetched successfully')
    );
});

// @desc    Get Training Enrollments (Institution)
// @route   GET /api/v1/trainings/:id/enrollments
// @access  Private (Institution)
export const getTrainingEnrollments = asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginateResults(req.query.page, req.query.limit);

    const training = await Training.findById(req.params.id);

    if (!training) {
        throw new ApiError(404, 'Training not found');
    }

    if (training.createdBy.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'Not authorized');
    }

    const filter = { training: req.params.id };

    if (req.query.status) {
        filter.status = req.query.status;
    }

    const enrollments = await TrainingEnrollment.find(filter)
        .populate({
            path: 'candidate',
            select: 'currentAddress',
            populate: {
                path: 'user',
                select: 'name email mobile avatar'
            }
        })
        .select('status enrolledAt progress attendance payment')
        .sort({ enrolledAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await TrainingEnrollment.countDocuments(filter);

    res.status(200).json(
        new ApiResponse(200, {
            enrollments,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        }, 'Enrollments fetched successfully')
    );
});

// @desc    Update Enrollment Status
// @route   PATCH /api/v1/trainings/enrollments/:enrollmentId/status
// @access  Private (Institution)
export const updateEnrollmentStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;

    const enrollment = await TrainingEnrollment.findById(req.params.enrollmentId)
        .populate('training');

    if (!enrollment) {
        throw new ApiError(404, 'Enrollment not found');
    }

    if (enrollment.training.createdBy.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'Not authorized');
    }

    enrollment.status = status;

    if (status === 'confirmed') {
        enrollment.confirmedAt = new Date();
    } else if (status === 'in_progress') {
        enrollment.startedAt = new Date();
    } else if (status === 'completed') {
        enrollment.completedAt = new Date();
        enrollment.progress = 100;
    }

    await enrollment.save();

    res.status(200).json(
        new ApiResponse(200, enrollment, 'Enrollment status updated successfully')
    );
});

// @desc    Issue Certificate
// @route   POST /api/v1/trainings/enrollments/:enrollmentId/certificate
// @access  Private (Institution)
export const issueCertificate = asyncHandler(async (req, res) => {
    const enrollment = await TrainingEnrollment.findById(req.params.enrollmentId)
        .populate('training')
        .populate({
            path: 'user',
            select: 'name email'
        });

    if (!enrollment) {
        throw new ApiError(404, 'Enrollment not found');
    }

    if (enrollment.training.createdBy.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'Not authorized');
    }

    if (enrollment.status !== 'completed') {
        throw new ApiError(400, 'Candidate has not completed the training');
    }

    // Upload certificate if provided
    let certificateData = {};
    if (req.file) {
        const result = await cloudinaryService.uploadDocument(
            req.file.path,
            enrollment.user._id,
            'certificate'
        );
        certificateData = {
            public_id: result.public_id,
            url: result.url
        };
    }

    enrollment.certificate = {
        isIssued: true,
        ...certificateData,
        issuedAt: new Date(),
        certificateNumber: `CERT-${enrollment.enrollmentNumber}`
    };

    await enrollment.save();

    // Send certificate email
    try {
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a56db;">🎓 Certificate Issued!</h2>
                <p>Hello ${enrollment.user.name},</p>
                <p>Congratulations on completing <strong>${enrollment.training.title}</strong>!</p>
                <p>Your certificate has been issued.</p>
                <p><strong>Certificate Number:</strong> ${enrollment.certificate.certificateNumber}</p>
                ${certificateData.url ? `<p><a href="${certificateData.url}">Download Certificate</a></p>` : ''}
                <p>Best regards,<br>Team Utkarsh Ujjain</p>
            </div>
        `;

        await emailService.sendEmail({
            to: enrollment.user.email,
            subject: `Certificate Issued: ${enrollment.training.title}`,
            html
        });
    } catch (error) {
        console.error('Failed to send certificate email:', error.message);
    }

    res.status(200).json(
        new ApiResponse(200, enrollment, 'Certificate issued successfully')
    );
});

// @desc    Upload Training Banner
// @route   POST /api/v1/trainings/:id/banner
// @access  Private (Institution)
export const uploadBanner = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, 'Please upload an image');
    }

    const training = await Training.findById(req.params.id);

    if (!training) {
        throw new ApiError(404, 'Training not found');
    }

    if (training.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        throw new ApiError(403, 'Not authorized');
    }

    // Delete old banner
    if (training.banner?.public_id) {
        await cloudinaryService.deleteFile(training.banner.public_id);
    }

    // Upload new banner
    const result = await cloudinaryService.uploadBanner(req.file.path, req.params.id, 'training');

    training.banner = {
        public_id: result.public_id,
        url: result.url
    };

    await training.save();

    res.status(200).json(
        new ApiResponse(200, training.banner, 'Banner uploaded successfully')
    );
});

// @desc    Get Institution's Trainings
// @route   GET /api/v1/trainings/institution/my-trainings
// @access  Private (Institution)
export const getMyTrainings = asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginateResults(req.query.page, req.query.limit);

    const institution = await Institution.findOne({ user: req.user._id });

    if (!institution) {
        throw new ApiError(404, 'Institution profile not found');
    }

    const filter = { institution: institution._id };

    if (req.query.status) {
        filter.status = req.query.status;
    }

    const trainings = await Training.find(filter)
        .select('title status startDate endDate enrollmentCount availableSeats totalSeats banner mode category fees certification placementAssistance isApproved slug')
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