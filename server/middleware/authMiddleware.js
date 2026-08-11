const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'fyp-secret-key';

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
        console.log("No token provided in Authorization header");
        return res.status(401).json({ message: 'Unauthorized' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            console.log("JWT Verification Error:", err.message);
            const message = err.name === 'TokenExpiredError' ? 'Session expired' : 'Invalid token';
            return res.status(403).json({ message });
        }
        req.user = decoded;
        next();
    });
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Identity context missing' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: `Access denied. Requires one of: ${roles.join(', ')}` });
        }
        next();
    };
};

const verifySuperAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'superadmin') {
        return res.status(403).json({ success: false, message: 'SuperAdmin clearance required.' });
    }
    next();
};

module.exports = { verifyToken, verifySuperAdmin, authorize };
