import Vendor from '../models/vendor.model.js';
import Institution from '../models/institution.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import cloudinaryService from '../services/cloudinary.service.js';
import { paginateResults } from '../utils/helpers.js';
import mongoose from 'mongoose';

// Helper function to validate MongoDB ObjectId
const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
};

// @desc    Create/Update Vendor Profile
// @route   POST /api/v1/vendors/profile
// @access  Private (Institution - Vendor type)
export const createOrUpdateProfile = asyncHandler(async (req, res) => {
    const institution = await Institution.findOne({ user: req.user._id });

    if (!institution) {
        throw new ApiError(404, 'Institution profile not found');
    }

    if (institution.institutionType !== 'vendor') {
        throw new ApiError(403, 'Only vendor type institutions can create vendor profile');
    }

    let vendor = await Vendor.findOne({ institution: institution._id });

    if (vendor) {
        // Update existing
        Object.keys(req.body).forEach(key => {
            if (req.body[key] !== undefined) {
                vendor[key] = req.body[key];
            }
        });
        await vendor.save();
    } else {
        // Create new
        vendor = await Vendor.create({
            ...req.body,
            institution: institution._id,
            user: req.user._id
        });
    }

    res.status(200).json(
        new ApiResponse(200, vendor, 'Vendor profile saved successfully')
    );
});

// @desc    Get Vendor Profile
// @route   GET /api/v1/vendors/profile
// @access  Private (Institution - Vendor)
export const getProfile = asyncHandler(async (req, res) => {
    const institution = await Institution.findOne({ user: req.user._id });

    if (!institution) {
        throw new ApiError(404, 'Institution profile not found');
    }

    const vendor = await Vendor.findOne({ institution: institution._id })
        .populate('institution', 'organizationName logo address contactPerson');

    if (!vendor) {
        throw new ApiError(404, 'Vendor profile not found');
    }

    res.status(200).json(
        new ApiResponse(200, vendor, 'Vendor profile fetched successfully')
    );
});

// @desc    Get All Vendors
// @route   GET /api/v1/vendors
// @access  Public
export const getAllVendors = asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginateResults(req.query.page, req.query.limit);

    const filter = {
        isActive: true,
        isVerified: true
    };

    // Filter by business type
    if (req.query.businessType) {
        filter.businessType = req.query.businessType;
    }

    // Filter by services
    if (req.query.service) {
        filter.services = { $regex: req.query.service, $options: 'i' };
    }

    // Filter by industry
    if (req.query.industry) {
        filter.industries = { $regex: req.query.industry, $options: 'i' };
    }

    // Search
    if (req.query.q) {
        filter.$or = [
            { businessName: { $regex: req.query.q, $options: 'i' } },
            { services: { $regex: req.query.q, $options: 'i' } },
            { industries: { $regex: req.query.q, $options: 'i' } }
        ];
    }

    const vendors = await Vendor.find(filter)
        .populate('institution', 'organizationName logo address')
        .select('businessName businessType businessDescription services products industries rating logo address')
        .sort({ rating: -1 })
        .skip(skip)
        .limit(limit);

    const total = await Vendor.countDocuments(filter);

    res.status(200).json(
        new ApiResponse(200, {
            vendors,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        }, 'Vendors fetched successfully')
    );
});

// @desc    Get Vendor by ID
// @route   GET /api/v1/vendors/:id
// @access  Public
export const getVendorById = asyncHandler(async (req, res) => {
    // ADDED: Validate ObjectId format before querying
    if (!isValidObjectId(req.params.id)) {
        throw new ApiError(400, 'Invalid vendor ID format');
    }

    const vendor = await Vendor.findById(req.params.id)
        .populate('institution', 'organizationName logo address contactPerson about website');

    if (!vendor) {
        throw new ApiError(404, 'Vendor not found');
    }

    res.status(200).json(
        new ApiResponse(200, vendor, 'Vendor fetched successfully')
    );
});

// @desc    Add Product
// @route   POST /api/v1/vendors/products
// @access  Private (Vendor)
export const addProduct = asyncHandler(async (req, res) => {
    const institution = await Institution.findOne({ user: req.user._id });
    const vendor = await Vendor.findOne({ institution: institution._id });

    if (!vendor) {
        throw new ApiError(404, 'Vendor profile not found');
    }

    let productImage = {};
    if (req.file) {
        const result = await cloudinaryService.uploadGalleryImage(req.file.path, vendor._id);
        productImage = {
            public_id: result.public_id,
            url: result.url
        };
    }

    vendor.products.push({
        ...req.body,
        image: productImage
    });

    await vendor.save();

    res.status(201).json(
        new ApiResponse(201, vendor.products, 'Product added successfully')
    );
});

