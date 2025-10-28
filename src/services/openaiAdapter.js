// src/services/openaiAdapter.js
import OpenAI from "openai";
import logger from "../utils/logger.js";

const OPENAI_KEY = process.env.OPENAI_API_KEY || "";

const client = OPENAI_KEY ? new OpenAI({ apiKey: OPENAI_KEY }) : null;

export async function embedText(text) {
  if (!client) {
    logger.warn("OpenAI key not configured — embeddings disabled.");
    return null;
  }
  try {
    const resp = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: Array.isArray(text) ? text : [String(text)],
    });
    // returns array of vectors matching input
    return resp.data.map((d) => d.embedding);
  } catch (err) {
    logger.error("OpenAI embeddings error", err);
    return null;
  }
}

/**
 * Cosine similarity between two vectors (arrays of numbers)
 */
export function cosineSimilarity(a = [], b = []) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
