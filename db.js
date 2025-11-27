const mysql = require('mysql2/promise');
require('dotenv').config();

// อ่านค่า Config
const dbConfig = {
  host: process.env.DB_HOST || 'localhost', // ค่า Default ถ้าไม่เจอ Env
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'test',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

// 🚨 Log เพื่อดูว่า Server กำลังพยายามต่อที่ไหน (ห้ามลืมดู Log นี้ใน Railway!)
console.log('----------------------------------------------------------------');
console.log('🔌 Attempting to connect to Database...');
console.log(`   HOST: ${dbConfig.host}`);
console.log(`   PORT: ${dbConfig.port}`);
console.log(`   USER: ${dbConfig.user}`);
console.log(`   DB:   ${dbConfig.database}`);
console.log('----------------------------------------------------------------');

const pool = mysql.createPool(dbConfig);

module.exports = pool;