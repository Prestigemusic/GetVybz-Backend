import express from "express";
const router = express.Router();

// Example GET endpoint
router.get("/", (req, res) => {
  res.json([
    { id: 1, from: "UserA", to: "UserB", text: "Hello 👋" },
    { id: 2, from: "UserB", to: "UserA", text: "Hey, how are you?" }
  ]);
});

// Example POST endpoint
router.post("/", (req, res) => {
  const { from, to, text } = req.body;
  res.status(201).json({ id: Date.now(), from, to, text });
});

export default router;
