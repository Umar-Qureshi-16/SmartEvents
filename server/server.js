const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Connect MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eventflow';
mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected to EventFlow DB'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// API Routes
app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/events', require('./src/routes/event.routes'));
app.use('/api/bids', require('./src/routes/bid.routes'));
app.use('/api/payments', require('./src/routes/payment.routes'));
app.use('/api/tickets', require('./src/routes/ticket.routes'));
app.use('/api/admin', require('./src/routes/admin.routes'));

app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'EventFlow API Engine is live' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`EventFlow Server running on port ${PORT}`);
});

module.exports = app;
