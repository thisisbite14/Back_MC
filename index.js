const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
const MySQLStore = require('express-mysql-session')(session);
const pool = require('./db');
require('dotenv').config();

const app = express();

// ----------------------------------------------------------------
//  การตั้งค่าสภาพแวดล้อม (Environment)
// ----------------------------------------------------------------
const isProduction = process.env.NODE_ENV === 'production';
console.log(`Running in ${isProduction ? 'production' : 'development'} mode.`);

/** ----------------------------------------------------------------
 * CORS Configuration
 * ---------------------------------------------------------------- */
// 1. ดึงค่าจาก Env และตัด / ตัวสุดท้ายออก (ถ้ามี) เพื่อให้ Normalize
const rawFrontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
const frontendURL = rawFrontendURL.replace(/\/$/, ""); 

app.use(cors({
  origin(origin, cb) {
    // อนุญาต request ที่ไม่มี origin (เช่น Postman, Mobile App, Server-to-Server)
    if (!origin) return cb(null, true);

    // สร้างรายการที่อนุญาต (Allow List)
    const allowedOrigins = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      
      // 1. จากตัวแปร Env (ทั้งแบบมีและไม่มี /)
      frontendURL,
      `${frontendURL}/`,
      
      // 2. Hardcode โดเมนหลักของคุณ (ทั้งแบบมีและไม่มี /)
      'https://mc-project-53qj.vercel.app',
      'https://mc-project-53qj.vercel.app/',
      'https://front-mc.vercel.app',     // (เผื่อไว้ถ้ายังใช้โดเมนเก่า)
      'https://front-mc.vercel.app/'
    ];

    // เพิ่ม Vercel Preview URL อัตโนมัติ (ถ้ามี)
    if (isProduction && process.env.VERCEL_URL) {
        allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
    }

    // ตรวจสอบว่า Origin ที่เข้ามา มีอยู่ในรายการไหม
    if (allowedOrigins.includes(origin)) {
      return cb(null, true);
    }

    // Log ดูว่าใครโดนบล็อก (ช่วย Debug ได้ดีมากใน Railway Logs)
    console.error(`🚫 Blocked by CORS: ${origin}`);
    return cb(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true, // สำคัญมาก! ให้ส่ง Cookie/Session ได้
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token', 'x-auth-token'],
  optionsSuccessStatus: 200,
}));

/** ----------------------------------------------------------------
 * Body parsers
 * ---------------------------------------------------------------- */
app.use(express.json({ limit: '10mb' })); // เผื่อรูปใหญ่ขึ้นนิดหน่อย
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/** ----------------------------------------------------------------
 * Session Setup
 * ---------------------------------------------------------------- */
// ✅ เปิด trust proxy เสมอบน Railway (เพราะอยู่หลัง Nginx/Cloudflare)
app.set('trust proxy', 1); 

const sessionStore = new MySQLStore({
    // ตัวเลือกเพิ่มเติมสำหรับ MySQL Store เพื่อความเสถียร
    clearExpired: true,
    checkExpirationInterval: 900000, // 15 นาที
    expiration: 86400000, // 1 วัน
}, pool);

app.use(session({
  name: 'mc.sid',
  secret: process.env.SESSION_SECRET || 'dev_secret_change_me',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 86400000,   // 1 วัน
    httpOnly: true,
    // ✅ Production: 'none' (ข้ามโดเมนได้), Development: 'lax'
    sameSite: isProduction ? 'none' : 'lax', 
    // ✅ Production: true (ต้อง https), Development: false
    secure: isProduction,                   
  },
}));

/** ----------------------------------------------------------------
 * Static & Routes
 * ---------------------------------------------------------------- */
const uploadsPath = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsPath, { maxAge: '1h', etag: true }));

// Routes Import
app.use('/api/files',       require('./routes/upload'));
app.use('/api/upload',      require('./routes/upload'));
app.use('/api/site',        require('./routes/site'));
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/members',     require('./routes/members'));
app.use('/api/bands',       require('./routes/bands'));
app.use('/api/schedules',   require('./routes/schedules'));
app.use('/api/users',       require('./routes/users'));
app.use('/api/finances',    require('./routes/finances'));
app.use('/api/projects',    require('./routes/projects'));
app.use('/api/equipments',  require('./routes/equipments'));
app.use('/api/permissions', require('./routes/permissions'));

/** ----------------------------------------------------------------
 * Error Handling
 * ---------------------------------------------------------------- */
app.get('/', (req, res) => {
  res.send(`<h1>✅ Backend API is running!</h1><p>Environment: ${process.env.NODE_ENV}</p>`);
});

app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

app.use((err, req, res, next) => {
  if (err && err.message && err.message.startsWith('Not allowed by CORS')) {
    return res.status(403).json({ message: 'CORS forbidden' });
  }
  console.error('Server Error:', err);
  res.status(500).json({ message: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});