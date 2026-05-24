import mongoose from 'mongoose';

const serviceRequestSchema = new mongoose.Schema({
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: true
    },
    requester: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    service: { // The specific product/service being requested
        type: mongoose.Schema.Types.ObjectId,
        required: true // STRICTLY REQUIRED as per user request
        // We don't use 'ref' for embedded subdocs usually, but if Products were their own collection we would.
        // Since products are embedded in Vendor, we just store the ID to find it within the Vendor document if needed,
        // or we store a snapshot of the service name/id.
        // Let's store the ID and the snapshot Name for easier display.
    },
    serviceName: {
        type: String,
        required: true
    },
    serviceImage: {
        type: String
    },
    // Requester Details (Snapshot)
    requesterName: String,
    requesterEmail: String,
    requesterMobile: String,

    // Request Details
    message: {
        type: String,
        required: true
    },
    requirements: String,
    maxBudget: Number, // budget
    expectedDate: Date, // timeline/deadline

    status: {
        type: String,
        enum: ['pending', 'viewed', 'in_progress', 'completed', 'rejected', 'cancelled'],
        default: 'pending'
    },
    vendorNote: String, // Note from vendor to requester or internal

    statusHistory: [{
        status: String,
        note: String,
        changedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Indexes for fast lookup
serviceRequestSchema.index({ vendor: 1, status: 1 });
serviceRequestSchema.index({ requester: 1 });
serviceRequestSchema.index({ service: 1 }); // To find requests for a specific product

export default mongoose.model('ServiceRequest', serviceRequestSchema);
