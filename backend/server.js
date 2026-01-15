/**
 * Arecanut Manager Pro - Backend Server
 * Express server with MongoDB connection and authentication
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import transactionRoutes from './routes/transactions.js';
import authRoutes from './routes/auth.js';
import { optionalAuth, protect } from './middleware/auth.js';

// ES Module dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize Express
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
    origin: NODE_ENV === 'production' 
        ? true  // Allow all origins in production (same server)
        : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500'],
    credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Increased for key file uploads

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        console.log(`[${timestamp}] ${req.method} ${req.url}`);
        next();
    });
}

// Health check (public)
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        mongodb: 'connected',
        version: '2.0.0'
    });
});

// Auth Routes (public and protected)
app.use('/api/auth', authRoutes);

// Protected Transaction Routes - require authentication
app.use('/api/transactions', protect, transactionRoutes);

// Serve static frontend files in production
if (NODE_ENV === 'production') {
    // Serve static files from parent directory (frontend)
    const frontendPath = path.join(__dirname, '..');
    app.use(express.static(frontendPath));
    
    // Handle SPA routing - serve index.html for non-API routes
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(frontendPath, 'index.html'));
        } else {
            res.status(404).json({ success: false, error: 'API route not found' });
        }
    });
} else {
    // 404 handler for development
    app.use((req, res) => {
        res.status(404).json({
            success: false,
            error: 'Route not found'
        });
    });
}

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err.stack);
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : err.message
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
🌴 Arecanut Manager Pro - Backend Server v2.0
==============================================
🚀 Server running on port ${PORT}
📊 API: http://localhost:${PORT}/api
🔐 Auth: http://localhost:${PORT}/api/auth
🏥 Health: http://localhost:${PORT}/api/health
==============================================
    `);
});

export default app;
