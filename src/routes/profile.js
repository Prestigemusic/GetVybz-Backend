import { Router } from "express";

const router = Router();

// GET /api/profiles/:id
router.get("/:id", (req, res) => {
  const { id } = req.params;
  res.json({
    id,
    name: "DJ Prestige",
    service: "DJ",
    rating: 4.9,
  });
});

export default router;
