import mongoose from 'mongoose';
import slugify from 'slugify';

const jobSchema = new mongoose.Schema({
    institution: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Institution',
        required: true
    },
    postedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: [true, 'Job title is required'],
        trim: true,
        maxlength: 200
    },
    slug: {
        type: String,
        unique: true
    },
    description: {
        type: String,
        required: [true, 'Job description is required'],
        maxlength: 10000
    },
    // Requirements
    requirements: [String],
    responsibilities: [String],
    qualifications: [String],
    skills: [{
        name: String,
        isRequired: {
            type: Boolean,
            default: true
        }
    }],
    // Job Details
    jobType: {
        type: String,
        enum: ['full-time', 'part-time', 'contract', 'internship', 'freelance'],
        default: 'full-time'
    },
    workMode: {
        type: String,
        enum: ['onsite', 'remote', 'hybrid'],
        default: 'onsite'
    },
    experienceLevel: {
        type: String,
        enum: ['fresher', 'entry', 'mid', 'senior', 'executive'],
        default: 'entry'
    },
    experience: {
        min: {
            type: Number,
            default: 0
        },
        max: Number
    },
    education: {
        type: String,
        enum: ['10th', '12th', 'diploma', 'graduate', 'post-graduate', 'phd', 'any']
    },
    // Industry
    industry: {
        type: String,
        enum: [
            'Manufacturing',
            'IT/Software',
            'Education',
            'Construction',
            'Automobile',
            'Finance',
            'Healthcare',
            'Telecom/BPO',
            'Food Processing',
            'Textile',
            'Pharmaceutical',
            'Retail',
            'Logistics',
            'Agriculture',
            'Other'
        ],
        required: true
    },
    // Banner
    banner: {
        public_id: String,
        url: String
    },
    // Salary
    salary: {
        min: Number,
        max: Number,
        currency: {
            type: String,
            default: 'INR'
        },
        period: {
            type: String,
            enum: ['monthly', 'yearly'],
            default: 'yearly'
        },
        isNegotiable: {
            type: Boolean,
            default: false
        },
        isConfidential: {
            type: Boolean,
            default: false
        }
    },
    // Location
    location: {
        address: String,
        city: {
            type: String,
            required: true
        },
        district: String,
        state: {
            type: String,
            default: 'Madhya Pradesh'
        },
        pincode: String
    },
    // Vacancies
    vacancies: {
        type: Number,
        default: 1
    },
    // Application Details
    applicationDeadline: Date,
    applicationEmail: String,
    applicationUrl: String,
    applicationInstructions: String,
    // Screening Questions
    screeningQuestions: [{
        question: String,
        isRequired: {
            type: Boolean,
            default: false
        },
        type: {
            type: String,
            enum: ['text', 'yesno', 'multiple'],
            default: 'text'
        },
        options: [String] // For multiple choice
    }],
    // Benefits
    benefits: [String],
    // Status
    status: {
        type: String,
        enum: ['draft', 'pending', 'active', 'paused', 'closed', 'expired', 'rejected'],
        default: 'pending'
    },
    // Stats
    views: {
        type: Number,
        default: 0
    },
    applicationsCount: {
        type: Number,
        default: 0
    },
    // Admin
    isApproved: {
        type: Boolean,
        default: false
    },
    approvedAt: Date,
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectionReason: String,
    // Featured
    isFeatured: {
        type: Boolean,
        default: false
    },
    featuredUntil: Date,
    // Search keywords
    searchKeywords: [String]
}, {
    timestamps: true
});

// Generate slug before saving
jobSchema.pre('save', function () {
    if (this.isModified('title')) {
        this.slug = slugify(this.title, { lower: true, strict: true }) + '-' + Date.now();
    }

    // Update search keywords
    const keywords = [];
    if (this.title) keywords.push(...this.title.toLowerCase().split(' '));
    if (this.skills) keywords.push(...this.skills.map(s => s.name?.toLowerCase()));
    if (this.location?.city) keywords.push(this.location.city.toLowerCase());
    this.searchKeywords = [...new Set(keywords.filter(Boolean))];

    ;
});

// Increment views
jobSchema.methods.incrementViews = async function () {
    this.views += 1;
    await this.save();
};

// Indexes for search
jobSchema.index({ title: 'text', description: 'text', searchKeywords: 'text' });
jobSchema.index({ 'location.city': 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ jobType: 1 });
jobSchema.index({ experienceLevel: 1 });
jobSchema.index({ 'skills.name': 1 });
jobSchema.index({ searchKeywords: 1 });
jobSchema.index({ createdAt: -1 });
jobSchema.index({ salary: 1 });

export default mongoose.model('Job', jobSchema);