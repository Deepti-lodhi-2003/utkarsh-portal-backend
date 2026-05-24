import User from '../models/user.model.js';
import Candidate from '../models/candidate.model.js';
import Institution from '../models/institution.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import otpService from '../services/otp.service.js';
import tokenService from '../services/token.service.js';
import emailService from '../services/email.service.js';
import { OTP_PURPOSES } from '../utils/constants.js';

// @desc    Send OTP
// @route   POST /api/v1/auth/send-otp
// @access  Public
export const sendOTP = asyncHandler(async (req, res) => {
    const { mobile, purpose } = req.body;

    // For registration, check if user already exists
    if (purpose === OTP_PURPOSES.REGISTRATION) {
        const existingUser = await User.findOne({ mobile });
        if (existingUser) {
            throw new ApiError(400, 'User with this mobile number already exists');
        }
    }

    // For login/forgot password, check if user exists
    if ([OTP_PURPOSES.LOGIN, OTP_PURPOSES.FORGOT_PASSWORD].includes(purpose)) {
        const existingUser = await User.findOne({ mobile });
        if (!existingUser) {
            throw new ApiError(404, 'User with this mobile number not found');
        }
    }

    const result = await otpService.sendOTP(mobile, purpose, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
    });

    res.status(200).json(
        new ApiResponse(200, {
            expiresIn: result.expiresIn
        }, 'OTP sent successfully')
    );
});

// @desc    Verify OTP
// @route   POST /api/v1/auth/verify-otp
// @access  Public
export const verifyOTP = asyncHandler(async (req, res) => {
    const { mobile, otp, purpose } = req.body;

    const result = await otpService.verifyOTP(mobile, otp, purpose);

    res.status(200).json(
        new ApiResponse(200, { verified: true }, 'OTP verified successfully')
    );
});


export const resendOTP = asyncHandler(async (req, res) => {
    const { mobile, purpose } = req.body;

    const result = await otpService.resendOTP(mobile, purpose, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
    });

    res.status(200).json(
        new ApiResponse(200, {
            expiresIn: result.expiresIn
        }, 'OTP resent successfully')
    );
});

// @desc    Register Candidate
// @route   POST /api/v1/auth/register/candidate
// @access  Public
export const registerCandidate = asyncHandler(async (req, res) => {
    const {
        name, email, mobile, password, candidateType,
        dateOfBirth, gender, fatherName, motherName,
        currentAddress, headline, preferredLocations, preferredIndustries,
        skills, experience, education, totalExperience, currentSalary,
        // Additional fields
        internshipDetails, certificationDetails, passingYear, result,
        isPhysicallyDisabled, hasApprenticeship
    } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({
        $or: [{ email }, { mobile }]
    });

    if (existingUser) {
        if (existingUser.email === email) {
            throw new ApiError(400, 'Email already registered');
        }
        throw new ApiError(400, 'Mobile number already registered');
    }

    // Create user
    const user = await User.create({
        name,
        email,
        mobile,
        password,
        role: 'candidate',
        isMobileVerified: true // Assuming OTP was verified before registration
    });

    // Create candidate profile with all provided details
    const candidateData = {
        user: user._id,
        candidateType
    };

    // Add optional fields if provided
    if (dateOfBirth) candidateData.dateOfBirth = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
    if (gender) candidateData.gender = gender;
    if (fatherName) candidateData.fatherName = fatherName;
    if (motherName) candidateData.motherName = motherName;
    if (currentAddress) candidateData.currentAddress = currentAddress;
    if (headline) candidateData.headline = headline;
    if (preferredLocations && preferredLocations.length > 0) candidateData.preferredLocations = preferredLocations;
    if (preferredIndustries && preferredIndustries.length > 0) candidateData.preferredIndustries = preferredIndustries;
    if (skills && skills.length > 0) candidateData.skills = skills;
    if (experience && experience.length > 0) candidateData.experience = experience;
    if (education && education.length > 0) candidateData.education = education;
    if (totalExperience) candidateData.totalExperience = totalExperience;
    if (currentSalary) candidateData.currentSalary = currentSalary;
    // Additional fields
    if (internshipDetails) candidateData.internshipDetails = internshipDetails;
    if (certificationDetails) candidateData.certificationDetails = certificationDetails;
    if (passingYear) candidateData.passingYear = passingYear;
    if (result) candidateData.result = result;
    if (typeof isPhysicallyDisabled === 'boolean') candidateData.isPhysicallyDisabled = isPhysicallyDisabled;
    if (typeof hasApprenticeship === 'boolean') candidateData.hasApprenticeship = hasApprenticeship;

    const candidate = await Candidate.create(candidateData);

    // Calculate profile completion
    candidate.calculateProfileCompletion();
    await candidate.save();

    // Generate tokens
    const { accessToken, refreshToken } = tokenService.generateTokens(user);

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    // Send welcome email
    try {
        await emailService.sendWelcomeEmail(user);
    } catch (error) {
        console.error('Failed to send welcome email:', error.message);
    }

    res.status(201).json(
        new ApiResponse(201, {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                role: user.role
            },
            candidate: {
                id: candidate._id,
                candidateType: candidate.candidateType
            },
            accessToken,
            refreshToken
        }, 'Registration successful')
    );
});

