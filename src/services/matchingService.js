// src/services/matchingService.js
/**
 * Matching service
 *
 * Deterministic multi-factor scoring:
 * - tag/skill overlap (weight 30%)
 * - availability overlap (weight 15%)
 * - price fit (weight 15%)
 * - location proximity (weight 10%)
 * - rating/trustScore (weight 20%)
 * - optional semantic similarity via OpenAI embeddings (weight 10%)
 *
 * Total weights adjusted to sum to 100.
 */

import User from "../models/User.js"; // pros are users with role 'pro'
import Booking from "../models/Booking.js";
import logger from "../utils/logger.js";
import { embedText, cosineSimilarity } from "./openaiAdapter.js";
import mongoose from "mongoose";

/**
 * Helper: compute deterministic score for a candidate against booking params
 */
function deterministicScore(candidate, { requiredTags = [], budgetMin = 0, budgetMax = Infinity, location = null, bookingDate = null }) {
  // tag match: fraction of requiredTags present in candidate.skills/tags
  const candidateTags = Array.isArray(candidate.skills) ? candidate.skills.map(t => t.toLowerCase()) : [];
  const required = requiredTags.map(t => String(t).toLowerCase());
  const tagMatches = required.length === 0 ? 1 : (required.filter(t => candidateTags.includes(t)).length / required.length);

  // availability: candidate.availability is array of dates/ranges — fallback 1
  let availabilityScore = 1;
  if (bookingDate && Array.isArray(candidate.availability) && candidate.availability.length > 0) {
    // simple check: if any availability date equals bookingDate (date only)
    const bday = new Date(bookingDate).toDateString();
    availabilityScore = candidate.availability.some(d => new Date(d).toDateString() === bday) ? 1 : 0.5;
  }

  // price fit: if candidate.rate within budget range -> 1, else linearly degrade
  const rate = candidate.rate || candidate.hourlyRate || 0;
  let priceScore = 0.5;
  if (rate === 0) priceScore = 0.5;
  else if (rate >= budgetMin && rate <= budgetMax) priceScore = 1;
  else {
    // distance from budget range
    const mid = (budgetMin + budgetMax) / 2 || budgetMax || budgetMin;
    const diff = Math.abs(rate - mid);
    // map diff to [0,1] with tolerance
    priceScore = Math.max(0, 1 - diff / Math.max(mid, 1) );
    priceScore = 0.3 + 0.7 * priceScore; // keep baseline
  }

  // location: simple equality / substring check (could be lat/long later)
  let locationScore = 1;
  if (location && candidate.location) {
    const loc = String(location).toLowerCase();
    const candLoc = String(candidate.location).toLowerCase();
    locationScore = candLoc.includes(loc) || loc.includes(candLoc) ? 1 : 0.6;
  }

  // rating/trustScore
  const rating = candidate.rating || 0;
  const trust = candidate.trustScore || 50;
  const ratingScore = (rating / 5) * 100; // 0..100
  const trustScore = trust; // 0..100

  // Normalize sub-scores to 0..1
  const tagS = tagMatches;
  const availS = availabilityScore;
  const priceS = priceScore;
  const locS = locationScore;
  const ratingS = ratingScore / 100;
  const trustS = trustScore / 100;

  // Weighted sum (deterministic part). Embedding/AI will be additional.
  const weights = {
    tag: 0.30,
    availability: 0.15,
    price: 0.15,
    location: 0.10,
    rating: 0.15,
    trust: 0.15, // note: rating and trust share importance
  };

  const detScore =
    tagS * weights.tag +
    availS * weights.availability +
    priceS * weights.price +
    locS * weights.location +
    ratingS * weights.rating +
    trustS * weights.trust;

  return detScore; // 0..1
}

/**
 * Main function: recommend creatives for a booking or set of params
 * params:
 *  - bookingId (optional) : if present, fetch booking and use its details
 *  - tags, budgetMin, budgetMax, location, date
 *  - limit : number of results
 *  - useAI: boolean (whether to include OpenAI embedding similarity)
 */
