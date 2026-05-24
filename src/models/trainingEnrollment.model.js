import mongoose from 'mongoose';

const trainingEnrollmentSchema = new mongoose.Schema({
    training: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Training',
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
    // Enrollment Details
    enrollmentNumber: {
        type: String,
        unique: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'in_progress', 'completed', 'dropped', 'cancelled'],
        default: 'pending'
    },
    enrolledAt: {
        type: Date,
        default: Date.now
    },
    confirmedAt: Date,
    startedAt: Date,
    completedAt: Date,
    // Payment
    payment: {
        amount: Number,
        status: {
            type: String,
            enum: ['pending', 'paid', 'refunded', 'waived'],
            default: 'pending'
        },
        transactionId: String,
        paidAt: Date,
        method: String
    },
    // Attendance
    attendance: [{
        date: Date,
        status: {
            type: String,
            enum: ['present', 'absent', 'late', 'excused']
        }
    }],
    attendancePercentage: {
        type: Number,
        default: 0
    },
    // Progress
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    modulesCompleted: [{
        module: String,
        completedAt: Date,
        score: Number
    }],
    // Assessment
    assessments: [{
        name: String,
        type: {
            type: String,
            enum: ['quiz', 'assignment', 'project', 'exam']
        },
        score: Number,
        maxScore: Number,
        submittedAt: Date,
        evaluatedAt: Date,
        feedback: String
    }],
    finalScore: Number,
    grade: String,
    // Certificate
    certificate: {
        isIssued: {
            type: Boolean,
            default: false
        },
        public_id: String,
        url: String,
        issuedAt: Date,
        certificateNumber: String
    },
    // Feedback
    feedback: {
        rating: Number,
        review: String,
        submittedAt: Date,
        trainerRating: Number,
        contentRating: Number,
        facilityRating: Number
    },
    // Notes
    notes: String
}, {
    timestamps: true
});

// Compound index
trainingEnrollmentSchema.index({ training: 1, candidate: 1 }, { unique: true });
trainingEnrollmentSchema.index({ status: 1 });
trainingEnrollmentSchema.index({ enrolledAt: -1 });

// Generate enrollment number
trainingEnrollmentSchema.pre('save', async function() {
    if (!this.enrollmentNumber) {
        const count = await mongoose.model('TrainingEnrollment').countDocuments();
        this.enrollmentNumber = `UTK${Date.now()}${(count + 1).toString().padStart(4, '0')}`;
    }
    ;
});

export default mongoose.model('TrainingEnrollment', trainingEnrollmentSchema);