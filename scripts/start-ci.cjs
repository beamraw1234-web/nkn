const { spawnSync } = require('child_process');

process.env.NODE_ENV = 'production';
process.env.NEXT_DISABLE_TURBOPACK = '1';

const res = spawnSync('npx', ['next', 'start'], { stdio: 'inherit', env: process.env });
process.exit(res.status || 0);
