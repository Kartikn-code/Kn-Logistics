import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
import apiRoutes from './routes.js';
import contactRoutes from './contact.js';

app.use('/api', apiRoutes);
app.use('/api', contactRoutes);

// Health check
app.get('/', (req, res) => {
    res.json({ message: 'KN Logistics Backend is running' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
