// src/services/uploadService.js
/**
 * Upload Service (Cloudinary)
 * - Supports safe import of cloudinary whether your config exports default or named export
 * - Uploads via base64 (useful for mobile direct uploads), local file path, or server-side streams
 * - Provides a server-signed upload signature for direct (client) uploads
 * - Delete / bulk delete helpers
 *
 * Usage:
 * import uploadService from "../services/uploadService.js";
 * const res = await uploadService.uploadBase64(base64String, { folder: 'getvybz/profile_pictures', public_id: 'user_123' });
 *
 * Important:
 * - For client (mobile/browser) direct uploads using signed requests, call getUploadSignature({ folder, public_id, timestamp })
 * - Ensure CLOUDINARY_* env vars are set in your .env (cloud_name, api_key, api_secret)
 */

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import logger from "../utils/logger.js";
import * as cloudinaryModule from "../config/cloudinary.js";

/**
 * Resolve cloudinary export gracefully:
 * - support: export default cloudinary
 * - support: export { cloudinary }
 * - support: module.exports = cloudinary (CommonJS interop)
 */
const _cloudinary =
  cloudinaryModule?.cloudinary ?? cloudinaryModule?.default ?? cloudinaryModule;

/* -------------------------
   Config / Defaults
   ------------------------- */
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/heic",
];

const DEFAULT_FOLDERS = {
  profile: "getvybz/profile_pictures",
  banner: "getvybz/banner_images",
  gig: "getvybz/gig_images",
  verification: "getvybz/verification_docs",
};

/* -------------------------
   Helpers
   ------------------------- */

/**
 * Normalize cloudinary response to a small result object
 */
function _normalizeUploadResult(res) {
  if (!res) return null;
  return {
    public_id: res.public_id,
    version: res.version,
    url: res.url || res.secure_url || null,
    secure_url: res.secure_url || res.url || null,
    width: res.width,
    height: res.height,
    format: res.format,
    bytes: res.bytes,
    resource_type: res.resource_type,
    created_at: res.created_at,
    raw_response: res,
  };
}

/**
 * Validate content-type and size
 */
function _validateFile({ contentType, size, maxSize = DEFAULT_MAX_FILE_SIZE }) {
  if (!contentType) {
    throw new Error("Missing contentType for uploaded file.");
  }
  if (!ALLOWED_IMAGE_MIMES.includes(contentType)) {
    throw new Error(`Unsupported file type: ${contentType}`);
  }
  if (size && size > maxSize) {
    throw new Error(`File too large. Max allowed is ${maxSize} bytes.`);
  }
}

/* -------------------------
   Main Service
   ------------------------- */
