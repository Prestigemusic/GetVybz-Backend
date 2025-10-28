import { Router } from "express";

const router = Router();

// GET /api/messages
router.get("/", (req, res) => {
  res.json({
    messages: [
      "Hello 👋, welcome to GetVybz!",
      "Your booking is confirmed 🎉",
      "Don’t forget your event tomorrow 🎶",
    ],
  });
});

export default router;
