import { getAppUrl, sendEmail } from '@/lib/email'

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

export const sendVerificationEmail = async (to: string, token: string, siteName = 'เว็บไซต์ของคุณ') => {
  const appUrl = getAppUrl()
  const verifyUrl = `${appUrl}/verify-email?token=${token}`
  const safeSiteName = escapeHtml(siteName)

  const html = `
    <div style="font-family: 'Kanit', 'Noto Sans Thai', 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #0f172a; background: #f8fafc; padding: 32px;">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@400;600;700&family=Noto+Sans+Thai:wght@400;600;700&display=swap');
      </style>
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12);">
        <div style="background: linear-gradient(120deg, #0ea5e9, #22c55e); padding: 20px 24px;">
          <p style="margin: 0; font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; color: rgba(255,255,255,0.7);">Verify</p>
          <h2 style="margin: 8px 0 0; color: #ffffff; font-size: 24px;">ยืนยันอีเมลของคุณ</h2>
        </div>
        <div style="padding: 24px;">
          <p style="margin: 0 0 16px;">ขอบคุณที่สมัครใช้งาน <strong>${safeSiteName}</strong> กรุณาคลิกปุ่มด้านล่างเพื่อยืนยันอีเมลของคุณ</p>
          <div style="margin: 20px 0 24px;">
            <a href="${verifyUrl}" style="background: #0ea5e9; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 10px; display: inline-block; font-weight: 700;">
              ยืนยันอีเมล
            </a>
          </div>
          <div style="background: #f1f5f9; border-radius: 12px; padding: 12px 14px; font-size: 13px; color: #475569;">
            หากปุ่มไม่ทำงาน ให้คัดลอกลิงก์นี้ไปเปิดในเบราว์เซอร์:
            <div style="margin-top: 8px; word-break: break-all; color: #0f172a;">${verifyUrl}</div>
          </div>
        </div>
        <div style="padding: 16px 24px; background: #f8fafc; color: #94a3b8; font-size: 12px;">
          หากคุณไม่ได้ทำรายการนี้ สามารถละเว้นอีเมลนี้ได้
        </div>
      </div>
    </div>
  `

  return sendEmail({
    to,
    subject: `ยืนยันอีเมลสำหรับ ${siteName}`,
    html,
    text: `ยืนยันอีเมลของคุณ: ${verifyUrl}`
  })
}

export const sendPasswordResetEmail = async (to: string, token: string, siteName = 'เว็บไซต์ของคุณ') => {
  const appUrl = getAppUrl()
  const resetUrl = `${appUrl}/reset-password?token=${token}`
  const cancelUrl = `${appUrl}/reset-password/cancel?token=${token}`
  const safeSiteName = escapeHtml(siteName)

  const html = `
    <div style="font-family: 'Kanit', 'Noto Sans Thai', 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #0f172a; background: #f8fafc; padding: 32px;">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@400;600;700&family=Noto+Sans+Thai:wght@400;600;700&display=swap');
      </style>
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12);">
        <div style="background: linear-gradient(120deg, #f97316, #ef4444); padding: 20px 24px;">
          <p style="margin: 0; font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; color: rgba(255,255,255,0.7);">Reset</p>
          <h2 style="margin: 8px 0 0; color: #ffffff; font-size: 24px;">รีเซ็ตรหัสผ่าน</h2>
        </div>
        <div style="padding: 24px;">
          <p style="margin: 0 0 16px;">เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับ <strong>${safeSiteName}</strong></p>
          <p style="margin: 0 0 16px; font-size: 13px; color: #475569;">ลิงก์นี้จะหมดอายุใน 5 นาที</p>
          <div style="margin: 20px 0 24px;">
            <a href="${resetUrl}" style="background: #ef4444; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 10px; display: inline-block; font-weight: 700;">
              ตั้งรหัสผ่านใหม่
            </a>
          </div>
          <div style="margin: 0 0 20px;">
            <a href="${cancelUrl}" style="background: #0f172a; color: #ffffff; text-decoration: none; padding: 10px 16px; border-radius: 10px; display: inline-block; font-weight: 600;">
              ไม่ใช่ฉัน
            </a>
          </div>
          <div style="background: #f1f5f9; border-radius: 12px; padding: 12px 14px; font-size: 13px; color: #475569;">
            หากปุ่มไม่ทำงาน ให้คัดลอกลิงก์นี้ไปเปิดในเบราว์เซอร์:
            <div style="margin-top: 8px; word-break: break-all; color: #0f172a;">${resetUrl}</div>
          </div>
        </div>
        <div style="padding: 16px 24px; background: #f8fafc; color: #94a3b8; font-size: 12px;">
          หากคุณไม่ได้เป็นผู้ขอรีเซ็ตรหัสผ่าน สามารถละเว้นอีเมลนี้ได้
        </div>
      </div>
    </div>
  `

  return sendEmail({
    to,
    subject: `รีเซ็ตรหัสผ่านสำหรับ ${siteName}`,
    html,
    text: `รีเซ็ตรหัสผ่าน: ${resetUrl}`
  })
}
