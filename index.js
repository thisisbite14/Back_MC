const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
const MySQLStore = require('express-mysql-session')(session);
const pool = require('./db');
require('dotenv').config();

const app = express();

/** ----------------------------------------------------------------
 * CORS
 * ---------------------------------------------------------------- */
// ดึง URL ของ Vercel มาจาก Environment Variable
const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';

// รายการ URL ที่อนุญาตทั้งหมด
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  frontendURL,
];

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token', 'x-auth-token'],
  optionsSuccessStatus: 200,
}));


/** ----------------------------------------------------------------
 * Body parsers
 * ---------------------------------------------------------------- */
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

/** ----------------------------------------------------------------
 * Session
 * ---------------------------------------------------------------- */
// ✅ เปิด trust proxy เพราะ Railway อยู่หลัง Proxy
app.set('trust proxy', 1); 

const sessionStore = new MySQLStore({}, pool);
app.use(session({
  name: 'mc.sid',
  secret: process.env.SESSION_SECRET || 'dev_secret_change_me',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 86400000,   // 1 วัน
    httpOnly: true,
    sameSite: 'none',  // 👈 แก้ไข
    secure: true,      // 👈 แก้ไข
  },
}));

/** ----------------------------------------------------------------
 * Static uploads
 * ---------------------------------------------------------------- */
const uploadsPath = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsPath, {
  maxAge: '1h',
  etag: true,
}));

/** ----------------------------------------------------------------
 * Routes
 * ---------------------------------------------------------------- */
const authRoutes        = require('./routes/auth');
const memberRoutes      = require('./routes/members');
const bandRoutes        = require('./routes/bands');
const scheduleRoutes    = require('./routes/schedules');
const userRoutes        = require('./routes/users');
const financeRoutes     = require('./routes/finances');
const projectRoutes     = require('./routes/projects');
const equipmentsRoutes  = require('./routes/equipments');
const permissionRoutes  = require('./routes/permissions');
const siteRoutes        = require('./routes/site');
const uploadRoutes      = require('./routes/upload');

app.use('/api/files',     uploadRoutes);
app.use('/api/upload',    uploadRoutes);

app.use('/api/site',        siteRoutes);
app.use('/api/auth',        authRoutes);
app.use('/api/members',     memberRoutes);
app.use('/api/bands',       bandRoutes);
app.use('/api/schedules',   scheduleRoutes);
app.use('/api/users',       userRoutes);
app.use('/api/finances',    financeRoutes);
app.use('/api/projects',    projectRoutes);
app.use('/api/equipments',  equipmentsRoutes);
app.use('/api/permissions', permissionRoutes);

/** ----------------------------------------------------------------
 * 404 / 500
 * ---------------------------------------------------------------- */
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

app.use((err, req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'CORS forbidden: ' + (req.headers.origin || '') });
  }
  console.error('Error:', err && (err.stack || err));
  res.status(500).json({ message: 'Internal Server Error' });
});

/** ----------------------------------------------------------------
 * Start
 * ---------------------------------------------------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});