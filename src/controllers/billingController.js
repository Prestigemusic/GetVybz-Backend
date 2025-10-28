// src/controllers/billingController.js
import {
  createOrUpdateSubscription,
  chargeDueSubscriptions,
  cancelSubscription,
  getOrganizationBillingDetails,
} from "../services/billingService.js";
import logger from "../utils/logger.js";

/**
 * POST /api/billing/subscribe
 * Body: { organizationId, plan, gateway?, billingCycleDays? }
 */
export const subscribe = async (req, res) => {
  try {
    const { organizationId, plan, gateway, billingCycleDays } = req.body;
    if (!organizationId || !plan)
      return res.status(400).json({ success: false, message: "organizationId and plan required" });

    const result = await createOrUpdateSubscription({
      organizationId,
      plan,
      gateway,
      billingCycleDays,
    });

    res.status(201).json({ success: true, ...result });
  } catch (err) {
    logger.error("subscribe error", err);
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/billing/charge-due
 * Manually trigger due subscription charges (admin / cron)
 */
export const runDueCharges = async (req, res) => {
  try {
    const summary = await chargeDueSubscriptions();
    res.json({ success: true, summary });
  } catch (err) {
    logger.error("runDueCharges error", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PATCH /api/billing/cancel
 * Body: { organizationId, immediate? }
 */
export const cancel = async (req, res) => {
  try {
    const { organizationId, immediate } = req.body;
    if (!organizationId)
      return res.status(400).json({ success: false, message: "organizationId required" });

    const sub = await cancelSubscription({ organizationId, immediate });
    res.json({ success: true, subscription: sub });
  } catch (err) {
    logger.error("cancelSubscription error", err);
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/billing/:organizationId
 * Fetch org’s current subscription and invoices
 */
export const getBilling = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const data = await getOrganizationBillingDetails({ organizationId });
    res.json({ success: true, ...data });
  } catch (err) {
    logger.error("getBilling error", err);
    res.status(404).json({ success: false, message: err.message });
  }
};

export default {
  subscribe,
  runDueCharges,
  cancel,
  getBilling,
};
