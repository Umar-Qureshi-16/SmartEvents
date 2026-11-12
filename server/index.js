const http = require('http');
const mongoose = require('mongoose');

const env = require('./config/env');
const createApp = require('./app');
const socketManager = require('./services/socketManager');

const app = createApp();
const server = http.createServer(app);

async function start() {
    try {
        socketManager.init(server);

        // Bind to 0.0.0.0 immediately so cloud platforms (Render, Railway, Docker)
        // detect the open port right away during deployment health checks.
        server.listen(env.PORT, '0.0.0.0', () => {
            console.log(`SmartEvents API listening on port ${env.PORT} on 0.0.0.0 (${env.NODE_ENV})`);
        });

        console.log('Connecting to MongoDB...');
        await mongoose.connect(env.MONGODB_URI, {
            serverSelectionTimeoutMS: 15000,
        });
        console.log('Connected to MongoDB successfully');
    } catch (err) {
        console.error('Startup / Database connection error:', err.message);
        console.error('Please verify MONGODB_URI in your environment variables and ensure MongoDB Atlas allows IP 0.0.0.0/0 in Network Access.');
        if (!env.isProduction) {
            process.exit(1);
        }
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
