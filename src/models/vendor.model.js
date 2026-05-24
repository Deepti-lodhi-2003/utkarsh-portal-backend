import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema({
    institution: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Institution',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Business Details
    businessName: {
        type: String,
        required: true
    },
    businessType: {
        type: String,
        enum: [
            'manufacturer',
            'supplier',
            'distributor',
            'service_provider',
            'contractor',
            'consultant',
            'trader',
            'exporter',
            'importer',
            'other'
        ],
        required: true
    },
    businessDescription: {
        type: String,
        maxlength: 3000
    },
    establishedYear: Number,
    // Services/Products
    services: [String],
    products: [{
        name: String,
        description: String,
        category: String,
        price: Number,
        unit: String,
        image: {
            public_id: String,
            url: String
        }
    }],
    industries: [String],
    specializations: [String],
    // Capacity
    annualTurnover: String,
    employeeCount: String,
    productionCapacity: String,
    // Service Areas
    serviceAreas: [{
        city: String,
        district: String,
        state: String
    }],
    isNationwide: {
        type: Boolean,
        default: false
    },
    // Registration Details
    registrationDetails: {
        gstNumber: String,
        panNumber: String,
        udyamNumber: String,
        msmeCategory: {
            type: String,
            enum: ['micro', 'small', 'medium']
        },
        importExportCode: String
    },
    // Certifications
    certifications: [{
        name: String,
        issuingBody: String,
        certificateNumber: String,
        validFrom: Date,
        validUntil: Date,
        document: {
            public_id: String,
            url: String
        }
    }],
    // Bank Details
    bankDetails: {
        bankName: String,
        accountNumber: String,
        ifscCode: String,
        accountType: String
    },
    // Contact
    website: String,
    // Status
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationStatus: {
        type: String,
        enum: ['pending', 'in_review', 'verified', 'rejected'],
        default: 'pending'
    },
    verifiedAt: Date,
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectionReason: String,
    rejectedAt: Date,
    rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isActive: {
        type: Boolean,
        default: true
    },
        // Rating
    rating: {
        average: {
            type: Number,
            default: 0
        },
        count: {
            type: Number,
            default: 0
        }
    },
    // Reviews
    reviews: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        rating: Number,
        review: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    // Search
    searchKeywords: [String]
}, {
    timestamps: true
});

// Pre-save
vendorSchema.pre('save', function() {
    const keywords = [];
    if (this.businessName) keywords.push(...this.businessName.toLowerCase().split(' '));
    if (this.services) keywords.push(...this.services.map(s => s.toLowerCase()));
    if (this.industries) keywords.push(...this.industries.map(i => i.toLowerCase()));
    if (this.products) keywords.push(...this.products.map(p => p.name?.toLowerCase()));
    this.searchKeywords = [...new Set(keywords.filter(Boolean))];
    ;
});

// Indexes
vendorSchema.index({ businessType: 1 });
vendorSchema.index({ services: 1 });
vendorSchema.index({ industries: 1 });
vendorSchema.index({ searchKeywords: 1 });
vendorSchema.index({ businessName: 'text', businessDescription: 'text', searchKeywords: 'text' });

export default mongoose.model('Vendor', vendorSchema);