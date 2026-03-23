const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

// @desc    Unsubscribe user from emails
// @route   GET /api/users/unsubscribe/:token
// @access  Public
exports.unsubscribe = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).send('<h2>Unsubscribe token is missing.</h2>');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    if (!userId) {
      return res.status(400).send('<h2>Invalid unsubscribe token.</h2>');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { emailSubscriptions: false },
    });

    const resubscribeUrl = `${process.env.API_BASE_URL || 'http://localhost:5001'}/api/users/resubscribe/${token}`;

    res.send(`
      <h2>You have been successfully unsubscribed.</h2>
      <p>You will no longer receive booking confirmations or promotional content.</p>
      <p style="margin-top: 20px; font-size: 14px;">Changed your mind? <a href="${resubscribeUrl}">Resubscribe here</a>.</p>
    `);
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(400).send('<h2>Invalid or expired unsubscribe link.</h2><p>Please contact support if you continue to have issues.</p>');
  }
};

// @desc    Resubscribe user to emails
// @route   GET /api/users/resubscribe/:token
// @access  Public
exports.resubscribe = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).send('<h2>Resubscribe token is missing.</h2>');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    if (!userId) {
      return res.status(400).send('<h2>Invalid resubscribe token.</h2>');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { emailSubscriptions: true },
    });

    res.send('<h2>You have been successfully resubscribed!</h2><p>You will now receive all our email communications.</p>');
  } catch (error) {
    console.error('Resubscribe error:', error);
    res.status(400).send('<h2>Invalid or expired resubscribe link.</h2>');
  }
};