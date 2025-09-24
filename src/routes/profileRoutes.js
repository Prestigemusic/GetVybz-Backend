// src/routes/profileRoutes.js
import express from "express";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/profiles/me
router.get("/me", protect, (req, res) => {
  res.json({
    profile: {
      id: req.user?.id,
      name: "Daniel",
      role: "customer",
      email: "daniel@example.com",
    },
  });
});

export default router;
