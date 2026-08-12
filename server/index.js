const http = require('http');
const mongoose = require('mongoose');

const env = require('./config/env');
const createApp = require('./app');
const socketManager = require('./services/socketManager');

const app = createApp();
const server = http.createServer(app);

async function start() {
    try {
        await mongoose.connect(env.MONGODB_URI);
        console.log('Connected to MongoDB');

        socketManager.init(server);

        server.listen(env.PORT, () => {
            console.log(`SmartEvents API listening on port ${env.PORT} (${env.NODE_ENV})`);
        });
    } catch (err) {
        console.error('Failed to start:', err.message);
        process.exit(1);
    }
}

// Close connections cleanly so in-flight requests finish and Mongo does not
// hold a stale socket after a deploy or restart.
const shutdown = (signal) => async () => {
    console.log(`\n${signal} received — shutting down.`);
    server.close(async () => {
        await mongoose.connection.close();
        process.exit(0);
    });
    // Do not hang forever if a connection refuses to close.
    setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGTERM', shutdown('SIGTERM'));
process.on('SIGINT', shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled promise rejection:', reason);
});

start();

module.exports = { app, server };
