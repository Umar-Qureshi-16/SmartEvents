/** Drops this run's database (see globalSetup.js) so local runs leave nothing behind. */
module.exports = async () => {
    const name = process.env.SMARTEVENTS_TEST_DB;
    if (!name) return;
    const mongoose = require('mongoose');
    const conn = mongoose.createConnection(`mongodb://127.0.0.1:27017/${name}`, {
        serverSelectionTimeoutMS: 2000,
        runtimeAdapters: { os: require('os') },
    });
    try {
        await conn.asPromise();
        await conn.dropDatabase();
    } catch {
        // No local MongoDB (the run used an in-memory server): nothing to drop.
    } finally {
        await conn.close().catch(() => {});
    }
};
