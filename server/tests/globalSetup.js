/**
 * Gives every test run its own database name. Runs share a local MongoDB when
 * one is running, and two runs at once (two terminals, CI and a developer)
 * used to wipe each other's data mid-test, failing tests at random.
 */
module.exports = async () => {
    if (!process.env.MONGO_TEST_URI) {
        process.env.SMARTEVENTS_TEST_DB = `smartevents_test_${Date.now().toString(36)}_${process.pid}`;
    }
};
