import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Routes
import apiRoutes from './routes.js';
import contactRoutes from './contact.js';

app.use('/api', apiRoutes);
app.use('/api', contactRoutes);

// Static files for frontend (Production)
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Catch-all route to serve index.html for React Router
app.get(/.*/, (req, res) => {
    // If it's an API route that wasn't matched, return 404
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API route not found' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
});

// Start server locally (Vercel uses the exported app instead)
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

export default app;
