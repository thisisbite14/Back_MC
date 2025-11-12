const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
const MySQLStore = require('express-mysql-session')(session);
const pool = require('./db');               // mysql2 createPool
require('dotenv').config();

const app = express();

/** ----------------------------------------------------------------
 * CORS
 * - เปิดสำหรับ http://localhost:5173 และ http://127.0.0.1:5173
 * - เปิด credentials (ให้ cookie วิ่งได้)
 * - รองรับ preflight ด้วย optionsSuccessStatus 200
 * ---------------------------------------------------------------- */
const frontendURL = 'https://front-mc.vercel.app';
const corsOptions = {
  origin: frontendURL,
  credentials: true // สำคัญมาก! สำหรับการใช้ session/cookie ข้ามโดเมน
};

app.use(cors(corsOptions));

const ALLOWED_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];
app.use(cors({
  origin(origin, cb) {
    // อนุญาต client tools ที่ไม่มี Origin เช่น Postman หรือ curl
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token', 'x-auth-token'],
  optionsSuccessStatus: 200, // ✅ IE/legacy
}));

/** ----------------------------------------------------------------
 * Body parsers
 * - เพิ่ม limit เพื่อกัน json ใหญ่ ๆ
 * ---------------------------------------------------------------- */
app.use(express.json({ limit: '2mb' }));             // ✅ limit
app.use(express.urlencoded({ extended: true, limit: '2mb' })); // ✅ limit

/** ----------------------------------------------------------------
 * Session
 * - สำหรับ dev: secure:false, sameSite:lax เพียงพอ
 * - หากรันหลัง reverse proxy (Nginx) ค่อยเปิด trust proxy + secure:true
 * ---------------------------------------------------------------- */
// app.set('trust proxy', 1); // ✅ เปิดเมื่อมี proxy และจะใช้ cookie.secure:true

const sessionStore = new MySQLStore({}, pool); // ใช้ mysql2 pool ได้ตรง ๆ
app.use(session({
  name: 'mc.sid',
  secret: process.env.SESSION_SECRET || 'dev_secret_change_me',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 86400000,   // 1 วัน
    httpOnly: true,
    sameSite: 'lax',
    secure: false,      // ✅ เปิด true เมื่อใช้ HTTPS + trust proxy
  },
}));

/** ----------------------------------------------------------------
 * Static uploads
 * - ใส่ Cache-Control เบา ๆ เพื่อลด revalidate
 * ---------------------------------------------------------------- */
const uploadsPath = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsPath, {
  maxAge: '1h',                       // ✅ ให้ cache ฝั่งเบราเซอร์เล็กน้อย
  etag: true,
}));

/** ----------------------------------------------------------------
 * Routes
 *  (ต้อง mount หลังจาก session)
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
const siteRoutes        = require('./routes/site');   // ✅ /api/site/home ใช้ requireAdmin แล้ว
const uploadRoutes      = require('./routes/upload'); // uploader

// อัปโหลดควรวางก่อน 404
app.use('/api/files',  uploadRoutes); // ✅ Documents.jsx ใช้เส้นนี้
app.use('/api/upload', uploadRoutes); // ทางเก่า (สำรอง)

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
  // แยก error ของ CORS ชัด ๆ (จะเจอเวลา origin ไม่อยู่ใน allow-list)
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
