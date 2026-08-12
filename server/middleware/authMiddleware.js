const jwt = require('jsonwebtoken');
const env = require('../config/env');

// Validated at boot by config/env.js, which refuses to start without it.
const JWT_SECRET = env.JWT_SECRET;

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required',
            code: 'NO_TOKEN'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            // 401 means "your credential is stale — go refresh it".
            // 403 is reserved for "your credential is valid but you lack
            // permission", which is what authorize() below returns.
            // The client's Axios interceptor only retries on 401, so an
            // expired token must not come back as 403 or refresh never fires.
            const expired = err.name === 'TokenExpiredError';
            return res.status(401).json({
                success: false,
                message: expired ? 'Session expired' : 'Invalid token',
                code: expired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID'
            });
        }

        // Normalise both id shapes — some controllers read req.user._id and
        // some read req.user.id, and the JWT payload only carries `id`.
        req.user = { ...decoded, _id: decoded.id };
        next();
    });
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Requires one of: ${roles.join(', ')}`,
                code: 'INSUFFICIENT_ROLE'
            });
        }
        next();
    };
};

const verifySuperAdmin = (req, res, next) => {
    if (req.user?.role !== 'superadmin') {
        return res.status(403).json({
            success: false,
            message: 'SuperAdmin clearance required.',
            code: 'INSUFFICIENT_ROLE'
        });
    }
    next();
};

module.exports = { verifyToken, verifySuperAdmin, authorize, JWT_SECRET };
