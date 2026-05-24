import Application from '../models/application.model.js';
import Job from '../models/job.model.js';
import Candidate from '../models/candidate.model.js';
import Institution from '../models/institution.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import emailService from '../services/email.service.js';
import cloudinaryService from '../services/cloudinary.service.js';
import { paginateResults } from '../utils/helpers.js';

// @desc    Apply for Job
// @route   POST /api/v1/jobs/:jobId/apply
// @access  Private (Candidate)
export const applyForJob = asyncHandler(async (req, res) => {
    const { jobId } = req.params;

    const job = await Job.findById(jobId).populate('institution');

    if (!job) {
        throw new ApiError(404, 'Job not found');
    }

    if (job.status !== 'active') {
        throw new ApiError(400, 'This job is not accepting applications');
    }

    if (job.applicationDeadline && new Date(job.applicationDeadline) < new Date()) {
        throw new ApiError(400, 'Application deadline has passed');
    }

    const candidate = await Candidate.findOne({ user: req.user._id });

    if (!candidate) {
        throw new ApiError(404, 'Please complete your profile first');
    }

    // Check if already applied
    const existingApplication = await Application.findOne({
        job: jobId,
        candidate: candidate._id
    });

    if (existingApplication) {
        throw new ApiError(400, 'You have already applied for this job');
    }

    // Use candidate's resume if not uploaded with application
    let resume = candidate.resume;
    if (req.file) {
        const result = await cloudinaryService.uploadResume(req.file.path, req.user._id);
        resume = {
            public_id: result.public_id,
            url: result.url,
            filename: req.file.originalname
        };
    }

    // Create application
    const application = await Application.create({
        job: jobId,
        candidate: candidate._id,
        user: req.user._id,
        institution: job.institution._id,
        coverLetter: req.body.coverLetter,
        resume,
        expectedSalary: req.body.expectedSalary,
        noticePeriod: req.body.noticePeriod,
        availableFrom: req.body.availableFrom,
        screeningAnswers: req.body.screeningAnswers,
        source: req.body.source,
        referredBy: req.body.referredBy,
        statusHistory: [{
            status: 'applied',
            changedBy: req.user._id
        }]
    });

    // Update job applications count
    job.applicationsCount += 1;
    await job.save();

    // Send confirmation email
    try {
        await emailService.sendApplicationConfirmation(req.user, job);
    } catch (error) {
        console.error('Failed to send application email:', error.message);
    }

    res.status(201).json(
        new ApiResponse(201, application, 'Application submitted successfully')
    );
});

// @desc    Get My Applications (Candidate)
// @route   GET /api/v1/applications/my-applications
// @access  Private (Candidate)

export const getMyApplications = asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginateResults(req.query.page, req.query.limit);

    const candidate = await Candidate.findOne({ user: req.user._id });

    if (!candidate) {
        throw new ApiError(404, 'Candidate profile not found');
    }

    const filter = { candidate: candidate._id };

    if (req.query.status) {
        filter.status = req.query.status;
    }

    const applications = await Application.find(filter)
        .populate({
            path: 'job',
            select: 'title slug location salary jobType status banner experience',
            populate: {
                path: 'institution',
                select: 'organizationName logo'
            }
        })
        .select('status createdAt statusHistory')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await Application.countDocuments(filter);

    res.status(200).json(
        new ApiResponse(200, {
            applications,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        }, 'Applications fetched successfully')
    );
});

// @desc    Get Application Details
// @route   GET /api/v1/applications/:id
// @access  Private
export const getApplication = asyncHandler(async (req, res) => {
    const application = await Application.findById(req.params.id)
        .populate({
            path: 'job',
            select: 'title description location salary institution banner experience jobType',
            populate: {
                path: 'institution',
                select: 'organizationName logo'
            }
        })
        .populate({
            path: 'candidate',
            select: 'headline skills totalExperience currentAddress',
            populate: {
                path: 'user',
                select: 'name email mobile avatar'
            }
        });

    if (!application) {
        throw new ApiError(404, 'Application not found');
    }

    // Check authorization
    const isCandidate = application.user.toString() === req.user._id.toString();
    const isInstitution = application.institution.toString() === (await Institution.findOne({ user: req.user._id }))?._id?.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isCandidate && !isInstitution && !isAdmin) {
        throw new ApiError(403, 'Not authorized to view this application');
    }

    // Mark as viewed if institution is viewing
    if (isInstitution && application.status === 'applied') {
        application.status = 'viewed';
        application.statusHistory.push({
            status: 'viewed',
            changedBy: req.user._id
        });
        await application.save();
    }

    res.status(200).json(
        new ApiResponse(200, application, 'Application fetched successfully')
    );
});

