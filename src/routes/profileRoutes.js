// src/routes/profileRoutes.js
import express from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * Utility: sanitize user object before sending to client
 */
function sanitizeUser(u) {
  if (!u) return null;
  return {
    id: u._id,
    name: u.name,
    email: u.email,
    username: u.username || "",
    profilePicture: u.profilePicture || u.avatarUri || null,
    banner: u.coverPhoto || u.bannerUri || null,
    bio: u.bio || "",
    role: u.role || "customer",
    services: u.services || [],
    location: u.location || "",
    rateCard: u.rateCard || [],
    followers: u.followers || [],
    following: u.following || [],
    rating: u.rating || 0,
    isVerified: !!u.isVerified,
    isBoosted: !!u.isBoosted,
    createdAt: u.createdAt,
  };
}

/**
 * GET /api/profiles/me
 * Returns current logged-in user profile (protected)
 */
router.get("/me", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const user = await User.findById(userId).select("-password").lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    // Compute some aggregated fields for pros
    if (user.role === "pro") {
      user.avgRating =
        user.reviews && user.reviews.length > 0
          ? Number(
              (
                user.reviews.reduce((s, r) => s + (r.rating || 0), 0) /
                user.reviews.length
              ).toFixed(2)
            )
          : null;

      user.minPrice =
        user.rateCard && user.rateCard.length > 0
          ? Math.min(...user.rateCard.map((r) => r.price || Infinity))
          : null;
    }

    return res.json(sanitizeUser(user));
  } catch (err) {
    console.error("Error GET /api/profiles/me:", err);
    return res.status(500).json({ error: "Failed to fetch profile" });
  }
});

/**
 * PUT /api/profiles/me
 * Update current user profile (protected)
 */
router.put("/me", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const { name, location, bio, avatarUri, bannerUri, email } = req.body || {};

    if (typeof email !== "undefined") {
      return res
        .status(400)
        .json({ error: "Email updates are not allowed via this endpoint" });
    }

    const update = {};
    if (typeof name === "string" && name.trim().length) update.name = name.trim();
    if (typeof location === "string") update.location = location.trim();
    if (typeof bio === "string") update.bio = bio;
    if (typeof avatarUri === "string") update.avatarUri = avatarUri;
    if (typeof bannerUri === "string") update.bannerUri = bannerUri;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: update },
      { new: true }
    ).select("-password").lean();

    if (!updated) return res.status(404).json({ error: "User not found" });

    if (updated.role === "pro") {
      updated.avgRating =
        updated.reviews && updated.reviews.length > 0
          ? Number(
              (
                updated.reviews.reduce((s, r) => s + (r.rating || 0), 0) /
                updated.reviews.length
              ).toFixed(2)
            )
          : null;

      updated.minPrice =
        updated.rateCard && updated.rateCard.length > 0
          ? Math.min(...updated.rateCard.map((r) => r.price || Infinity))
          : null;
    }

    return res.json(sanitizeUser(updated));
  } catch (err) {
    console.error("Error PUT /api/profiles/me:", err);
    return res.status(500).json({ error: "Failed to update profile" });
  }
});

/**
 * GET /api/profiles/pros
 * List pros with filtering, sorting, and pagination
 */
