const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// Cart is managed on the client side (React state + localStorage)
// This is just a placeholder route

router.get('/', protect, (req, res) => {
  res.json({ message: 'Cart is managed on the client side.' });
});

module.exports = router;