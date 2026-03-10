// import express from 'express';
// import cors from 'cors';
// import cookieParser from 'cookie-parser';
// import helmet from 'helmet';
// import rateLimit from 'express-rate-limit';
// import dotenv from 'dotenv';
// import { createMaintenanceYear } from './utils/maintenance.utils';

// import authRoutes from './routes/auth.routes';
// import flatRoutes from './routes/flat.routes';
// import maintenanceRoutes from './routes/maintenance.routes';
// import paymentRoutes from './routes/payment.routes';
// import receiptRoutes from './routes/receipt.routes';
// import exportRoutes from './routes/export.routes';

// dotenv.config();

// const app = express();

// /* -------------------- SECURITY & MIDDLEWARE -------------------- */

// // Helmet for security headers
// app.use(helmet());

// // Body parser
// app.use(express.json());

// // Cookies
// app.use(cookieParser());

// // ✅ CORS (CRITICAL FIX)
// app.use(
//   cors({
//     origin: 'http://localhost:8080', // use 5173 if Vite
//     credentials: true,
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization'],
//   })
// );

// async function bootstrap() {
//   const currentYear = new Date().getFullYear();
//   // await createMaintenanceYear(currentYear);
// }

// bootstrap();

// // Rate limiting
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100,
// });
// app.use(limiter);

// /* -------------------- ROUTES -------------------- */

// app.get('/', (_req, res) => {
//   res.status(200).json({ message: 'API is running 🚀' });
// });

// app.use('/api/auth', authRoutes);
// app.use('/api/flats', flatRoutes);
// app.use('/api/maintenance', maintenanceRoutes);
// app.use('/api/payments', paymentRoutes);
// app.use('/api/receipts', receiptRoutes);
// app.use('/api/export', exportRoutes);

// /* -------------------- ERROR HANDLER -------------------- */

// app.use(
//   (
//     err: any,
//     _req: express.Request,
//     res: express.Response,
//     _next: express.NextFunction
//   ) => {
//     console.error(err.stack);
//     res.status(err.status || 500).json({
//       message: err.message || 'Internal Server Error',
//     });
//   }
// );



// /* -------------------- SERVER START -------------------- */

// const PORT = process.env.PORT || 5000;

// app.listen(PORT, () => {
//   console.log(`✅ Server running on http://localhost:${PORT}`);
// });

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createMaintenanceYear } from './utils/maintenance.utils';
import { paymentScheduler } from './services/scheduler.service';

import authRoutes from './routes/auth.routes';
import flatRoutes from './routes/flat.routes';
import maintenanceRoutes from './routes/maintenance.routes';
import paymentRoutes from './routes/payment.routes';
import receiptRoutes from './routes/receipt.routes';
import exportRoutes from './routes/export.routes';
import adminPaymentRoutes from './routes/admin.payment.routes';

dotenv.config();

const app = express();

/* -------------------- SECURITY & MIDDLEWARE -------------------- */

// Helmet for security headers
app.use(helmet());

// Body parser
app.use(express.json());

// Cookies - MUST come before CORS
app.use(cookieParser());

// ✅ CORS (Updated with exposedHeaders)
app.use(
  cors({
    origin: ['http://localhost:8080', 'http://localhost:5173', 'http://localhost:3000', 'http://192.168.1.10:8080', 'http://192.168.1.10:5173', 'https://society-pay.vercel.app' ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition', 'Content-Type'],
  })
);

// Bootstrap function
async function bootstrap() {
  try {
    const currentYear = new Date().getFullYear();
    await createMaintenanceYear(currentYear);
    console.log('✅ Maintenance year initialized');
    
    // Start payment scheduler
    paymentScheduler.start();
  } catch (error) {
    console.error('⚠️  Bootstrap error:', error);
  }
}

bootstrap();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
});
app.use(limiter);

/* -------------------- ROUTES -------------------- */

app.get('/', (_req, res) => {
  res.status(200).json({ message: 'API is running 🚀' });
});

app.use('/api/auth', authRoutes);
app.use('/api/flats', flatRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/admin/payments', adminPaymentRoutes); // ⭐ New admin payment routes

/* -------------------- ERROR HANDLER -------------------- */

app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
      message: err.message || 'Internal Server Error',
    });
  }
);

/* -------------------- SERVER START -------------------- */

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  paymentScheduler.stop();
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  paymentScheduler.stop();
  server.close(() => {
    console.log('HTTP server closed');
  });
});