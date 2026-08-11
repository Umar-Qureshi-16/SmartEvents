const NodeCache = require('node-cache');

// Standard TTL is 10 minutes
const appCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

class CacheService {
    get(key) {
        return appCache.get(key);
    }

    set(key, val, ttl = 600) {
        appCache.set(key, val, ttl);
    }

    del(keys) {
        appCache.del(keys);
    }

    flush() {
        appCache.flushAll();
    }
}

module.exports = new CacheService();
