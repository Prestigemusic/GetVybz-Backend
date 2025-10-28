// src/routes/upload.js
import express from "express";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import dotenv from "dotenv";
import { protect } from "../middleware/authMiddleware.js";
import cloudinary from "../config/cloudinary.js";
import logger from "../utils/logger.js";
import User from "../models/User.js";

dotenv.config();
const router = express.Router();

/** 🔹 Folder path helper */
const getFolderPath = (type = "general") => {
  switch (type) {
    case "profile":
      return "getvybz/profile_pictures";
    case "verification":
      return "getvybz/verification_docs";
    case "portfolio":
      return "getvybz/portfolio_media";
    default:
      return "getvybz/uploads";
  }
};

/** 🔹 Multer Cloudinary Storage */
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const type = (req.query.type || req.body.type || "general").toString();
    const folder = getFolderPath(type);
    const resource_type = file.mimetype.startsWith("video/")
      ? "video"
      : file.mimetype === "application/pdf"
      ? "raw"
      : "image";

    return {
      folder,
      allowed_formats: ["jpg", "png", "jpeg", "webp", "pdf", "mp4"],
      transformation: file.mimetype.startsWith("image/")
        ? [{ quality: "auto", fetch_format: "auto" }]
        : [],
      resource_type,
    };
  },
});

const upload = multer({ storage });

/**
 * ✅ POST /api/upload
 * Upload single file
 */
router.post("/", protect, upload.single("file"), async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    logger.info(`📸 Upload by user ${req.user?.id || "unknown"} -> ${req.file.path}`);

    return res.status(200).json({
      success: true,
      message: "Upload successful 🚀",
      url: req.file.path,
      secure_url: req.file.path,
      public_id: req.file.filename,
      resource_type: req.file.mimetype.startsWith("video/")
        ? "video"
        : req.file.mimetype === "application/pdf"
        ? "raw"
        : "image",
    });
  } catch (err) {
    logger.error("❌ Upload error:", err);
    return res.status(500).json({ success: false, error: "Upload failed", details: err?.message });
  }
});

/**
 * ✅ DELETE /api/upload
 * Delete single Cloudinary file
 */
router.delete("/", protect, async (req, res) => {
  try {
    const public_id = req.query.public_id || req.body.public_id;
    let resource_type = (req.query.resource_type || req.body.resource_type || "image").toString();

    if (!public_id) {
      return res.status(400).json({ success: false, error: "Missing public_id" });
    }

    resource_type = resource_type.toLowerCase();
    if (!["image", "video", "raw"].includes(resource_type)) {
      return res.status(400).json({ success: false, error: "Invalid resource_type" });
    }

    logger.info(`🗑️ Deleting asset ${public_id} (${resource_type}) by user ${req.user?.id}`);

    const result = await cloudinary.uploader.destroy(public_id, { resource_type });
    if (result?.result === "ok" || result?.result === "deleted") {
      return res.status(200).json({ success: true, message: "Deleted", result });
    }

    return res.status(200).json({ success: false, message: "Delete non-ok result", result });
  } catch (err) {
    logger.error("❌ Cloudinary delete error:", err);
    return res.status(500).json({ success: false, error: "Delete failed", details: err?.message });
  }
});

/**
 * ✅ DELETE /api/upload/bulk
 * Bulk delete multiple Cloudinary files
 * body: { files: [{ public_id, resource_type }] }
 */
router.delete("/bulk", protect, async (req, res) => {
  try {
    const { files } = req.body;
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ success: false, error: "No files provided" });
    }

    logger.info(`🧹 Bulk deleting ${files.length} files by user ${req.user?.id}`);

    const results = await Promise.allSettled(
      files.map((file) =>
        cloudinary.uploader.destroy(file.public_id, {
          resource_type: file.resource_type || "image",
        })
      )
    );

    const summary = results.map((r, i) => ({
      file: files[i],
      status: r.status,
      result: r.value || r.reason?.message,
    }));

    return res.status(200).json({ success: true, summary });
  } catch (err) {
    logger.error("❌ Bulk delete error:", err);
    return res.status(500).json({ success: false, error: "Bulk delete failed", details: err?.message });
  }
});

/**
 * ✅ POST /api/upload/profile/replace
 * Upload new profile picture, update user, delete old one
 */
router.post("/profile/replace", protect, upload.single("file"), async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ success: false, error: "No new profile image uploaded" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    const oldPublicId = user.profileImagePublicId;
    const newImageUrl = req.file.path;
    const newPublicId = req.file.filename;

    // Update user
    user.profileImage = newImageUrl;
    user.profileImagePublicId = newPublicId;
    await user.save();

    logger.info(`👤 Updated profile image for user ${user._id}`);

    // Delete old image if exists
    if (oldPublicId) {
      try {
        await cloudinary.uploader.destroy(oldPublicId, { resource_type: "image" });
        logger.info(`🗑️ Deleted old profile image ${oldPublicId}`);
      } catch (e) {
        logger.warn(`⚠️ Failed to delete old profile image: ${oldPublicId}`, e.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Profile image replaced successfully 🚀",
      user: {
        id: user._id,
        profileImage: newImageUrl,
        profileImagePublicId: newPublicId,
      },
    });
  } catch (err) {
    logger.error("❌ Profile replace error:", err);
    return res.status(500).json({ success: false, error: "Profile replace failed", details: err?.message });
  }
});

export default router;
