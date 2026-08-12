const Booking = require('../models/Booking');
const Event = require('../models/Event');
const VendorProfile = require('../models/VendorProfile');
const notificationService = require('./notificationService');
const socketManager = require('./socketManager');
const User = require('../models/User');
const { sendEmail } = require('./mailService');
const { NotFoundError, ForbiddenError, ConflictError } = require('../utils/AppError');

class BookingService {
    async createBooking(bookingData, customerId) {
        let { eventId, vendorId, serviceId, eventDetails, offerPrice, message, note } = bookingData;

        // If eventId is provided, pull event details and vendorId dynamically
        if (eventId) {
            const event = await Event.findById(eventId);
            if (!event) throw new NotFoundError('Event not found.');
            vendorId = event.createdBy;
            if (!eventDetails) {
                eventDetails = {
                    eventType: event.category || 'Event',
                    date: event.date || new Date(),
                    location: event.location || 'Online',
                    message: message || note || 'Initial offer'
                };
            }
        }

        const noteMessage = message || note || eventDetails?.message || 'Initial offer';
        if (!eventDetails) {
            eventDetails = {
                eventType: 'Custom Service',
                date: new Date(),
                location: 'Vendor Choice',
                message: noteMessage
            };
        }

        // Check if date is blocked in availability calendar
        if (eventDetails && eventDetails.date) {
            const profile = await VendorProfile.findOne({ userId: vendorId });
            if (profile && profile.blockedDates && profile.blockedDates.length > 0) {
                const checkDate = new Date(eventDetails.date).toDateString();
                const isBlocked = profile.blockedDates.some(bd => new Date(bd).toDateString() === checkDate);
                if (isBlocked) {
                    throw new ConflictError('The provider has marked this date as unavailable.');
                }
            }
        }

        const booking = new Booking({
            customerId,
            vendorId,
            serviceId,
            eventId,
            eventDetails,
            offerPrice,
            negotiationHistory: [{
                price: offerPrice,
                message: noteMessage,
                action: 'offer',
                offeredBy: customerId
            }]
        });

        await booking.save();

        // Notify vendor via persistent notification
        await notificationService.createNotification({
            recipient: vendorId,
            title: 'New Event Offer',
            message: `You received a new booking offer of $${offerPrice}`,
            type: 'booking',
            relatedId: booking._id,
            priority: 'high'
        });

        // Emit socket event
        socketManager.emitToUser(vendorId, 'notification', {
            type: 'new-offer',
            bookingId: booking._id,
            message: `New offer of $${offerPrice}`
        });

        // Trigger Nodemailer
        try {
            const vendorUser = await User.findById(vendorId);
            const customerUser = await User.findById(customerId);
            if (vendorUser) {
                await sendEmail(
                    vendorUser.email,
                    'New RFP Booking Request - SmartEvents',
                    `<h3>Hello ${vendorUser.name},</h3>
                     <p>You have received a new event RFP offer from <strong>${customerUser?.name || 'an Organizer'}</strong>.</p>
                     <p><strong>Offer Price:</strong> $${offerPrice}</p>
                     <p>Please log in to your dashboard to negotiate or accept the bid.</p>`
                );
            }
        } catch (err) {
            console.error('Mail trigger error:', err);
        }

        return booking;
    }

    async getMyBookings(customerId) {
        return await Booking.find({ customerId }).populate('eventId vendorId').sort({ createdAt: -1 });
    }

    async getOrganizerBookings(vendorId) {
        return await Booking.find({ vendorId }).populate('eventId customerId').sort({ createdAt: -1 });
    }

    async getBookingById(id, userId) {
        const booking = await Booking.findById(id).populate('eventId customerId vendorId');
        if (!booking) throw new NotFoundError('Booking not found.');

        if (booking.customerId._id.toString() !== userId && booking.vendorId._id.toString() !== userId) {
            throw new ForbiddenError('Access denied to this booking.');
        }
        return booking;
    }

