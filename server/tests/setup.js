const mongoose = require('mongoose');

/**
 * Database lifecycle for the test suite.
 *
 * Prefers a reachable MongoDB (local mongod, or a CI service container) because
 * it starts instantly. Falls back to mongodb-memory-server, which downloads a
 * standalone binary on first use — correct, but a slow first run.
 *
 * Override the target with MONGO_TEST_URI.
 */
const TEST_URI = process.env.MONGO_TEST_URI || 'mongodb://127.0.0.1:27017/smartevents_test';

let memoryServer;

beforeAll(async () => {
    try {
        await mongoose.connect(TEST_URI, { serverSelectionTimeoutMS: 3000 });
    } catch {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        memoryServer = await MongoMemoryServer.create();
        await mongoose.connect(memoryServer.getUri());
    }

    // Model-level indexes (unique constraints in particular) are only applied
    // once built; without this, uniqueness tests race the index creation.
    await Promise.all(Object.values(mongoose.models).map(m => m.createIndexes().catch(() => {})));
}, 180000);

// Every test starts from a clean database.
afterEach(async () => {
    const { collections } = mongoose.connection;
    await Promise.all(Object.values(collections).map(c => c.deleteMany({})));
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await memoryServer?.stop();
}, 60000);
