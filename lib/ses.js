const nodemailer = require('nodemailer');

async function sendEmail(to, sub, msg, attachments = []) {
    const options = {
        from: `"UZA" <${env.SMTP.EMAIL_SOURCE}>`,
        to: to,
        subject: sub,
        html: msg,
    };

    const transporter = createTransport();
    const info = await transporter.sendMail(options);
    return info;
}

function createTransport() {
    const smtpUser = String(env.SMTP.USERNAME || "").trim();
    const smtpPass = String(env.SMTP.PASSWORD || "").replace(/\s+/g, "");
    const port = Number(env.SMTP.PORT || 587);
    const secure = Boolean(env.SMTP.SECURE);

    return nodemailer.createTransport({
        host: env.SMTP.HOST,
        port,
        secure,
        auth: {
            user: smtpUser,
            pass: smtpPass,
        },
    });
}

module.exports = { sendEmail };
