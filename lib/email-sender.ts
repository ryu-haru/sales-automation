import nodemailer from 'nodemailer'

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  senderName: string
): Promise<{ success: boolean; error?: string }> {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD

  if (!user || !pass) {
    return { success: false, error: 'GMAIL_USER / GMAIL_APP_PASSWORD が未設定です' }
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    })

    await transporter.sendMail({
      from: `"${senderName}" <${user}>`,
      to,
      subject,
      text: body,
    })

    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}