router.get("/pros", async (req, res) => {
  try {
    const {
      minPrice,
      maxPrice,
      rating,
      location,
      date,
      services,
      isVerified,
      isBoosted,
      sort,
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Number(limit) || 20);
    const skip = (pageNum - 1) * pageSize;

    const match = { role: "pro" };

    if (location) match.location = { $regex: String(location), $options: "i" };
    if (services) {
      const svcArr = String(services)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (svcArr.length) {
        match.services = { $in: svcArr.map((s) => new RegExp(`^${escapeRegex(s)}`, "i")) };
      }
    }
    if (typeof isVerified !== "undefined") {
      const v = String(isVerified).toLowerCase();
      if (v === "true" || v === "false") match.isVerified = v === "true";
    }
    if (typeof isBoosted !== "undefined") {
      const b = String(isBoosted).toLowerCase();
      if (b === "true" || b === "false") match.isBoosted = b === "true";
    }

    const pipeline = [{ $match: match }];

    // Aggregated fields
    pipeline.push({
      $addFields: {
        avgRating: {
          $cond: [
            { $gt: [{ $size: { $ifNull: ["$reviews", []] } }, 0] },
            { $avg: "$reviews.rating" },
            null,
          ],
        },
        minPrice: {
          $cond: [
            { $gt: [{ $size: { $ifNull: ["$rateCard", []] } }, 0] },
            { $min: "$rateCard.price" },
            null,
          ],
        },
      },
    });

    // Price filter
    const priceFilters = {};
    if (minPrice !== undefined && String(minPrice).trim() !== "") {
      const mn = Number(minPrice);
      if (!Number.isNaN(mn)) priceFilters.$gte = mn;
    }
    if (maxPrice !== undefined && String(maxPrice).trim() !== "") {
      const mx = Number(maxPrice);
      if (!Number.isNaN(mx)) priceFilters.$lte = mx;
    }
    if (Object.keys(priceFilters).length) {
      pipeline.push({ $match: { minPrice: priceFilters } });
    }

    // Rating filter
    if (rating !== undefined && String(rating).trim() !== "") {
      const r = Number(rating);
      if (!Number.isNaN(r)) {
        pipeline.push({
          $match: {
            $or: [{ avgRating: { $gte: r } }, { avgRating: null }],
          },
        });
      }
    }

    // Project fields
    pipeline.push({
      $project: {
        name: 1,
        email: 1,
        avatarUri: 1,
        bannerUri: 1,
        bio: 1,
        services: 1,
        location: 1,
        rateCard: 1,
        minPrice: 1,
        avgRating: 1,
        reviews: 1,
        isVerified: 1,
        isBoosted: 1,
        bookingDates: 1,
        gallery: 1,
        createdAt: 1,
      },
    });

    // Sort stage
    const sortStage = {};
    switch (sort) {
      case "priceAsc":
        sortStage.minPrice = 1;
        break;
      case "priceDesc":
        sortStage.minPrice = -1;
        break;
      case "ratingAsc":
        sortStage.avgRating = 1;
        break;
      case "ratingDesc":
        sortStage.avgRating = -1;
        break;
      case "verifiedFirst":
        sortStage.isVerified = -1;
        sortStage.isBoosted = -1;
        sortStage.avgRating = -1;
        break;
      case "boostedFirst":
        sortStage.isBoosted = -1;
        sortStage.isVerified = -1;
        sortStage.avgRating = -1;
        break;
      case "newest":
        sortStage.createdAt = -1;
        break;
      default:
        sortStage.isBoosted = -1;
        sortStage.isVerified = -1;
        sortStage.avgRating = -1;
        sortStage.name = 1;
    }

    const countPipeline = [...pipeline, { $count: "total" }];
    pipeline.push({ $sort: sortStage }, { $skip: skip }, { $limit: pageSize });

    const [items, countResult] = await Promise.all([
      User.aggregate(pipeline).exec(),
      User.aggregate(countPipeline).exec(),
    ]);

    let total = Array.isArray(countResult) && countResult.length ? countResult[0].total : 0;

    // Date filter client-side
    let finalItems = items;
    if (date) {
      const dateStr = String(date).trim();
      finalItems = items.filter((p) => {
        if (!p.bookingDates) return true;
        if (typeof p.bookingDates === "object" && !Array.isArray(p.bookingDates))
          return !p.bookingDates[dateStr];
        if (Array.isArray(p.bookingDates)) return !p.bookingDates.includes(dateStr);
        return true;
      });
      total = finalItems.length;
    }

    return res.json({
      results: finalItems,
      meta: { total, page: pageNum, limit: pageSize, pages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    console.error("Error GET /api/profiles/pros:", err);
    return res.status(500).json({ error: "Failed to fetch pros" });
  }
});

/**
 * GET /api/profiles/pros/:id
 */
router.get("/pros/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid ID" });

    const item = await User.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id), role: "pro" } },
      {
        $addFields: {
          avgRating: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ["$reviews", []] } }, 0] },
              { $avg: "$reviews.rating" },
              null,
            ],
          },
          minPrice: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ["$rateCard", []] } }, 0] },
              { $min: "$rateCard.price" },
              null,
            ],
          },
        },
      },
      {
        $project: {
          name: 1,
          email: 1,
          avatarUri: 1,
          bannerUri: 1,
          bio: 1,
          services: 1,
          location: 1,
          rateCard: 1,
          minPrice: 1,
          avgRating: 1,
          reviews: 1,
          isVerified: 1,
          isBoosted: 1,
          bookingDates: 1,
          gallery: 1,
          createdAt: 1,
        },
      },
    ]).exec();

    if (!item || item.length === 0) return res.status(404).json({ error: "Pro not found" });

    return res.json(item[0]);
  } catch (err) {
    console.error("Error GET /api/profiles/pros/:id", err);
    return res.status(500).json({ error: "Failed to fetch pro details" });
  }
});

/**
 * Utility: escape regex input
 */
function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default router;
