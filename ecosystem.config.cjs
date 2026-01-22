// ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'nkn-next-app',
      cwd: __dirname,
      env_file: '.env',                   // ต้องมี .env ใน folder เดียวกับนี้
      script: 'node',
      args: ['server.cjs'],
      instances: 1,                       // เปลี่ยนเป็น 'max' ถ้า server มี CPU หลายคอร์ + อยากเร็วขึ้น
      exec_mode: 'fork',                  // ถ้าใช้ cluster เปลี่ยนเป็น 'cluster'
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',           // restart ถ้า RAM เกิน 1GB (ปรับตาม server)
      max_restarts: 10,
      kill_timeout: 5000,                 // ให้เวลา graceful shutdown 5 วินาที (ดีกับ Next.js)
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/err.log',       // แยก log ให้ดูง่าย
      out_file: './logs/out.log',
      env: {
        NODE_ENV: 'production',
        NEXT_DISABLE_TURBOPACK: '1',
        PORT: 3001,                       // เปลี่ยนเป็น 3001 เพื่อไม่ชนกับ port อื่น (IIS จะ proxy มาที่นี่)
        HOSTNAME: '0.0.0.0',              // รับ connection จากทุก IP (สำคัญมาก!)
      },
    },
  ],
};