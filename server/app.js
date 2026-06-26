import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import Custom Middlewares
import { helmetMiddleware, generalRateLimiter } from './middleware/security.js';
import { errorHandler } from './middleware/errorHandler.js';

// Import Routes
import profileRoutes from './routes/profile.js';
import eventRoutes from './routes/events.js';
import taskRoutes from './routes/tasks.js';
import goalRoutes from './routes/goals.js';
import noteRoutes from './routes/notes.js';
import projectRoutes from './routes/projects.js';
import analyticsRoutes from './routes/analytics.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, './.env') });

const app = express();

// 1. GLOBAL MIDDLEWARES
app.use(helmetMiddleware); // Strict security headers & CSP
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : true, // Handled by Vite server proxy in dev
  credentials: true
}));
app.use(morgan('dev')); // Request logging
app.use(express.json()); // Body parser

// Apply general rate-limiter to all API routes
app.use('/api', generalRateLimiter);

// 2. HEALTH CHECK ROUTE
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  });
});

// 3. MODULE API ROUTES
app.use('/api/profile', profileRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/analytics', analyticsRoutes);

// 4. SERVE STATIC FRONTEND IN PRODUCTION
const clientDistPath = path.resolve(__dirname, '../dist');
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(clientDistPath));
}

// 5. API FALLBACK 404 & FRONTEND ROUTER WILD CARD
app.get('*', (req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return next();
  }
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  } else {
    next();
  }
});

app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// 6. GLOBAL ERROR HANDLER
app.use(errorHandler);

export default app;
