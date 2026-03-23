// @route   DELETE api/notifications/:id
// @desc    Delete a notification
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    // 1. Find the notification by ID
    // Note: Use findByPk(req.params.id) if using Sequelize/PostgreSQL
    const notification = await Notification.findById(req.params.id);

    // 2. Check if notification exists
    if (!notification) {
      return res.status(404).json({ msg: 'Notification not found' });
    }

    // 3. Ensure the user owns the notification
    // Assuming req.user.id comes from your auth middleware and the notification has a 'user' field
    if (notification.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // 4. Delete the notification
    // Note: Use notification.destroy() if using Sequelize/PostgreSQL
    await notification.deleteOne();

    res.json({ msg: 'Notification removed' });
  } catch (err) {
    console.error(err.message);
    // Handle invalid ID format errors
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Notification not found' });
    }
    res.status(500).send('Server Error');
  }
});
