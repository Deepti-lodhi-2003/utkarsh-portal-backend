import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';


import routes from './routes/index.js';
import { errorHandler, notFound } from './middlewares/error.middleware.js';

const app = express();

// Security Middleware
app.use(helmet());

// CORS
app.use(cors({
    origin: ['http://localhost:5173','http://localhost:5174'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Logger
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static folder for uploads
app.use('/uploads', express.static('uploads'));

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Utkarsh Ujjain API is running! ',
        timestamp: new Date().toISOString(),
        services: {
            database: 'connected',
            twilio: 'active',
            cloudinary: 'active',
            search: 'active'
        }
    });
});

// API Routes
app.use('/api', routes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

export default app;