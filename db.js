const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306, // 👈 บรรทัดนี้สำคัญมาก! (ป้องกัน Port ผิด)
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,       // ✅ แนะนำให้เพิ่ม: ช่วยให้ Connection ไม่ถูกตัดเมื่อรอนานๆ
  keepAliveInitialDelay: 0     // ✅ แนะนำให้เพิ่ม: ลดดีเลย์ในการส่ง Ping หา Database
});

module.exports = pool;