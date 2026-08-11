module.exports = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                message: `Access forbidden: Role '${req.user ? req.user.role : 'Guest'}' is not authorized for this resource` 
            });
        }
        next();
    };
};