    async negotiate(bookingId, price, message, userId) {
        const booking = await Booking.findById(bookingId);
        if (!booking) throw new NotFoundError('Booking not found.');

        if (booking.status === 'confirmed' || booking.status === 'rejected') {
            throw new ConflictError(`Cannot negotiate on a ${booking.status} booking.`);
        }

        booking.status = 'negotiating';
        booking.lastPrice = booking.offerPrice;
        booking.offerPrice = price;
        booking.negotiationHistory.push({
            price,
            message,
            action: 'counter',
            offeredBy: userId
        });

        try {
            await booking.save();
        } catch (err) {
            if (err.name === 'VersionError') {
                throw new ConflictError('This booking negotiation status was modified by another request. Please refresh and try again.');
            }
            throw err;
        }

        const targetId = userId === booking.customerId.toString() ? booking.vendorId : booking.customerId;

        // Notify other party
        socketManager.emitToRoom(bookingId.toString(), 'offer-countered', {
            price,
            message,
            offeredBy: userId
        });

        await notificationService.createNotification({
            recipient: targetId,
            title: 'Offer Countered',
            message: `A new counter-offer of $${price} has been submitted.`,
            type: 'booking',
            relatedId: booking._id
        });

        // Trigger Nodemailer
        try {
            const targetUser = await User.findById(targetId);
            const actorUser = await User.findById(userId);
            if (targetUser) {
                await sendEmail(
                    targetUser.email,
                    'Counter-Offer Proposed - SmartEvents',
                    `<h3>Hello ${targetUser.name},</h3>
                     <p>A new counter-offer has been submitted on your booking negotiation by <strong>${actorUser?.name || 'the other party'}</strong>.</p>
                     <p><strong>Counter-Price:</strong> $${price}</p>
                     <p><strong>Note:</strong> "${message || 'No details provided'}"</p>
                     <p>Please log in to respond to this counter-offer.</p>`
                );
            }
        } catch (err) {
            console.error('Mail trigger error:', err);
        }

        return booking;
    }

    /**
     * Raises a dispute on a confirmed booking. The 'disputed' status and the
     * admin resolution endpoint already existed, but nothing could ever put a
     * booking into that state — this closes the loop.
     */
    async raiseDispute(bookingId, reason, userId) {
        const booking = await Booking.findById(bookingId);
        if (!booking) throw new NotFoundError('Booking not found.');

        const isParty =
            booking.customerId.toString() === userId ||
            booking.vendorId.toString() === userId;
        if (!isParty) throw new ForbiddenError('You are not a party to this booking.');

        if (!['confirmed', 'completed'].includes(booking.status)) {
            throw new ConflictError('Only a confirmed or completed booking can be disputed.');
        }

        booking.status = 'disputed';
        booking.negotiationHistory.push({
            price: booking.offerPrice,
            message: `Dispute raised: ${reason}`,
            action: 'counter',
            offeredBy: userId
        });
        await booking.save();

        const targetId = userId === booking.customerId.toString() ? booking.vendorId : booking.customerId;

        await notificationService.createNotification({
            recipient: targetId,
            title: 'Dispute Raised',
            message: `A dispute has been opened on booking #${booking._id}. An administrator will review it.`,
            type: 'booking',
            relatedId: booking._id,
            priority: 'high'
        });

        socketManager.emitToRoom(bookingId.toString(), 'dispute-raised', { bookingId, reason });

        return booking;
    }

    async updateStatus(bookingId, status, userId) {
        const booking = await Booking.findById(bookingId);
        if (!booking) throw new NotFoundError('Booking not found.');

        if (status === 'confirmed') {
            booking.status = 'confirmed';
            socketManager.emitToRoom(bookingId.toString(), 'offer-accepted', { bookingId, actorId: userId });
        } else if (status === 'rejected') {
            booking.status = 'rejected';
            socketManager.emitToRoom(bookingId.toString(), 'offer-rejected', { bookingId, actorId: userId });
        } else if (status === 'cancelled') {
            booking.status = 'cancelled';
            booking.cancelledBy = userId;
        } else if (status === 'completed') {
            booking.status = 'completed';
        } else if (status === 'no_show') {
            booking.status = 'no_show';
        }

        try {
            await booking.save();
        } catch (err) {
            if (err.name === 'VersionError') {
                throw new ConflictError('This booking status was updated by another process. Please refresh.');
            }
            throw err;
        }

        // Recalculate Trust Score for the provider if status changed
        if (['completed', 'cancelled', 'no_show'].includes(status)) {
            const { recalculateTrustScore } = require('./trustScoreService');
            await recalculateTrustScore(booking.vendorId);
        }

        const targetId = userId === booking.customerId.toString() ? booking.vendorId : booking.customerId;
        await notificationService.createNotification({
            recipient: targetId,
            title: `Booking ${status.toUpperCase()}`,
            message: `The booking has been ${status}.`,
            type: 'booking',
            relatedId: booking._id
        });

        // Trigger Nodemailer
        try {
            const targetUser = await User.findById(targetId);
            const actorUser = await User.findById(userId);
            if (targetUser) {
                await sendEmail(
                    targetUser.email,
                    `Booking Status Updated: ${status.toUpperCase()} - SmartEvents`,
                    `<h3>Hello ${targetUser.name},</h3>
                     <p>The booking status has been updated to <strong>${status.toUpperCase()}</strong> by <strong>${actorUser?.name || 'the other party'}</strong>.</p>
                     <p><strong>Booking Reference:</strong> #${booking._id}</p>
                     <p><strong>Agreed Escrow Price:</strong> $${booking.offerPrice}</p>
                     <p>Please log in to your dashboard to review details.</p>`
                );
            }
        } catch (err) {
            console.error('Mail trigger error:', err);
        }

        return booking;
    }
}

module.exports = new BookingService();