// @desc    Get Job Applications (Institution)
// @route   GET /api/v1/jobs/:jobId/applications
// @access  Private (Institution)
// @desc    Get Job Applications (Institution)
// @route   GET /api/v1/jobs/:jobId/applications
// @access  Private (Institution)
export const getJobApplications = asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginateResults(req.query.page, req.query.limit);

    const job = await Job.findById(req.params.jobId);

    if (!job) {
        throw new ApiError(404, 'Job not found');
    }

    // Check ownership
    const institution = await Institution.findOne({ user: req.user._id });
    if (!institution || job.institution.toString() !== institution._id.toString()) {
        throw new ApiError(403, 'Not authorized');
    }

    const filter = { job: req.params.jobId };

    if (req.query.status) {
        filter.status = req.query.status;
    }

    const applications = await Application.find(filter)
        .populate({
            path: 'candidate',
            select: 'headline skills totalExperience currentAddress candidateType profileCompletion resume',
            populate: {
                path: 'user',
                select: 'name email mobile avatar'
            }
        })
        .select('status createdAt expectedSalary noticePeriod coverLetter')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await Application.countDocuments(filter);

    // Get status counts
    const statusCounts = await Application.aggregate([
        { $match: { job: job._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.status(200).json(
        new ApiResponse(200, {
            applications,
            statusCounts: statusCounts.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        }, 'Applications fetched successfully')
    );
});

// @desc    Update Application Status (Institution)
// @route   PATCH /api/v1/applications/:id/status
// @access  Private (Institution)
export const updateApplicationStatus = asyncHandler(async (req, res) => {
    const { status, remarks } = req.body;

    const application = await Application.findById(req.params.id)
        .populate('job')
        .populate({
            path: 'user',
            select: 'name email'
        });

    if (!application) {
        throw new ApiError(404, 'Application not found');
    }

    // Check ownership
    const institution = await Institution.findOne({ user: req.user._id });
    if (!institution || application.institution.toString() !== institution._id.toString()) {
        throw new ApiError(403, 'Not authorized');
    }

    // Update status
    await application.updateStatus(status, req.user._id, remarks);

    // Handle rejection
    if (status === 'rejected') {
        application.rejectionReason = req.body.rejectionReason;
        application.rejectionCategory = req.body.rejectionCategory;
        application.rejectedAt = new Date();
        await application.save();
    }

    // Send status update email
    try {
        await emailService.sendApplicationStatusUpdate(application.user, application.job, status);
    } catch (error) {
        console.error('Failed to send status update email:', error.message);
    }

    res.status(200).json(
        new ApiResponse(200, application, 'Application status updated successfully')
    );
});

// @desc    Shortlist Application
// @route   POST /api/v1/applications/:id/shortlist
// @access  Private (Institution)
export const shortlistApplication = asyncHandler(async (req, res) => {
    const application = await Application.findById(req.params.id);

    if (!application) {
        throw new ApiError(404, 'Application not found');
    }

    const institution = await Institution.findOne({ user: req.user._id });
    if (!institution || application.institution.toString() !== institution._id.toString()) {
        throw new ApiError(403, 'Not authorized');
    }

    await application.updateStatus('shortlisted', req.user._id, req.body.remarks);

    res.status(200).json(
        new ApiResponse(200, application, 'Application shortlisted successfully')
    );
});

// @desc    Schedule Interview
// @route   POST /api/v1/applications/:id/schedule-interview
// @access  Private (Institution)
export const scheduleInterview = asyncHandler(async (req, res) => {
    const { scheduledAt, type, round, location, meetingLink, interviewers, notes } = req.body;

    const application = await Application.findById(req.params.id)
        .populate('user', 'name email mobile')
        .populate('job', 'title');

    if (!application) {
        throw new ApiError(404, 'Application not found');
    }

    const institution = await Institution.findOne({ user: req.user._id });
    if (!institution || application.institution.toString() !== institution._id.toString()) {
        throw new ApiError(403, 'Not authorized');
    }

    // Add interview
    application.interviews.push({
        scheduledAt,
        type,
        round: round || application.interviews.length + 1,
        location,
        meetingLink,
        interviewers,
        notes,
        status: 'scheduled'
    });

    await application.updateStatus('interview_scheduled', req.user._id, `Interview scheduled for ${new Date(scheduledAt).toLocaleString()}`);

    // Send interview notification email
    try {
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a56db;">Interview Scheduled!</h2>
                <p>Hello ${application.user.name},</p>
                <p>Your interview for <strong>${application.job.title}</strong> has been scheduled.</p>
                <p><strong>Date & Time:</strong> ${new Date(scheduledAt).toLocaleString()}</p>
                <p><strong>Type:</strong> ${type}</p>
                ${location ? `<p><strong>Location:</strong> ${location}</p>` : ''}
                ${meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${meetingLink}">${meetingLink}</a></p>` : ''}
                <p>Best regards,<br>Team Utkarsh Ujjain</p>
            </div>
        `;

        await emailService.sendEmail({
            to: application.user.email,
            subject: `Interview Scheduled: ${application.job.title}`,
            html
        });
    } catch (error) {
        console.error('Failed to send interview email:', error.message);
    }

    res.status(200).json(
        new ApiResponse(200, application, 'Interview scheduled successfully')
    );
});

// @desc    Add Interview Feedback
// @route   POST /api/v1/applications/:id/interview-feedback
// @access  Private (Institution)
export const addInterviewFeedback = asyncHandler(async (req, res) => {
    const { interviewIndex, feedback, rating, status } = req.body;

    const application = await Application.findById(req.params.id);

    if (!application) {
        throw new ApiError(404, 'Application not found');
    }

    const institution = await Institution.findOne({ user: req.user._id });
    if (!institution || application.institution.toString() !== institution._id.toString()) {
        throw new ApiError(403, 'Not authorized');
    }

    if (!application.interviews[interviewIndex]) {
        throw new ApiError(404, 'Interview not found');
    }

    application.interviews[interviewIndex].feedback = feedback;
    application.interviews[interviewIndex].rating = rating;
    application.interviews[interviewIndex].status = status || 'completed';

    if (status === 'completed') {
        await application.updateStatus('interviewed', req.user._id, `Interview ${interviewIndex + 1} completed`);
    }

    await application.save();

    res.status(200).json(
        new ApiResponse(200, application, 'Interview feedback added successfully')
    );
});

// @desc    Make Offer
// @route   POST /api/v1/applications/:id/offer
// @access  Private (Institution)
export const makeOffer = asyncHandler(async (req, res) => {
    const { salary, joiningDate, designation, offerLetterUrl } = req.body;

    const application = await Application.findById(req.params.id)
        .populate('user', 'name email')
        .populate('job', 'title');

    if (!application) {
        throw new ApiError(404, 'Application not found');
    }

    const institution = await Institution.findOne({ user: req.user._id });
    if (!institution || application.institution.toString() !== institution._id.toString()) {
        throw new ApiError(403, 'Not authorized');
    }

    application.offer = {
        salary,
        joiningDate,
        designation,
        offerLetterUrl,
        offeredAt: new Date(),
        response: 'pending'
    };

    await application.updateStatus('offered', req.user._id, `Offer made with salary ${salary}`);

    // Send offer email
    try {
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a56db;"> Congratulations! Job Offer</h2>
                <p>Hello ${application.user.name},</p>
                <p>We are pleased to offer you the position of <strong>${designation}</strong> for <strong>${application.job.title}</strong>.</p>
                <p><strong>Offered Salary:</strong> ₹${salary.toLocaleString('en-IN')}</p>
                <p><strong>Joining Date:</strong> ${new Date(joiningDate).toLocaleDateString()}</p>
                ${offerLetterUrl ? `<p><a href="${offerLetterUrl}">Download Offer Letter</a></p>` : ''}
                <p>Please respond to this offer at the earliest.</p>
                <p>Best regards,<br>Team Utkarsh Ujjain</p>
            </div>
        `;

        await emailService.sendEmail({
            to: application.user.email,
            subject: `Job Offer: ${application.job.title}`,
            html
        });
    } catch (error) {
        console.error('Failed to send offer email:', error.message);
    }

    res.status(200).json(
        new ApiResponse(200, application, 'Offer made successfully')
    );
});

// @desc    Respond to Offer (Candidate)
// @route   POST /api/v1/applications/:id/respond-offer
// @access  Private (Candidate)
export const respondToOffer = asyncHandler(async (req, res) => {
    const { response } = req.body; // accepted, rejected, negotiating

    const application = await Application.findById(req.params.id);

    if (!application) {
        throw new ApiError(404, 'Application not found');
    }

    if (application.user.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'Not authorized');
    }

    if (application.status !== 'offered') {
        throw new ApiError(400, 'No pending offer to respond to');
    }

    application.offer.response = response;
    application.offer.respondedAt = new Date();

    if (response === 'accepted') {
        await application.updateStatus('hired', req.user._id, 'Offer accepted');

        // Update institution hire count
        const institution = await Institution.findById(application.institution);
        if (institution) {
            institution.totalHires += 1;
            await institution.save();
        }
    } else if (response === 'rejected') {
        await application.updateStatus('withdrawn', req.user._id, 'Offer rejected by candidate');
    }

    await application.save();

    res.status(200).json(
        new ApiResponse(200, application, `Offer ${response} successfully`)
    );
});

// @desc    Withdraw Application (Candidate)
// @route   POST /api/v1/applications/:id/withdraw
// @access  Private (Candidate)
export const withdrawApplication = asyncHandler(async (req, res) => {
    const application = await Application.findById(req.params.id);

    if (!application) {
        throw new ApiError(404, 'Application not found');
    }

    if (application.user.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'Not authorized');
    }

    if (['hired', 'withdrawn'].includes(application.status)) {
        throw new ApiError(400, 'Cannot withdraw this application');
    }

    await application.updateStatus('withdrawn', req.user._id, req.body.reason || 'Withdrawn by candidate');

    // Update job applications count
    const job = await Job.findById(application.job);
    if (job) {
        job.applicationsCount = Math.max(0, job.applicationsCount - 1);
        await job.save();
    }

    res.status(200).json(
        new ApiResponse(200, application, 'Application withdrawn successfully')
    );
});

// @desc    Add Note to Application (Institution)
// @route   POST /api/v1/applications/:id/notes
// @access  Private (Institution)
export const addNote = asyncHandler(async (req, res) => {
    const { content } = req.body;

    const application = await Application.findById(req.params.id);

    if (!application) {
        throw new ApiError(404, 'Application not found');
    }

    const institution = await Institution.findOne({ user: req.user._id });
    if (!institution || application.institution.toString() !== institution._id.toString()) {
        throw new ApiError(403, 'Not authorized');
    }

    application.notes.push({
        content,
        addedBy: req.user._id
    });

    await application.save();

    res.status(200).json(
        new ApiResponse(200, application.notes, 'Note added successfully')
    );
});

// @desc    Submit Feedback (Candidate)
// @route   POST /api/v1/applications/:id/feedback
// @access  Private (Candidate)
export const submitFeedback = asyncHandler(async (req, res) => {
    const { rating, comments, interviewExperience } = req.body;

    const application = await Application.findById(req.params.id);

    if (!application) {
        throw new ApiError(404, 'Application not found');
    }

    if (application.user.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'Not authorized');
    }

    application.candidateFeedback = {
        rating,
        comments,
        interviewExperience
    };

    await application.save();

    res.status(200).json(
        new ApiResponse(200, application.candidateFeedback, 'Feedback submitted successfully')
    );
});

// @desc    Get All Applications for Institution
// @route   GET /api/v1/applications/institution/applications
// @access  Private (Institution)
export const getInstitutionApplications = asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginateResults(req.query.page, req.query.limit);

    const institution = await Institution.findOne({ user: req.user._id });

    if (!institution) {
        throw new ApiError(404, 'Institution profile not found');
    }

    const filter = { institution: institution._id };

    if (req.query.status) {
        filter.status = req.query.status;
    }

    const applications = await Application.find(filter)
        .populate({
            path: 'job',
            select: 'title location jobType'
        })
        .populate({
            path: 'candidate',
            select: 'headline skills totalExperience currentAddress candidateType profileCompletion resume',
            populate: {
                path: 'user',
                select: 'name email mobile avatar'
            }
        })
        .select('status createdAt offeredAt hiredAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await Application.countDocuments(filter);

    res.status(200).json(
        new ApiResponse(200, {
            applications,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        }, 'Applications fetched successfully')
    );
});