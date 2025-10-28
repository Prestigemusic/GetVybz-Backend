import express from "express";
import {
  createOrUpdateSubscription,
  chargeDueSubscriptions,
  cancelSubscription,
  getOrganizationBillingDetails,
} from "../services/billingService.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import logger from "../utils/logger.js";

const router = express.Router();

/**
 * @route POST /api/billing/subscribe/:orgId
 * @desc Create or update an organization’s subscription
 * @access Protected (Org Admin)
 */
router.post("/subscribe/:orgId", protect, requireRole("orgAdmin"), async (req, res) => {
  try {
    const { plan, gateway, billingCycleDays } = req.body;
    const { orgId } = req.params;

    const { subscription, invoice } = await createOrUpdateSubscription({
      organizationId: orgId,
      plan,
      gateway,
      billingCycleDays,
    });

    res.json({
      success: true,
      message: "Subscription successfully created or updated",
      data: { subscription, invoice },
    });
  } catch (err) {
    logger.error("billingRoutes subscribe failed", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /api/billing/org/:orgId
 * @desc Get organization subscription & invoice history
 * @access Protected
 */
router.get("/org/:orgId", protect, async (req, res) => {
  try {
    const { orgId } = req.params;
    const data = await getOrganizationBillingDetails({ organizationId: orgId });
    res.json({ success: true, data });
  } catch (err) {
    logger.error("billingRoutes getOrganizationBillingDetails failed", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/billing/charge-due
 * @desc Trigger billing run (cron/scheduler)
 * @access Admin
 */
router.post("/charge-due", protect, requireRole("admin"), async (req, res) => {
  try {
    const result = await chargeDueSubscriptions();
    res.json({ success: true, result });
  } catch (err) {
    logger.error("billingRoutes chargeDue failed", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/billing/cancel/:orgId
 * @desc Cancel subscription (optionally immediate)
 * @access Protected
 */
router.post("/cancel/:orgId", protect, requireRole("orgAdmin"), async (req, res) => {
  try {
    const { orgId } = req.params;
    const { immediate } = req.body;
    const sub = await cancelSubscription({ organizationId: orgId, immediate });
    res.json({ success: true, data: sub });
  } catch (err) {
    logger.error("billingRoutes cancel failed", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
