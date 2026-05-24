import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
    job: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    candidate: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Candidate',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    institution: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Institution',
        required: true
    },
    // Application Details
    coverLetter: {
        type: String,
        maxlength: 5000
    },
    resume: {
        public_id: String,
        url: String,
        filename: String
    },
    // Expected Details
    expectedSalary: Number,
    noticePeriod: String,
    availableFrom: Date,
    // Screening Answers
    screeningAnswers: [{
        question: String,
        answer: String
    }],
    // Status
    status: {
        type: String,
        enum: [
            'applied',
            'viewed',
            'shortlisted',
            'interview_scheduled',
            'interviewed',
            'offered',
            'hired',
            'rejected',
            'withdrawn',
            'on_hold'
        ],
        default: 'applied'
    },
    // Status History
    statusHistory: [{
        status: String,
        changedAt: {
            type: Date,
            default: Date.now
        },
        changedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        remarks: String
    }],
    // Interview Details
    interviews: [{
        scheduledAt: Date,
        type: {
            type: String,
            enum: ['phone', 'video', 'in-person', 'technical', 'hr']
        },
        round: Number,
        location: String,
        meetingLink: String,
        interviewers: [String],
        status: {
            type: String,
            enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
            default: 'scheduled'
        },
        feedback: String,
        rating: Number,
        notes: String
    }],
    // Offer Details
    offer: {
        salary: Number,
        joiningDate: Date,
        designation: String,
        offerLetterUrl: String,
        offeredAt: Date,
        respondedAt: Date,
        response: {
            type: String,
            enum: ['pending', 'accepted', 'rejected', 'negotiating']
        }
    },
    // Feedback
    institutionFeedback: {
        rating: Number,
        strengths: [String],
        weaknesses: [String],
        comments: String
    },
    candidateFeedback: {
        rating: Number,
        comments: String,
        interviewExperience: String
    },
    // Rejection
    rejectionReason: String,
    rejectionCategory: {
        type: String,
        enum: [
            'not_qualified',
            'overqualified',
            'salary_mismatch',
            'location_mismatch',
            'position_filled',
            'other'
        ]
    },
    rejectedAt: Date,
    // Notes (internal)
    notes: [{
        content: String,
        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],
    // Source
    source: {
        type: String,
        enum: ['direct', 'referral', 'job_board', 'social_media', 'other'],
        default: 'direct'
    },
    referredBy: String
}, {
    timestamps: true
});

// Compound index to prevent duplicate applications
applicationSchema.index({ job: 1, candidate: 1 }, { unique: true });
applicationSchema.index({ status: 1 });
applicationSchema.index({ createdAt: -1 });
applicationSchema.index({ institution: 1 });
applicationSchema.index({ user: 1 });

// Update status with history
applicationSchema.methods.updateStatus = async function(newStatus, userId, remarks = '') {
    this.statusHistory.push({
        status: newStatus,
        changedBy: userId,
        remarks
    });
    this.status = newStatus;
    await this.save();
};

export default mongoose.model('Application', applicationSchema);