// @desc    Register Institution
// @route   POST /api/v1/auth/register/institution
// @access  Public
export const registerInstitution = asyncHandler(async (req, res) => {
    const {
        name, email, mobile, password,
        institutionType, organizationName, contactPerson, address,
        // Additional fields
        officeMobile, website, about,
        offeringIndustries, requiredSkills, services
    } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({
        $or: [{ email }, { mobile }]
    });

    if (existingUser) {
        if (existingUser.email === email) {
            throw new ApiError(400, 'Email already registered');
        }
        throw new ApiError(400, 'Mobile number already registered');
    }

    // Create user
    const user = await User.create({
        name,
        email,
        mobile,
        password,
        role: 'institution',
        isMobileVerified: true
    });

    // Create institution profile with all fields
    const institutionData = {
        user: user._id,
        institutionType,
        organizationName,
        contactPerson,
        address
    };

    // Add optional fields if provided
    if (officeMobile) institutionData.officeMobile = officeMobile;
    if (website) institutionData.website = website;
    if (about) institutionData.about = about;
    if (offeringIndustries) institutionData.offeringIndustries = offeringIndustries;
    if (requiredSkills) institutionData.requiredSkills = requiredSkills;
    if (services) institutionData.services = services;

    const institution = await Institution.create(institutionData);

    // Generate tokens
    const { accessToken, refreshToken } = tokenService.generateTokens(user);

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    // Send welcome email
    try {
        await emailService.sendWelcomeEmail(user);
    } catch (error) {
        console.error('Failed to send welcome email:', error.message);
    }

    res.status(201).json(
        new ApiResponse(201, {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                role: user.role
            },
            institution: {
                id: institution._id,
                institutionType: institution.institutionType,
                organizationName: institution.organizationName
            },
            accessToken,
            refreshToken
        }, 'Registration successful')
    );
});

// @desc    Login with Password
// @route   POST /api/v1/auth/login
// @access  Public
export const login = asyncHandler(async (req, res) => {
    const { mobile, password } = req.body;

    // Find user
    const user = await User.findOne({ mobile }).select('+password');

    if (!user) {
        throw new ApiError(401, 'Invalid credentials');
    }

    // Check if account is locked
    if (user.isLocked()) {
        throw new ApiError(423, 'Account is locked. Please try again later.');
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    console.log(`Login attempt for ${mobile}: match=${isMatch}`);

    if (!isMatch) {
        // Increment login attempts
        user.loginAttempts += 1;
        if (user.loginAttempts >= 5) {
            user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
        }
        await user.save();
        throw new ApiError(401, 'Invalid credentials');
    }

    // Check if active
    if (!user.isActive) {
        throw new ApiError(401, 'Your account is deactivated. Please contact support.');
    }

    // Reset login attempts
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();

    // Generate tokens
    const { accessToken, refreshToken } = tokenService.generateTokens(user);

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    res.status(200).json(
        new ApiResponse(200, {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                role: user.role,
                avatar: user.avatar,
                isMobileVerified: user.isMobileVerified
            },
            accessToken,
            refreshToken
        }, 'Login successful')
    );
});

