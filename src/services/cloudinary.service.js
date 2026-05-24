import cloudinary from '../config/cloudinary.config.js';
import fs from 'fs';
import ApiError from '../utils/ApiError.js';
import { CLOUDINARY_FOLDERS } from '../utils/constants.js';

class CloudinaryService {
    // Upload file to Cloudinary
    async uploadFile(filePath, folder, options = {}) {
        try {
            const uploadOptions = {
                folder: folder,
                resource_type: 'auto',
                ...options
            };

            const result = await cloudinary.uploader.upload(filePath, uploadOptions);

            // Delete local file after upload
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            return {
                public_id: result.public_id,
                url: result.secure_url,
                format: result.format,
                size: result.bytes,
                width: result.width,
                height: result.height
            };
        } catch (error) {
            // Delete local file on error
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            throw new ApiError(500, `File upload failed: ${error.message}`);
        }
    }

    // Upload avatar
    async uploadAvatar(filePath, userId) {
        return this.uploadFile(filePath, CLOUDINARY_FOLDERS.AVATARS, {
            public_id: `avatar_${userId}`,
            overwrite: true,
            transformation: [
                { width: 300, height: 300, crop: 'fill', gravity: 'face' },
                { quality: 'auto' }
            ]
        });
    }

    // Upload resume
    async uploadResume(filePath, userId) {
        return this.uploadFile(filePath, CLOUDINARY_FOLDERS.RESUMES, {
            public_id: `resume_${userId}_${Date.now()}`,
            resource_type: 'raw'
        });
    }

    // Upload logo
    async uploadLogo(filePath, institutionId) {
        return this.uploadFile(filePath, CLOUDINARY_FOLDERS.LOGOS, {
            public_id: `logo_${institutionId}`,
            overwrite: true,
            transformation: [
                { width: 200, height: 200, crop: 'fit' },
                { quality: 'auto' }
            ]
        });
    }

    // Upload banner
    async uploadBanner(filePath, entityId, entityType) {
        return this.uploadFile(filePath, CLOUDINARY_FOLDERS.BANNERS, {
            public_id: `banner_${entityType}_${entityId}`,
            overwrite: true,
            transformation: [
                { width: 1200, height: 400, crop: 'fill' },
                { quality: 'auto' }
            ]
        });
    }

    // Upload document// Upload document
async uploadDocument(filePath, userId, docName) {
    const result = await this.uploadFile(filePath, CLOUDINARY_FOLDERS.DOCUMENTS, {
        public_id: `doc_${userId.toString()}_${docName.replace(/\s+/g, '_')}_${Date.now()}`,
        resource_type: 'raw'
    });
    
    // Return only needed fields
    return {
        public_id: result.public_id,
        url: result.url
    };
}

    // Upload gallery image
    async uploadGalleryImage(filePath, entityId) {
        return this.uploadFile(filePath, CLOUDINARY_FOLDERS.GALLERY, {
            public_id: `gallery_${entityId}_${Date.now()}`,
            transformation: [
                { width: 800, height: 600, crop: 'fill' },
                { quality: 'auto' }
            ]
        });
    }

    // Delete file from Cloudinary
    async deleteFile(publicId, resourceType = 'image') {
        try {
            const result = await cloudinary.uploader.destroy(publicId, {
                resource_type: resourceType
            });
            return result;
        } catch (error) {
            throw new ApiError(500, `File deletion failed: ${error.message}`);
        }
    }

    // Delete multiple files
    async deleteFiles(publicIds, resourceType = 'image') {
        try {
            const result = await cloudinary.api.delete_resources(publicIds, {
                resource_type: resourceType
            });
            return result;
        } catch (error) {
            throw new ApiError(500, `Files deletion failed: ${error.message}`);
        }
    }

    // Get file info
    async getFileInfo(publicId) {
        try {
            const result = await cloudinary.api.resource(publicId);
            return result;
        } catch (error) {
            throw new ApiError(404, 'File not found');
        }
    }
}

export default new CloudinaryService();