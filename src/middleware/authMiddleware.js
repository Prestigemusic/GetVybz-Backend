// src/middleware/authMiddleware.js
import jwt from "jsonwebtoken";

/**
 * protect — Express middleware to verify Bearer JWT
 * Exports: both named `protect` and default export so either import style works.
 */
function protect(req, res, next) {
  // Support different header casing
  const authHeader =
    req.headers.authorization ||
    req.headers.Authorization ||
    req.header("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach a consistent user object to req
    // decoded could be { id: '...' } or whatever you sign — handle common shapes
    const id = decoded.id || decoded._id || decoded.userId;
    req.user = { id };
    next();
  } catch (err) {
    console.error("JWT error:", err);
    return res.status(401).json({ msg: "Token is not valid" });
  }
}

// Named export
export { protect };

// Default export (so older files using `import authMiddleware from ...` still work)
export default protect;
