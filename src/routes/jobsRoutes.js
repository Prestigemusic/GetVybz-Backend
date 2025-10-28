import express from "express";
import {
  createJob,
  getUserJobs,
  getProJobs,
  updateJobStatus,
  getJobById,
  deleteJob,
} from "../controllers/jobsController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ Create a job (Client → Pro)
router.post("/", protect, createJob);

// ✅ Get all jobs for logged-in user (Client or Pro)
router.get("/my-jobs", protect, getUserJobs);

// ✅ Get all jobs for a specific Pro
router.get("/pro", protect, getProJobs);

// ✅ Get single job details
router.get("/:id", protect, getJobById);

// ✅ Update job status (accept, complete, cancel)
router.put("/:id/status", protect, updateJobStatus);

// ✅ Delete a job
router.delete("/:id", protect, deleteJob);

export default router;
