const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

const logger = require('./utils/logger');
const swaggerSpec = require('./config/swagger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const categoryRoutes = require('./routes/categories');
const tagRoutes = require('./routes/tags');
const commentRoutes = require('./routes/comments');
const mediaRoutes = require('./routes/media');
const userRoutes = require('./routes/users');

const app = express();

app.set('trust proxy', 1);

// Security headers — relaxed cross-origin-resource-policy so uploaded
// images can be embedded by the frontend on a different origin.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  stream: { write: (message) => logger.info(message.trim()) },
}));

const apiLimiter = rateLimit({
  windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES, 10) || 15) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 200,
  message: { success: false, message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// Serve uploaded media
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
  maxAge: '7d',
}));

// API documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

const apiVersion = `/api/${process.env.API_VERSION || 'v1'}`;
app.use(`${apiVersion}/auth`, authRoutes);
app.use(`${apiVersion}/posts`, postRoutes);
app.use(`${apiVersion}/categories`, categoryRoutes);
app.use(`${apiVersion}/tags`, tagRoutes);
app.use(`${apiVersion}/comments`, commentRoutes);
app.use(`${apiVersion}/media`, mediaRoutes);
app.use(`${apiVersion}/users`, userRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
