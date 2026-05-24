import mongoose from 'mongoose';

const educationSchema = new mongoose.Schema({
    degree: {
        type: String,
        required: true
    },
    field: String,
    institution: {
        type: String,
        required: true
    },
    board: String,
    percentage: Number,
    cgpa: Number,
    passingYear: Number,
    isCurrent: {
        type: Boolean,
        default: false
    }
});

const experienceSchema = new mongoose.Schema({
    company: {
        type: String,
        required: true
    },
    designation: {
        type: String,
        required: true
    },
    department: String,
    from: {
        type: Date
        // Required validation handled by Joi validator for new entries
    },
    to: Date,
    isCurrent: {
        type: Boolean,
        default: false
    },
    salary: Number,
    description: String,
    location: String
});

const candidateSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    candidateType: {
        type: String,
        enum: ['fresher', 'experienced'],
        required: true
    },
    // Personal Details
    fatherName: String,
    motherName: String,
    dateOfBirth: Date,
    gender: {
        type: String,
        enum: ['male', 'female', 'other']
    },
    maritalStatus: {
        type: String,
        enum: ['single', 'married', 'divorced', 'widowed']
    },
    category: {
        type: String,
        enum: ['general', 'obc', 'sc', 'st', 'ews']
    },
    nationality: {
        type: String,
        default: 'Indian'
    },
    languages: [{
        language: String,
        proficiency: {
            type: String,
            enum: ['basic', 'intermediate', 'fluent', 'native']
        }
    }],
    // Address
    currentAddress: {
        street: String,
        city: String,
        district: String,
        state: {
            type: String,
            default: 'Madhya Pradesh'
        },
        pincode: String
    },
    permanentAddress: {
        street: String,
        city: String,
        district: String,
        state: String,
        pincode: String,
        sameAsCurrent: {
            type: Boolean,
            default: false
        }
    },
    // Professional Details
    headline: {
        type: String,
        maxlength: 200
    },
    summary: {
        type: String,
        maxlength: 3000
    },
    skills: [{
        name: String,
        level: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced', 'expert']
        }
    }],
    education: [educationSchema],
    experience: [experienceSchema],
    totalExperience: {
        years: { type: Number, default: 0 },
        months: { type: Number, default: 0 }
    },
    currentSalary: Number,
    // Additional Details
    internshipDetails: String,
    certificationDetails: String,
    passingYear: String, // YYYY-MM format
    result: String, // Exam result or CGPA
    isPhysicallyDisabled: {
        type: Boolean,
        default: false
    },
    hasApprenticeship: {
        type: Boolean,
        default: false
    },
    // Resume
    resume: {
        public_id: String,
        url: String,
        filename: String,
        uploadedAt: Date
    },
    // Job Preferences
    preferredLocations: [String],
    preferredJobTypes: [{
        type: String,
        enum: ['full-time', 'part-time', 'contract', 'internship', 'freelance']
    }],
    preferredIndustries: [String],
    expectedSalary: {
        min: Number,
        max: Number
    },
    noticePeriod: {
        type: String,
        enum: ['immediate', '15days', '1month', '2months', '3months', 'more']
    },
    willingToRelocate: {
        type: Boolean,
        default: false
    },
    // Social Links
    socialLinks: {
        linkedin: String,
        github: String,
        portfolio: String,
        twitter: String
    },
    // Profile Status
    profileCompletion: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    isProfilePublic: {
        type: Boolean,
        default: true
    },
    isOpenToWork: {
        type: Boolean,
        default: true
    },
    // For search indexing
    searchKeywords: [String]
}, {
    timestamps: true
});

// Calculate profile completion
candidateSchema.methods.calculateProfileCompletion = function() {
    let completion = 0;
    const fields = [
        { field: 'fatherName', weight: 3 },
        { field: 'dateOfBirth', weight: 3 },
        { field: 'gender', weight: 3 },
        { field: 'currentAddress.city', weight: 5 },
        { field: 'headline', weight: 8 },
        { field: 'summary', weight: 10 },
        { field: 'skills', weight: 15, isArray: true },
        { field: 'education', weight: 15, isArray: true },
        { field: 'experience', weight: 15, isArray: true, optional: true },
        { field: 'resume.url', weight: 15 },
        { field: 'preferredLocations', weight: 4, isArray: true },
        { field: 'expectedSalary.min', weight: 4 }
    ];

    fields.forEach(({ field, weight, isArray, optional }) => {
        const value = field.split('.').reduce((obj, key) => obj?.[key], this);
        
        if (optional && this.candidateType === 'fresher') {
            completion += weight;
        } else if (isArray ? value?.length > 0 : value) {
            completion += weight;
        }
    });

    this.profileCompletion = Math.min(completion, 100);
    return this.profileCompletion;
};

// Update search keywords
candidateSchema.methods.updateSearchKeywords = function() {
    const keywords = [];
    
    if (this.headline) keywords.push(...this.headline.toLowerCase().split(' '));
    if (this.skills) keywords.push(...this.skills.map(s => s.name?.toLowerCase()));
    if (this.currentAddress?.city) keywords.push(this.currentAddress.city.toLowerCase());
    if (this.preferredLocations) keywords.push(...this.preferredLocations.map(l => l.toLowerCase()));
    
    this.searchKeywords = [...new Set(keywords.filter(Boolean))];
};

// Pre-save middleware
candidateSchema.pre('save', function() {
    // Ensure all experience entries have a 'from' date
    if (this.experience && this.experience.length > 0) {
        this.experience.forEach(exp => {
            if (!exp.from) {
                // Set default to 1 year ago if missing
                exp.from = new Date();
                exp.from.setFullYear(exp.from.getFullYear() - 1);
            }
        });
    }
    
    this.calculateProfileCompletion();
    this.updateSearchKeywords();
});

// Indexes for search
candidateSchema.index({ 'skills.name': 1 });
candidateSchema.index({ 'currentAddress.city': 1 });
candidateSchema.index({ candidateType: 1 });
candidateSchema.index({ searchKeywords: 1 });
candidateSchema.index({ headline: 'text', summary: 'text', searchKeywords: 'text' });

export default mongoose.model('Candidate', candidateSchema);