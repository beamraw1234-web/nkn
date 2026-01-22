module.exports = {
  apps: [
    {
      name: 'nkn-next-app',                // ชื่อที่ pm2 จะใช้
      cwd: __dirname,
      env_file: '.env',
      script: 'node',
      args: ['server.cjs'],
      instances: 1,                        // เริ่มต้นใช้ 1 ถ้าต้องการ cluster เปลี่ยนเป็น 'max' หรือเลขตาม CPU
      exec_mode: 'fork',                   // fork ง่ายสุด ถ้าจะ cluster เปลี่ยนเป็น 'cluster'
      autorestart: true,
      watch: false,                        // ปิดใน production
      max_memory_restart: '1G',            // restart ถ้า RAM เกิน 1GB
      env: {
        NODE_ENV: 'production',
        NEXT_DISABLE_TURBOPACK: '1',
        PORT: 3001,                        // port ที่ Next.js จะฟัง (ต้องไม่ชนกับ IIS)
        HOSTNAME: '0.0.0.0'                // รับ connection จากทุก IP (สำคัญ!)
      },
      // log แยกให้ดูง่าย (optional แต่แนะนำ)
      error_file: './logs/err.log',
      out_file:  './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      time: true
    }
  ]
};