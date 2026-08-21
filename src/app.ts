import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { env } from './config/env';
import { globalLimiter, errorHandler } from './middleware';
import routes from './routes';

const app = express();

// Security and compression middleware
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(compression());

// Parse JSON and url-encoded payloads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting to all requests in production
if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // Trust first proxy if behind Nginx/ELB
  app.use(globalLimiter);
}

// Setup Routes
app.use('/api', routes);

// Handle 404
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

// Global Error Handler
app.use(errorHandler);

export default app;