// @desc    Login with OTP
// @route   POST /api/v1/auth/login-otp
// @access  Public
export const loginWithOTP = asyncHandler(async (req, res) => {
    const { mobile, otp } = req.body;

    // Verify OTP
    await otpService.verifyOTP(mobile, otp, OTP_PURPOSES.LOGIN);

    // Find user
    const user = await User.findOne({ mobile });

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    if (!user.isActive) {
        throw new ApiError(401, 'Your account is deactivated. Please contact support.');
    }

    // Update last login
    user.lastLogin = new Date();
    user.loginAttempts = 0;
    user.lockUntil = undefined;

    // Generate tokens
    const { accessToken, refreshToken } = tokenService.generateTokens(user);

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    res.status(200).json(
        new ApiResponse(200, {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                role: user.role,
                avatar: user.avatar,
                isMobileVerified: user.isMobileVerified
            },
            accessToken,
            refreshToken
        }, 'Login successful')
    );
});

// @desc    Forgot Password - Reset
// @route   POST /api/v1/auth/reset-password
// @access  Public
export const resetPassword = asyncHandler(async (req, res) => {
    const { mobile, otp, newPassword } = req.body;
    console.log("ppppppppppppppppppppppp", newPassword);


    // Verify OTP
    await otpService.verifyOTP(mobile, otp, OTP_PURPOSES.FORGOT_PASSWORD);

    // Find user and update password
    const user = await User.findOne({ mobile }).select('+password');

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    user.password = newPassword;
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    res.status(200).json(
        new ApiResponse(200, null, 'Password reset successful')
    );
});

// @desc    Change Password
// @route   PUT /api/v1/auth/change-password
// @access  Private
export const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
        throw new ApiError(401, 'Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json(
        new ApiResponse(200, null, 'Password changed successfully')
    );
});

// @desc    Refresh Token
// @route   POST /api/v1/auth/refresh-token
// @access  Public
export const refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken: token } = req.body;

    if (!token) {
        throw new ApiError(401, 'Refresh token is required');
    }

    // Verify refresh token
    const decoded = tokenService.verifyRefreshToken(token);

    // Find user
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== token) {
        throw new ApiError(401, 'Invalid refresh token');
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = tokenService.generateTokens(user);

    // Update refresh token
    user.refreshToken = newRefreshToken;
    await user.save();

    res.status(200).json(
        new ApiResponse(200, {
            accessToken,
            refreshToken: newRefreshToken
        }, 'Token refreshed successfully')
    );
});

// @desc    Logout
// @route   POST /api/v1/auth/logout
// @access  Private
export const logout = asyncHandler(async (req, res) => {
    // Clear refresh token
    await User.findByIdAndUpdate(req.user._id, {
        refreshToken: null
    });

    res.status(200).json(
        new ApiResponse(200, null, 'Logged out successfully')
    );
});

// @desc    Get Current User
// @route   GET /api/v1/auth/me
// @access  Private
export const getMe = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    let profile = null;

    if (user.role === 'candidate') {
        profile = await Candidate.findOne({ user: user._id });
    } else if (user.role === 'institution') {
        profile = await Institution.findOne({ user: user._id });
    }

    res.status(200).json(
        new ApiResponse(200, {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                role: user.role,
                avatar: user.avatar,
                isMobileVerified: user.isMobileVerified,
                isEmailVerified: user.isEmailVerified
            },
            profile
        }, 'User fetched successfully')
    );
});

// @desc    Update User Profile
// @route   PUT /api/v1/auth/update-profile
// @access  Private
export const updateProfile = asyncHandler(async (req, res) => {
    const { name, email } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (email && email !== req.user.email) {
        // Check if email is already taken
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new ApiError(400, 'Email already in use');
        }
        updateData.email = email;
        updateData.isEmailVerified = false;
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        updateData,
        { new: true, runValidators: true }
    );

    res.status(200).json(
        new ApiResponse(200, {
            id: user._id,
            name: user.name,
            email: user.email,
            mobile: user.mobile,
            role: user.role
        }, 'Profile updated successfully')
    );
});