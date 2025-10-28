// src/services/organizationService.js
import Organization from "../models/Organization.js";
import User from "../models/User.js";
import logger from "../utils/logger.js";

/**
 * Create a new organization and assign the creator as admin
 */
export const createOrganization = async (data, creatorId) => {
  try {
    const org = new Organization({
      ...data,
      createdBy: creatorId,
      users: [{ userId: creatorId, role: "admin" }],
    });
    await org.save();
    logger.info(`✅ Organization created: ${org.name}`);
    return org;
  } catch (err) {
    logger.error("❌ createOrganization failed:", err);
    throw new Error("Organization creation failed");
  }
};

/**
 * Add a user to an organization
 */
export const addUserToOrganization = async (orgId, userId, role = "creative") => {
  try {
    const org = await Organization.findById(orgId);
    if (!org) throw new Error("Organization not found");

    const alreadyMember = org.users.some(
      (u) => u.userId.toString() === userId.toString()
    );
    if (alreadyMember) throw new Error("User already in organization");

    org.users.push({ userId, role });
    await org.save();
    logger.info(`👥 User ${userId} added to ${org.name} as ${role}`);
    return org;
  } catch (err) {
    logger.error("❌ addUserToOrganization failed:", err);
    throw err;
  }
};

/**
 * Remove a user from an organization
 */
export const removeUserFromOrganization = async (orgId, userId) => {
  try {
    const org = await Organization.findById(orgId);
    if (!org) throw new Error("Organization not found");

    org.users = org.users.filter(
      (u) => u.userId.toString() !== userId.toString()
    );
    await org.save();
    logger.info(`👤 User ${userId} removed from ${org.name}`);
    return org;
  } catch (err) {
    logger.error("❌ removeUserFromOrganization failed:", err);
    throw err;
  }
};

/**
 * Update organization subscription plan
 */
export const updateOrganizationPlan = async (orgId, newPlan) => {
  try {
    const org = await Organization.findById(orgId);
    if (!org) throw new Error("Organization not found");

    org.subscriptionPlan = newPlan;
    await org.save();
    logger.info(`💳 ${org.name} plan updated to ${newPlan}`);
    return org;
  } catch (err) {
    logger.error("❌ updateOrganizationPlan failed:", err);
    throw err;
  }
};

/**
 * Verify organization (admin use)
 */
export const verifyOrganization = async (orgId) => {
  try {
    const org = await Organization.findById(orgId);
    if (!org) throw new Error("Organization not found");

    org.verified = true;
    org.verifiedAt = new Date();
    await org.save();
    logger.info(`✅ ${org.name} verified`);
    return org;
  } catch (err) {
    logger.error("❌ verifyOrganization failed:", err);
    throw err;
  }
};

/**
 * Get organization by ID (with users populated)
 */
export const getOrganizationById = async (orgId) => {
  try {
    const org = await Organization.findById(orgId)
      .populate("users.userId", "name email role");
    if (!org) throw new Error("Organization not found");
    return org;
  } catch (err) {
    logger.error("❌ getOrganizationById failed:", err);
    throw err;
  }
};

/**
 * Get organizations for a specific user
 */
export const getOrganizationsForUser = async (userId) => {
  try {
    const orgs = await Organization.find({ "users.userId": userId })
      .populate("users.userId", "name email role");
    return orgs;
  } catch (err) {
    logger.error("❌ getOrganizationsForUser failed:", err);
    throw err;
  }
};

/**
 * Check if a user has a specific role in an organization
 */
export const checkUserRoleInOrg = async (orgId, userId, role) => {
  const org = await Organization.findById(orgId);
  if (!org) throw new Error("Organization not found");

  const member = org.users.find((u) => u.userId.toString() === userId.toString());
  return member && (role ? member.role === role : !!member);
};

/**
 * (Stub) Handle billing update
 * Will later integrate with billingService (Paystack/Flutterwave)
 */
export const updateBillingInfo = async (orgId, billingData) => {
  const org = await Organization.findById(orgId);
  if (!org) throw new Error("Organization not found");

  org.billingInfo = { ...org.billingInfo, ...billingData };
  await org.save();
  logger.info(`💰 Billing info updated for ${org.name}`);
  return org;
};

export default {
  createOrganization,
  addUserToOrganization,
  removeUserFromOrganization,
  updateOrganizationPlan,
  verifyOrganization,
  getOrganizationById,
  getOrganizationsForUser,
  checkUserRoleInOrg,
  updateBillingInfo,
};
