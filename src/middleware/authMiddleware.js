import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Middleware: Authenticate user via Bearer token
 */
export const protect = async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ error: "Not authorized, token missing" });
  }

  try {
    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    req.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status || null,
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);
    res.status(401).json({ error: "Token invalid or expired" });
  }
};

/**
 * Middleware: Require specific user role(s)
 * Usage example:
 *   router.post("/admin", protect, requireRole("admin"), handler);
 *   router.post("/multi", protect, requireRole(["admin", "customer"]), handler);
 */
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied: requires ${allowedRoles.join(" or ")} role`,
      });
    }

    next();
  };
};

/**
 * 🔒 Shortcut middlewares for clarity
 */
export const adminOnly = requireRole("admin");
export const proOnly = requireRole("pro");
export const customerOnly = requireRole("customer");
