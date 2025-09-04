const express = require('express');
const router = express.Router();
const { Profile } = require('../models');

// Endpoint to create a new profile
router.post('/create', async (req, res) => {
  try {
    const newProfile = await Profile.create(req.body);
    res.status(201).json(newProfile);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Endpoint to get a profile by its ID
router.get('/:id', async (req, res) => {
  try {
    const profile = await Profile.findByPk(req.params.id);
    if (profile) {
      res.status(200).json(profile);
    } else {
      res.status(404).json({ error: 'Profile not found' });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Endpoint to update a profile by its ID
router.put('/:id', async (req, res) => {
  try {
    const [updatedRows] = await Profile.update(req.body, {
      where: { id: req.params.id }
    });
    if (updatedRows) {
      const updatedProfile = await Profile.findByPk(req.params.id);
      res.status(200).json(updatedProfile);
    } else {
      res.status(404).json({ error: 'Profile not found' });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;