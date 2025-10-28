// src/services/paymentGatewayAdapter.js
/**
 * Payment Gateway Adapter (Paystack + Flutterwave)
 *
 * This is an adapter layer. When you add real API keys in env vars, the adapter will call the gateways.
 * If no keys are present, methods return null/empty and the reconciler will skip gateway verification.
 *
 * Env variables (examples):
 * - PAYSTACK_SECRET_KEY
 * - FLW_SECRET_KEY
 *
 * NOTE: The adapter uses global fetch (Node 18+). If you need axios, replace fetch calls.
 */

import logger from "../utils/logger.js";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || null;
const FLW_SECRET = process.env.FLW_SECRET_KEY || null;

async function paystackGetTransactionByReference(reference) {
  if (!PAYSTACK_SECRET) return null;
  try {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      const text = await res.text();
      logger.error("Paystack verify returned non-ok", { status: res.status, text });
      return null;
    }
    const data = await res.json();
    // Return canonicalized object
    return {
      gateway: "paystack",
      ok: data.status === true,
      reference,
      amount: data.data?.amount || null, // in kobo/ngn minor units
      currency: data.data?.currency,
      status: data.data?.status,
      paidAt: data.data?.paid_at ? new Date(data.data.paid_at) : null,
      raw: data,
    };
  } catch (err) {
    logger.error("Paystack verify error", err);
    return null;
  }
}

async function flwGetTransactionByReference(reference) {
  if (!FLW_SECRET) return null;
  try {
    const res = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(reference)}/verify`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${FLW_SECRET}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      const text = await res.text();
      logger.error("Flutterwave verify returned non-ok", { status: res.status, text });
      return null;
    }
    const data = await res.json();
    return {
      gateway: "flutterwave",
      ok: data.status === "success" || data.status === "ok",
      reference,
      amount: data.data?.amount || null,
      currency: data.data?.currency,
      status: data.data?.status || null,
      paidAt: data.data?.charged_at ? new Date(data.data?.charged_at) : null,
      raw: data,
    };
  } catch (err) {
    logger.error("Flutterwave verify error", err);
    return null;
  }
}

/**
 * Fetch a gateway transaction by reference (tries Paystack first, then Flutterwave)
 * Returns null if none found or if no keys configured.
 */
export async function getTransactionByReference(reference) {
  if (!reference) return null;

  // Try Paystack
  const ps = await paystackGetTransactionByReference(reference);
  if (ps) return ps;

  // Try Flutterwave
  const flw = await flwGetTransactionByReference(reference);
  if (flw) return flw;

  // No key or not found
  return null;
}

/**
 * List transactions since a given ISO date (gateway-specific)
 * Returns empty array if keys not present.
 * NOTE: Implementing full pagination is gateway-specific; these are basic examples.
 */
export async function listRecentTransactions({ sinceIso, gateway = "auto" } = {}) {
  const results = [];
  if ((gateway === "auto" || gateway === "paystack") && PAYSTACK_SECRET) {
    try {
      // Paystack list (simple example: /transaction?perPage=50&from=yyyy-mm-dd)
      const url = `https://api.paystack.co/transaction?perPage=50${sinceIso ? `&from=${encodeURIComponent(sinceIso)}` : ""}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } });
      if (res.ok) {
        const data = await res.json();
        (data.data || []).forEach((d) =>
          results.push({ gateway: "paystack", reference: d.reference, amount: d.amount, status: d.status, raw: d })
        );
      }
    } catch (err) {
      logger.error("Error listing Paystack transactions", err);
    }
  }

  if ((gateway === "auto" || gateway === "flutterwave") && FLW_SECRET) {
    try {
      // Flutterwave: no direct list 'since' endpoint in v3 docs — placeholder fetch '/transactions' if available
      const url = `https://api.flutterwave.com/v3/transactions`; // adjust if specific endpoints needed
      const res = await fetch(url, { headers: { Authorization: `Bearer ${FLW_SECRET}` } });
      if (res.ok) {
        const data = await res.json();
        (data.data || []).forEach((d) =>
          results.push({ gateway: "flutterwave", reference: d.tx_ref || d.id, amount: d.amount, status: d.status, raw: d })
        );
      }
    } catch (err) {
      logger.error("Error listing Flutterwave transactions", err);
    }
  }

  return results;
}

// Hot-reload safe default export
export default {
  getTransactionByReference,
  listRecentTransactions,
};
