import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env.js';
import { connectDatabase } from './config/db.js';
import apiRouter from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFoundHandler } from './middlewares/notFoundHandler.js';

const app: Express = express();

// Security Middleware
app.use(helmet());

// CORS Configuration
const allowedOrigins = [
  config.clientUrl,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Request Logging
if (config.nodeEnv !== 'test') {
  app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));
}

// Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root Route
app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Collection & Loan Recovery Management System (CLRMS) API',
    version: '1.0.0',
    documentation: '/api/v1/health',
  });
});

// API Routes
app.use('/api/v1', apiRouter);

// 404 Handler
app.use(notFoundHandler);

// Centralized Error Handler
app.use(errorHandler);

// Start Server Function
export const startServer = async () => {
  // Initialize Database Connection
  await connectDatabase();

  const server = app.listen(config.port, () => {
    console.log(`=========================================`);
    console.log(` CLRMS Server running on port ${config.port}`);
    console.log(` Environment: ${config.nodeEnv}`);
    console.log(` Health API: http://localhost:${config.port}/api/v1/health`);
    console.log(`=========================================`);
  });

  return server;
};

// Start server if executed directly
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
