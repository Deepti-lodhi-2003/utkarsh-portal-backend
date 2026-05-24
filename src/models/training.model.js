import mongoose from 'mongoose';
import slugify from 'slugify';

const trainingSchema = new mongoose.Schema({
    institution: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Institution',
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: [true, 'Training title is required'],
        trim: true
    },
    slug: {
        type: String,
        unique: true
    },
    description: {
        type: String,
        required: true
    },
    shortDescription: {
        type: String,
        maxlength: 300
    },
    // Training Details
    category: {
        type: String,
        enum: [
            'it_software',
            'manufacturing',
            'healthcare',
            'retail',
            'hospitality',
            'construction',
            'agriculture',
            'automotive',
            'textile',
            'banking',
            'education',
            'other'
        ],
        required: true
    },
    subCategory: String,
    skillsCovered: [String],
    curriculum: [{
        module: String,
        topics: [String],
        duration: String
    }],
    // Duration
    duration: {
        value: {
            type: Number,
            required: true
        },
        unit: {
            type: String,
            enum: ['hours', 'days', 'weeks', 'months'],
            required: true
        }
    },
    // Schedule
    startDate: {
        type: Date,
        required: true
    },
    endDate: Date,
    timing: {
        days: [String], // ['Monday', 'Wednesday', 'Friday']
        startTime: String,
        endTime: String
    },
    // Location
    mode: {
        type: String,
        enum: ['online', 'offline', 'hybrid'],
        default: 'offline'
    },
    venue: {
        name: String,
        address: String,
        city: String,
        district: String,
        state: {
            type: String,
            default: 'Madhya Pradesh'
        },
        pincode: String,
        landmark: String
    },
    onlineDetails: {
        platform: String,
        meetingLink: String,
        accessInstructions: String
    },
    // Eligibility
    eligibility: {
        minEducation: {
            type: String,
            enum: ['10th', '12th', 'diploma', 'graduate', 'post-graduate', 'any']
        },
        minAge: Number,
        maxAge: Number,
        requiredSkills: [String],
        otherRequirements: [String]
    },
    // Fees
    fees: {
        amount: {
            type: Number,
            default: 0
        },
        currency: {
            type: String,
            default: 'INR'
        },
        isFree: {
            type: Boolean,
            default: false
        },
        scholarshipAvailable: {
            type: Boolean,
            default: false
        },
        scholarshipDetails: String
    },
    // Seats
    totalSeats: {
        type: Number,
        required: true
    },
    availableSeats: Number,
    // Trainers
    trainers: [{
        name: String,
        designation: String,
        qualification: String,
        experience: String,
        photo: {
            public_id: String,
            url: String
        }
    }],
    // Certification
    certification: {
        isProvided: {
            type: Boolean,
            default: true
        },
        certificateName: String,
        issuingAuthority: String,
        validityPeriod: String
    },
    // Placement
    placementAssistance: {
        type: Boolean,
        default: false
    },
    placementDetails: {
        companies: [String],
        averageSalary: Number,
        placementRate: Number
    },
    // Banner
    banner: {
        public_id: String,
        url: String
    },
    // Gallery
    gallery: [{
        public_id: String,
        url: String,
        caption: String
    }],
    // Documents
    brochure: {
        public_id: String,
        url: String
    },
    // Status
    status: {
        type: String,
        enum: ['draft', 'upcoming', 'ongoing', 'completed', 'cancelled'],
        default: 'upcoming'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isApproved: {
        type: Boolean,
        default: false
    },
    // Stats
    enrollmentCount: {
        type: Number,
        default: 0
    },
    rating: {
        average: { type: Number, default: 0 },
        count: { type: Number, default: 0 }
    },
    // Search
    searchKeywords: [String]
}, {
    timestamps: true
});

// Pre-save
trainingSchema.pre('save', function() {
    if (this.isModified('title')) {
        this.slug = slugify(this.title, { lower: true, strict: true }) + '-' + Date.now();
    }
    
    if (!this.availableSeats && this.totalSeats) {
        this.availableSeats = this.totalSeats;
    }
    
    // Update search keywords
    const keywords = [];
    if (this.title) keywords.push(...this.title.toLowerCase().split(' '));
    if (this.skillsCovered) keywords.push(...this.skillsCovered.map(s => s.toLowerCase()));
    if (this.venue?.city) keywords.push(this.venue.city.toLowerCase());
    if (this.category) keywords.push(this.category.toLowerCase());
    this.searchKeywords = [...new Set(keywords.filter(Boolean))];
    
    ;
});

// Indexes
trainingSchema.index({ title: 'text', description: 'text', searchKeywords: 'text' });
trainingSchema.index({ category: 1 });
trainingSchema.index({ 'venue.city': 1 });
trainingSchema.index({ status: 1 });
trainingSchema.index({ mode: 1 });
trainingSchema.index({ searchKeywords: 1 });
trainingSchema.index({ startDate: 1 });

export default mongoose.model('Training', trainingSchema);