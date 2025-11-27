const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'test',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,      // สำคัญสำหรับ Cloud Database
  keepAliveInitialDelay: 0
};

// Log การตั้งค่า (ไม่แสดง Password เพื่อความปลอดภัย)
console.log('----------------------------------------------------------------');
console.log('🔌 Database Connection Config:');
console.log(`   HOST: ${dbConfig.host}`);
console.log(`   PORT: ${dbConfig.port}`);
console.log(`   USER: ${dbConfig.user}`);
console.log(`   DB:   ${dbConfig.database}`);
console.log('----------------------------------------------------------------');

const pool = mysql.createPool(dbConfig);

module.exports = pool;