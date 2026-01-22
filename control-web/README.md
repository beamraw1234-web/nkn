# Control Web (เว็บรอง) — ตัวอย่างใช้งานจริง

เว็บรองทำหน้าที่เป็น API Server + หน้า Admin สำหรับสั่ง “เปิด/ปิดเว็บหลัก” และจัดการ API Key หลายเว็บ

## 1) ตั้งค่า

สร้างไฟล์ `.env` จากตัวอย่าง `control-web/.env.example`

ค่าที่สำคัญ:
- `DATABASE_URL` (MySQL)
- `ADMIN_TOKEN` (ใช้เข้าหน้า admin + เรียก admin APIs)

## 2) ติดตั้ง/รัน

```bash
cd control-web
npm install
npx prisma migrate dev
npm run dev
```

## 3) ใช้งานหน้า Admin

- เปิด `http://localhost:4000/admin`
- ใส่ `ADMIN_TOKEN`
- สร้าง API Key → จะได้คีย์ (แสดงครั้งเดียว) เอาไปใส่ฝั่งเว็บหลักเป็น `CONTROL_WEB_API_KEY`
- ปิดเว็บ/แก้ข้อความปิดเว็บได้จากหน้านี้

## 4) API สำหรับเว็บหลัก

### GET `/api/web-status`

ส่ง header:
- `X-API-KEY: <prefix>.<secret>`

ตอบ:
```json
{ "off": true, "message": "ปิดปรับปรุงระบบ" }
```

หมายเหตุ:
- ทุกครั้งที่เรียก จะอัปเดต `last_seen` และ `last_ip`

## 5) Admin APIs (สำหรับ UI)

ส่ง header:
- `X-ADMIN-TOKEN: <ADMIN_TOKEN>` (หรือ `Authorization: Bearer <ADMIN_TOKEN>`)

Endpoints:
- `GET/PUT /api/admin/offweb`
- `GET/POST /api/admin/api-keys`
- `PATCH/DELETE /api/admin/api-keys/[id]`

