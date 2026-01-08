const nodemailer = require("nodemailer");

// Создаём transporter
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  
  return transporter;
}

/**
 * Отправка email
 */
async function sendEmail({ to, subject, html, text }) {
  const transport = getTransporter();
  
  const info = await transport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
    text
  });
  
  console.log("Email sent:", info.messageId);
  return info;
}

/**
 * Отправка письма подтверждения email
 */
async function sendVerificationEmail(email, token) {
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:5173";
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { 
          display: inline-block; 
          padding: 12px 24px; 
          background: linear-gradient(120deg, #2ee6ff, #7cff6b);
          color: #041018; 
          text-decoration: none; 
          border-radius: 25px;
          font-weight: bold;
        }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎮 Добро пожаловать в True or Do!</h1>
        <p>Спасибо за регистрацию! Пожалуйста, подтвердите ваш email, нажав на кнопку ниже:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" class="button">Подтвердить Email</a>
        </p>
        <p>Или скопируйте эту ссылку в браузер:</p>
        <p style="word-break: break-all; color: #2ee6ff;">${verifyUrl}</p>
        <p class="footer">
          Ссылка действительна 24 часа.<br>
          Если вы не регистрировались в True or Do, просто проигнорируйте это письмо.
        </p>
      </div>
    </body>
    </html>
  `;
  
  const text = `
    Добро пожаловать в True or Do!
    
    Подтвердите ваш email, перейдя по ссылке:
    ${verifyUrl}
    
    Ссылка действительна 24 часа.
  `;
  
  return sendEmail({
    to: email,
    subject: "🎮 Подтвердите email для True or Do",
    html,
    text
  });
}

/**
 * Отправка письма сброса пароля
 */
async function sendPasswordResetEmail(email, token) {
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:5173";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { 
          display: inline-block; 
          padding: 12px 24px; 
          background: linear-gradient(120deg, #2ee6ff, #7cff6b);
          color: #041018; 
          text-decoration: none; 
          border-radius: 25px;
          font-weight: bold;
        }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🔐 Сброс пароля</h1>
        <p>Вы запросили сброс пароля для вашего аккаунта True or Do.</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" class="button">Сбросить пароль</a>
        </p>
        <p>Или скопируйте эту ссылку в браузер:</p>
        <p style="word-break: break-all; color: #2ee6ff;">${resetUrl}</p>
        <p class="footer">
          Ссылка действительна 1 час.<br>
          Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.
        </p>
      </div>
    </body>
    </html>
  `;
  
  const text = `
    Сброс пароля True or Do
    
    Перейдите по ссылке для сброса пароля:
    ${resetUrl}
    
    Ссылка действительна 1 час.
  `;
  
  return sendEmail({
    to: email,
    subject: "🔐 Сброс пароля True or Do",
    html,
    text
  });
}

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail
};
