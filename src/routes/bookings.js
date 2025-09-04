import express from "express";

const router = express.Router();

// Example route: GET all bookings
router.get("/", (req, res) => {
  res.json({ message: "All bookings" });
});

// Example route: Create a booking
router.post("/", (req, res) => {
  const { customerName, service } = req.body;
  res.json({
    message: "Booking created successfully",
    booking: { customerName, service },
  });
});

export default router;
