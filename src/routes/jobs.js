import express from "express";
const router = express.Router();

// Example GET endpoint
router.get("/", (req, res) => {
  res.json([
    { id: 1, title: "DJ for party", location: "Lagos", price: 500 },
    { id: 2, title: "Photographer needed", location: "Abuja", price: 300 }
  ]);
});

// Example POST endpoint
router.post("/", (req, res) => {
  const { title, location, price } = req.body;
  res.status(201).json({ id: Date.now(), title, location, price });
});

export default router;
