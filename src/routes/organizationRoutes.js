// src/routes/organizationRoutes.js
import express from "express";
import {
  createOrganization,
  addUserToOrganization,
  removeUserFromOrganization,
  updateOrganizationPlan,
  verifyOrganization,
  getOrganizationById,
  getOrganizationsForUser,
  updateBillingInfo,
} from "../services/organizationService.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Create organization
router.post("/", protect, async (req, res) => {
  try {
    const org = await createOrganization(req.body, req.user.id);
    res.status(201).json({ success: true, data: org });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Add user
router.post("/:id/users", protect, async (req, res) => {
  try {
    const org = await addUserToOrganization(req.params.id, req.body.userId, req.body.role);
    res.json({ success: true, data: org });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Remove user
router.delete("/:id/users/:userId", protect, async (req, res) => {
  try {
    const org = await removeUserFromOrganization(req.params.id, req.params.userId);
    res.json({ success: true, data: org });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update plan
router.patch("/:id/plan", protect, async (req, res) => {
  try {
    const org = await updateOrganizationPlan(req.params.id, req.body.newPlan);
    res.json({ success: true, data: org });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Verify org
router.patch("/:id/verify", protect, async (req, res) => {
  try {
    const org = await verifyOrganization(req.params.id);
    res.json({ success: true, data: org });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update billing info
router.patch("/:id/billing", protect, async (req, res) => {
  try {
    const org = await updateBillingInfo(req.params.id, req.body);
    res.json({ success: true, data: org });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get org by ID
router.get("/:id", protect, async (req, res) => {
  try {
    const org = await getOrganizationById(req.params.id);
    res.json({ success: true, data: org });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
});

// Get all orgs for logged-in user
router.get("/", protect, async (req, res) => {
  try {
    const orgs = await getOrganizationsForUser(req.user.id);
    res.json({ success: true, data: orgs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