// @desc    Update Product
// @route   PUT /api/v1/vendors/products/:productId
// @access  Private (Vendor)
export const updateProduct = asyncHandler(async (req, res) => {
    const institution = await Institution.findOne({ user: req.user._id });
    const vendor = await Vendor.findOne({ institution: institution._id });

    if (!vendor) {
        throw new ApiError(404, 'Vendor profile not found');
    }

    const product = vendor.products.id(req.params.productId);
    if (!product) {
        throw new ApiError(404, 'Product not found');
    }

    // Update product image if provided
    if (req.file) {
        if (product.image?.public_id) {
            await cloudinaryService.deleteFile(product.image.public_id);
        }
        const result = await cloudinaryService.uploadGalleryImage(req.file.path, vendor._id);
        req.body.image = {
            public_id: result.public_id,
            url: result.url
        };
    }

    Object.keys(req.body).forEach(key => {
        product[key] = req.body[key];
    });

    await vendor.save();

    res.status(200).json(
        new ApiResponse(200, vendor.products, 'Product updated successfully')
    );
});

// @desc    Delete Product
// @route   DELETE /api/v1/vendors/products/:productId
// @access  Private (Vendor)
export const deleteProduct = asyncHandler(async (req, res) => {
    const institution = await Institution.findOne({ user: req.user._id });
    const vendor = await Vendor.findOne({ institution: institution._id });

    if (!vendor) {
        throw new ApiError(404, 'Vendor profile not found');
    }

    const product = vendor.products.id(req.params.productId);
    if (!product) {
        throw new ApiError(404, 'Product not found');
    }

    // Delete product image
    if (product.image?.public_id) {
        await cloudinaryService.deleteFile(product.image.public_id);
    }

    vendor.products.pull(req.params.productId);
    await vendor.save();

    res.status(200).json(
        new ApiResponse(200, null, 'Product deleted successfully')
    );
});

// @desc    Add Certification
// @route   POST /api/v1/vendors/certifications
// @access  Private (Vendor)
export const addCertification = asyncHandler(async (req, res) => {
    const institution = await Institution.findOne({ user: req.user._id });
    const vendor = await Vendor.findOne({ institution: institution._id });

    if (!vendor) {
        throw new ApiError(404, 'Vendor profile not found');
    }

    let document = {};
    if (req.file) {
        const result = await cloudinaryService.uploadDocument(req.file.path, req.user._id, 'certification');
        document = {
            public_id: result.public_id,
            url: result.url
        };
    }

    vendor.certifications.push({
        ...req.body,
        document
    });

    await vendor.save();

    res.status(201).json(
        new ApiResponse(201, vendor.certifications, 'Certification added successfully')
    );
});

// @desc    Delete Certification
// @route   DELETE /api/v1/vendors/certifications/:certId
// @access  Private (Vendor)
export const deleteCertification = asyncHandler(async (req, res) => {
    const institution = await Institution.findOne({ user: req.user._id });
    const vendor = await Vendor.findOne({ institution: institution._id });

    if (!vendor) {
        throw new ApiError(404, 'Vendor profile not found');
    }

    const certification = vendor.certifications.id(req.params.certId);
    if (!certification) {
        throw new ApiError(404, 'Certification not found');
    }

    // Delete document
    if (certification.document?.public_id) {
        await cloudinaryService.deleteFile(certification.document.public_id, 'raw');
    }

    vendor.certifications.pull(req.params.certId);
    await vendor.save();

    res.status(200).json(
        new ApiResponse(200, null, 'Certification deleted successfully')
    );
});

// @desc    Add Review to Vendor
// @route   POST /api/v1/vendors/:id/reviews
// @access  Private
export const addReview = asyncHandler(async (req, res) => {
    const { rating, review } = req.body;

    // ADDED: Validate ObjectId format
    if (!isValidObjectId(req.params.id)) {
        throw new ApiError(400, 'Invalid vendor ID format');
    }

    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
        throw new ApiError(404, 'Vendor not found');
    }

    // Check if user already reviewed
    const existingReview = vendor.reviews.find(
        r => r.user.toString() === req.user._id.toString()
    );

    if (existingReview) {
        throw new ApiError(400, 'You have already reviewed this vendor');
    }

    vendor.reviews.push({
        user: req.user._id,
        rating,
        review
    });

    // Update average rating
    const totalRating = vendor.reviews.reduce((acc, r) => acc + r.rating, 0);
    vendor.rating.average = totalRating / vendor.reviews.length;
    vendor.rating.count = vendor.reviews.length;

    await vendor.save();

    res.status(201).json(
        new ApiResponse(201, vendor.reviews, 'Review added successfully')
    );
});

// @desc    Get Vendor Categories
// @route   GET /api/v1/vendors/categories
// @access  Public
export const getVendorCategories = asyncHandler(async (req, res) => {
    const categories = await Vendor.aggregate([
        { $match: { isActive: true, isVerified: true } },
        { $group: { _id: '$businessType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]);

    res.status(200).json(
        new ApiResponse(200, categories, 'Categories fetched successfully')
    );
});