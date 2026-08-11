const Payment = require('../models/Payment');
const Event = require('../models/Event');
const Bid = require('../models/Bid');

exports.createPaymentIntent = async (req, res) => {
    try {
        const { eventId, bidId } = req.body;
        const bid = await Bid.findById(bidId);
        const event = await Event.findById(eventId);

        if (!bid || !event) {
            return res.status(404).json({ success: false, message: 'Event or Bid not found' });
        }

        const newPayment = new Payment({
            event: eventId,
            bid: bidId,
            organizer: req.user.id,
            vendor: bid.vendor,
            amount: bid.amount,
            currency: 'USD',
            status: 'paid',
            stripePaymentIntentId: `pi_mock_${Date.now()}`,
            paidAt: new Date()
        });

        await newPayment.save();

        res.status(201).json({
            success: true,
            data: newPayment,
            clientSecret: `pi_mock_secret_${Date.now()}`,
            message: 'Payment intent created & settled in escrow'
        });
    } catch (err) {
        console.error('Payment Error:', err);
        res.status(500).json({ success: false, message: 'Server error processing payment' });
    }
};

exports.getMyPayments = async (req, res) => {
    try {
        const query = req.user.role === 'vendor' ? { vendor: req.user.id } : { organizer: req.user.id };
        const payments = await Payment.find(query)
            .populate('event')
            .populate('vendor', 'name email')
            .populate('organizer', 'name email')
            .sort({ paidAt: -1 });

        res.json({ success: true, data: payments });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
