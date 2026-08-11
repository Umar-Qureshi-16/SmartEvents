const notificationService = require('../services/notificationService');

exports.getNotifications = async (req, res, next) => {
    try {
        const notifications = await notificationService.getNotifications(req.user.id);
        res.json({ success: true, data: notifications });
    } catch (error) {
        next(error);
    }
};

exports.markAsRead = async (req, res, next) => {
    try {
        const notification = await notificationService.markAsRead(req.params.id, req.user.id);
        res.json({ success: true, data: notification });
    } catch (error) {
        next(error);
    }
};

exports.markAllAsRead = async (req, res, next) => {
    try {
        await notificationService.markAllAsRead(req.user.id);
        res.json({ success: true, message: 'All notifications marked as read.' });
    } catch (error) {
        next(error);
    }
};
