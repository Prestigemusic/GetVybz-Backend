import Job from "../models/jobModel.js";
import User from "../models/userModel.js";

// ✅ Create a new job
export const createJob = async (req, res) => {
  try {
    const { proId, description, scheduledDate, location, price } = req.body;

    if (!proId || !description) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const newJob = await Job.create({
      clientId: req.user._id,
      proId,
      description,
      scheduledDate,
      location,
      price,
      status: "pending",
    });

    res.status(201).json(newJob);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Get jobs for logged-in user
export const getUserJobs = async (req, res) => {
  try {
    const jobs = await Job.find({
      $or: [{ clientId: req.user._id }, { proId: req.user._id }],
    })
      .populate("proId", "name email role")
      .populate("clientId", "name email role")
      .sort({ createdAt: -1 });

    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Get jobs assigned to a Pro
export const getProJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ proId: req.user._id })
      .populate("clientId", "name email role")
      .sort({ createdAt: -1 });

    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Get single job details
export const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate("proId", "name email role")
      .populate("clientId", "name email role");

    if (!job) return res.status(404).json({ message: "Job not found." });

    res.json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Update job status
export const updateJobStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ["pending", "accepted", "in_progress", "completed", "canceled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found." });

    job.status = status;
    await job.save();

    res.json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Delete job
export const deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found." });

    if (job.clientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized to delete this job." });
    }

    await job.deleteOne();
    res.json({ message: "Job deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};