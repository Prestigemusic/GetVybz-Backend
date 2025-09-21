import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
const router = express.Router();

// GET my profile
router.get("/me", authMiddleware, (req, res) => {
  res.json({
    profile: {
      id: req.user.id,
      name: "Daniel",
      role: "customer",
      email: "daniel@example.com",
    },
  });
});

export default router;