const uploadService = {
  /**
   * Upload image from a base64 string (data URI or raw base64)
   * Useful for client-side uploads where file binary is sent to server.
   *
   * @param {string} base64 - data URI or raw base64 string
   * @param {Object} options - { folder, public_id, resource_type='image', overwrite=true, transformation, timeout }
   * @returns normalized cloudinary result
   */
  async uploadBase64(base64, options = {}) {
    if (!_cloudinary) {
      throw new Error("Cloudinary is not configured correctly.");
    }

    const {
      folder = DEFAULT_FOLDERS.profile,
      public_id,
      resource_type = "image",
      overwrite = true,
      transformation,
      timeout = 60000,
    } = options;

    // Normalize base64 - allow both data URI and plain base64
    let dataUri = base64;
    if (!/^data:/.test(base64)) {
      // assume jpeg if unknown (caller should provide correct format ideally)
      dataUri = `data:image/jpeg;base64,${base64}`;
    }

    try {
      const res = await _cloudinary.uploader.upload(dataUri, {
        folder,
        public_id,
        resource_type,
        overwrite,
        transformation,
        timeout,
      });
      return _normalizeUploadResult(res);
    } catch (err) {
      logger.error("uploadBase64 failed:", err);
      throw err;
    }
  },

  /**
   * Upload a local file path from the server
   * @param {string} filePath - absolute or relative path to file
   * @param {Object} options - { folder, public_id, resource_type='image', overwrite=true, transformation }
   */
  async uploadFromPath(filePath, options = {}) {
    if (!_cloudinary) throw new Error("Cloudinary is not configured correctly.");

    const resolvedPath = path.resolve(filePath);
    // read file to inspect size & mime (we won't check mime strictly here - assume caller knows)
    let stat;
    try {
      stat = await fs.stat(resolvedPath);
    } catch (err) {
      throw new Error(`File not found: ${resolvedPath}`);
    }

    // optional validation
    if (stat.size > DEFAULT_MAX_FILE_SIZE) {
      throw new Error(`File too large (${stat.size} bytes). Max allowed is ${DEFAULT_MAX_FILE_SIZE}.`);
    }

    const { folder = DEFAULT_FOLDERS.gig, public_id, resource_type = "image", overwrite = true, transformation } = options;

    try {
      const res = await _cloudinary.uploader.upload(resolvedPath, {
        folder,
        public_id,
        resource_type,
        overwrite,
        transformation,
      });
      return _normalizeUploadResult(res);
    } catch (err) {
      logger.error("uploadFromPath failed:", err);
      throw err;
    }
  },

  /**
   * Generate a signed upload signature for direct client uploads.
   * Cloudinary server-side signature creation requires the cloudinary api_secret.
   *
   * Client should send parameters (folder, public_id, eager, etc.)
   * We sign a safe subset (folder, public_id, timestamp) - avoid signing sensitive params on client.
   *
   * @param {Object} params - allowed: { folder, public_id, eager? }
   * @returns {Object} - { api_key, cloud_name, timestamp, signature, folder, public_id }
   */
  getUploadSignature(params = {}) {
    if (!_cloudinary) throw new Error("Cloudinary is not configured correctly.");

    const allowed = {};
    if (params.folder) allowed.folder = params.folder;
    if (params.public_id) allowed.public_id = params.public_id;
    // Note: do not include timestamp; we set it server-side to prevent replay windows being too long
    const timestamp = Math.floor(Date.now() / 1000);
    const toSign = { ...allowed, timestamp };

    // cloudinary.utils.api_sign_request exists in v2
    if (!_cloudinary.utils || typeof _cloudinary.utils.api_sign_request !== "function") {
      // fallback: manual sign using api_secret and sorted params (defensive)
      const sortedKeys = Object.keys(toSign).sort();
      const toSignStr = sortedKeys.map((k) => `${k}=${toSign[k]}`).join("&");
      const signature = crypto.createHmac("sha1", process.env.CLOUDINARY_API_SECRET || "").update(toSignStr).digest("hex");
      return {
        api_key: process.env.CLOUDINARY_API_KEY,
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        timestamp,
        signature,
        ...allowed,
      };
    }

    const signature = _cloudinary.utils.api_sign_request(toSign, process.env.CLOUDINARY_API_SECRET || "");
    return {
      api_key: process.env.CLOUDINARY_API_KEY,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      timestamp,
      signature,
      ...allowed,
    };
  },

  /**
   * Delete a single public id
   * @param {string} publicId
   */
  async deletePublicId(publicId, options = { resource_type: "image" }) {
    if (!_cloudinary) throw new Error("Cloudinary is not configured correctly.");
    try {
      const res = await _cloudinary.uploader.destroy(publicId, options);
      return res;
    } catch (err) {
      logger.error("deletePublicId failed:", err);
      throw err;
    }
  },

  /**
   * Bulk delete public ids (parallel, resilient)
   * @param {string[]} publicIds
   */
  async bulkDelete(publicIds = [], options = { resource_type: "image" }) {
    if (!_cloudinary) throw new Error("Cloudinary is not configured correctly.");
    if (!Array.isArray(publicIds) || publicIds.length === 0) return { deleted: 0, failed: 0 };

    const results = await Promise.allSettled(
      publicIds.map((id) => _cloudinary.uploader.destroy(id, options))
    );

    const deleted = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    logger.info(`bulkDelete: deleted=${deleted} failed=${failed}`);
    return { deleted, failed, raw: results };
  },

  /**
   * Utility: Validate and upload an incoming multipart file (express/multer style)
   * This helper expects the file object to be like: { buffer, mimetype, size, originalname }
   *
   * @param {Object} file
   * @param {Object} options - { folder, public_id, maxSize, resource_type }
   */
  async uploadFromBufferFile(file, options = {}) {
    if (!_cloudinary) throw new Error("Cloudinary is not configured correctly.");
    if (!file) throw new Error("No file provided to uploadFromBufferFile.");

    const { buffer, mimetype, size, originalname } = file;
    _validateFile({ contentType: mimetype, size, maxSize: options.maxSize || DEFAULT_MAX_FILE_SIZE });

    // Convert buffer to base64 data URI - avoid adding extra dependencies
    const base64 = buffer.toString("base64");
    const dataUri = `data:${mimetype};base64,${base64}`;

    const uploadOpts = {
      folder: options.folder || DEFAULT_FOLDERS.gig,
      public_id: options.public_id,
      resource_type: options.resource_type || "image",
      overwrite: options.overwrite ?? true,
      transformation: options.transformation,
    };

    return await this.uploadBase64(dataUri, uploadOpts);
  },

  /**
   * Convenience: returns the default folder for a type
   */
  getDefaultFolder(type = "profile") {
    return DEFAULT_FOLDERS[type] || DEFAULT_FOLDERS.profile;
  },

  /**
   * Validate allowed mime and size for a proposed upload (useful for endpoints)
   */
  validateMimeAndSize(mime, size, maxSize = DEFAULT_MAX_FILE_SIZE) {
    return _validateFile({ contentType: mime, size, maxSize });
  },

  /**
   * Expose raw cloudinary instance for advanced uses
   */
  raw() {
    return _cloudinary;
  },
};

/* named and default exports for compatibility */
export { uploadService };
export default uploadService;
