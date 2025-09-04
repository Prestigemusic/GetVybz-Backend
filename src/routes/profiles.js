import express from "express";
const router = express.Router();

// Example GET endpoint
router.get("/:id", (req, res) => {
  const { id } = req.params;
  res.json({
    id,
    name: "Pro User",
    skills: ["DJ", "Sound Engineer"],
    rating: 4.8
  });
});

export default router;
