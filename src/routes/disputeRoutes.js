// src/routes/disputeRoutes.js
import express from "express";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import disputeController from "../controllers/disputeController.js";

const router = express.Router();

/**
 * Public (authenticated) routes
 */
router.post("/create", protect, disputeController.createDispute);
router.post("/:id/evidence", protect, disputeController.addEvidence);
router.get("/mine", protect, disputeController.myDisputes);
router.get("/:id", protect, disputeController.getDispute);

/**
 * Admin routes
 */
router.post("/:id/resolve", protect, requireRole("admin"), disputeController.resolveDispute);

export default router;