export async function recommendCreatives({
  bookingId = null,
  tags = [],
  budgetMin = 0,
  budgetMax = Infinity,
  location = null,
  bookingDate = null,
  limit = 10,
  useAI = true,
} = {}) {
  try {
    let params = { requiredTags: tags, budgetMin, budgetMax, location, bookingDate };

    // If bookingId present, load booking and override params
    if (bookingId) {
      if (!mongoose.Types.ObjectId.isValid(bookingId)) throw new Error("Invalid bookingId");
      const booking = await Booking.findById(bookingId).lean();
      if (!booking) throw new Error("Booking not found");
      // booking fields: maybe tags in metadata or review
      params.requiredTags = booking.metadata?.tags || params.requiredTags;
      params.budgetMin = booking.metadata?.budgetMin ?? booking.totalAmount ?? params.budgetMin;
      params.budgetMax = booking.metadata?.budgetMax ?? booking.totalAmount ?? params.budgetMax;
      params.location = booking.metadata?.location || booking.location || params.location;
      params.bookingDate = booking.eventDate || params.bookingDate;
    }

    // Get pro candidates: users with role 'pro'
    const candidates = await User.find({ role: "pro", isVerified: { $in: [true, false] } }).lean();

    if (!candidates || candidates.length === 0) return [];

    // Deterministic scoring pass
    const scored = candidates.map((c) => {
      return {
        candidate: c,
        detScore: deterministicScore(c, params),
      };
    });

    // If AI embeddings available and useAI true -> compute embedding similarity
    let embeddingVec = null;
    let embeddingScores = {};
    if (useAI) {
      try {
        // generate an input text: combine tags + description + location
        const promptText = `${(params.requiredTags || []).join(" ")} ${params.location || ""} ${(params.bookingDate || "")}`.trim();
        const embeds = await embedText(promptText);
        if (embeds && embeds.length > 0) {
          embeddingVec = embeds[0];
        }
      } catch (err) {
        logger.warn("Embedding generation failed - continuing without AI similarity", err);
      }
    }

    if (embeddingVec) {
      // For each candidate, we need stored embeddings for candidate profile.
      // If candidate has `embedding` field stored in DB, use it. Otherwise compute on the fly from profile text (costly).
      // We'll attempt to use candidate.embedding (assumed to be saved previously).
      for (const s of scored) {
        const cand = s.candidate;
        let candVec = cand.embedding || null;
        if (!candVec && useAI) {
          // fallback: build small text summary and get embedding (best-effort)
          try {
            const summary = `${cand.name || ""} ${(cand.skills || []).join(" ")} ${cand.location || ""}`;
            const em = await embedText(summary);
            candVec = em ? em[0] : null;
            // Note: consider storing candVec to DB for performance
          } catch (err) {
            candVec = null;
          }
        }
        if (candVec) {
          const sim = cosineSimilarity(embeddingVec, candVec);
          embeddingScores[cand._id.toString()] = sim; // -1..1 but usually 0..1
        } else {
          embeddingScores[cand._id.toString()] = 0;
        }
      }
    }

    // Combine deterministic and AI scores to final score
    const results = scored.map((s) => {
      const id = s.candidate._id.toString();
      const aiSim = embeddingScores[id] || 0;
      // AI weight: 0.10, deterministic weight: 0.90 (sum to 1)
      const finalScore = s.detScore * 0.90 + (aiSim * 0.5) * 0.10; // aiSim roughly 0..1, scaled
      return { candidate: s.candidate, score: finalScore };
    });

    // sort desc by score and return top N
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit).map((r) => ({
      userId: r.candidate._id,
      name: r.candidate.name,
      rate: r.candidate.rate || r.candidate.hourlyRate || 0,
      rating: r.candidate.rating || 0,
      trustScore: r.candidate.trustScore || 50,
      location: r.candidate.location || null,
      skills: r.candidate.skills || [],
      score: Number((r.score * 100).toFixed(2)),
    }));
  } catch (err) {
    logger.error("recommendCreatives error", err);
    throw err;
  }
}
