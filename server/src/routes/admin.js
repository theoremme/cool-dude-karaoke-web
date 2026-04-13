const express = require('express');
const { body } = require('express-validator');
const { authenticate, requireAdmin } = require('../middleware/auth');
const prisma = require('../lib/prisma');
const { validationResult } = require('express-validator');

const router = express.Router();

// All admin routes require auth + admin
router.use(authenticate, requireAdmin);

// GET /api/admin/whitelist
router.get('/whitelist', async (req, res) => {
  try {
    const entries = await prisma.betaWhitelist.findMany({
      orderBy: { addedAt: 'desc' },
    });
    res.json({ whitelist: entries });
  } catch (err) {
    console.error('Whitelist fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch whitelist' });
  }
});

// POST /api/admin/whitelist
router.post(
  '/whitelist',
  [body('email').isEmail().withMessage('Valid email is required').normalizeEmail()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    try {
      const { email } = req.body;

      const existing = await prisma.betaWhitelist.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({ error: 'Email already whitelisted' });
      }

      const entry = await prisma.betaWhitelist.create({ data: { email } });
      res.status(201).json({ entry });
    } catch (err) {
      console.error('Whitelist add error:', err);
      res.status(500).json({ error: 'Failed to add to whitelist' });
    }
  }
);

// DELETE /api/admin/whitelist/:id
router.delete('/whitelist/:id', async (req, res) => {
  try {
    await prisma.betaWhitelist.delete({ where: { id: req.params.id } });
    res.json({ message: 'Removed from whitelist' });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Entry not found' });
    }
    console.error('Whitelist delete error:', err);
    res.status(500).json({ error: 'Failed to remove from whitelist' });
  }
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, isAdmin: true, createdAt: true, lastLogin: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ users });
  } catch (err) {
    console.error('Users fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

module.exports = router;
