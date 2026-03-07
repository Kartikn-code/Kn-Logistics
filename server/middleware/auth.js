import jwt from 'jsonwebtoken';

// In production, use a secure secret key from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_key_here';

export const authenticateToken = (req, res, next) => {
    // Check if the request is for public auth routes
    if (req.path === '/login' || req.path === '/change-password') {
        return next();
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer <token>

    if (!token) {
        return res.status(401).json({ error: 'Authentication token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }

        // Attach user information to the request object
        req.user = user;
        next();
    });
};
