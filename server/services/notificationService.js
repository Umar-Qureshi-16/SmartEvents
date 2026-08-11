const Notification = require('../models/Notification');
const { emitToUser } = require('./socketManager');

class NotificationService {
    async createNotification({ recipient, title, message, type, relatedId, priority = 'medium' }) {
        try {
            const notification = new Notification({
                recipient,
                title,
                message,
                type,
                relatedId,
                priority
            });
            await notification.save();

            emitToUser(recipient, 'notification', {
                id: notification._id,
                title,
                message,
                type,
                relatedId,
                priority,
                createdAt: notification.createdAt
            });

            return notification;
        } catch (error) {
            console.error('[NotificationService Error]:', error);
            throw error;
        }
    }

    async getNotifications(userId) {
        return await Notification.find({ recipient: userId }).sort({ createdAt: -1 });
    }

    async markAsRead(notificationId, userId) {
        return await Notification.findOneAndUpdate(
            { _id: notificationId, recipient: userId },
            { isRead: true },
            { new: true }
        );
    }

    async markAllAsRead(userId) {
        return await Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });
    }
}

module.exports = new NotificationService();
