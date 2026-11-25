/** Drops this run's databases (see globalSetup.js) so local runs leave nothing behind. */
module.exports = async () => {
    const name = process.env.SMARTEVENTS_TEST_DB;
    if (!name) return;
    const mongoose = require('mongoose');
    const conn = mongoose.createConnection('mongodb://127.0.0.1:27017/admin', {
        serverSelectionTimeoutMS: 2000,
        runtimeAdapters: { os: require('os') },
    });
    try {
        await conn.asPromise();
        // One database per Jest worker: <name>_w1, <name>_w2, ...
        const { databases } = await conn.db.admin().listDatabases();
        for (const db of databases.filter((d) => d.name.startsWith(`${name}_w`))) {
            await conn.useDb(db.name).dropDatabase();
        }
    } catch {
        // No local MongoDB (the run used an in-memory server): nothing to drop.
    } finally {
        await conn.close().catch(() => {});
    }
};
