const mongoose = require('mongoose');

// MongoDB driver >= 7.6 loads the `os` module with a dynamic import(), which
// Jest's CommonJS sandbox cannot run; the driver then sends an empty client
// handshake and the server rejects the connection. The driver supports passing
// the module in explicitly for exactly this situation.
const DRIVER_OPTIONS = { runtimeAdapters: { os: require('os') } };

/**
 * Database lifecycle for the test suite.
 *
 * Connects once for the whole process when running with --runInBand.
 * - Prefers a reachable local MongoDB (starts instantly, no binary download).
 * - Falls back to mongodb-memory-server only when local Mongo is not available.
 * - Does NOT close the connection in afterAll so subsequent test files
 *   (same process, --runInBand) can reuse it without triggering another
 *   180 s binary-download timeout.
 *
 * Override the target with MONGO_TEST_URI.
 */
// Each run gets its own database name (tests/globalSetup.js), so runs at the
// same time never clear each other's data.
const TEST_URI =
    process.env.MONGO_TEST_URI ||
    `mongodb://127.0.0.1:27017/${process.env.SMARTEVENTS_TEST_DB || 'smartevents_test'}`;

let memoryServer;

beforeAll(async () => {
    // Reuse an already-open connection (subsequent suites in --runInBand).
    if (mongoose.connection.readyState === 1) {
        return;
    }

    try {
        await mongoose.connect(TEST_URI, { serverSelectionTimeoutMS: 3000, ...DRIVER_OPTIONS });
    } catch {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        memoryServer = await MongoMemoryServer.create();
        await mongoose.connect(memoryServer.getUri(), DRIVER_OPTIONS);
    }

    // Ensure indexes exist (unique constraints race index creation otherwise).
    await Promise.all(
        Object.values(mongoose.models).map((m) => m.createIndexes().catch(() => {}))
    );
}, 30000); // 30 s is plenty for a local Mongo; memory-server is the slow path

// Every test starts from a clean database.
afterEach(async () => {
    const { collections } = mongoose.connection;
    await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

// Only tear down if we own the connection (i.e. we started a memory server).
afterAll(async () => {
    if (memoryServer) {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await memoryServer.stop();
    }
}, 30000);
