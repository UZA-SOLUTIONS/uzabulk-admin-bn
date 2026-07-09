const nodemailer = require('nodemailer');
async function sendEmail(to, sub, msg, attachments = []) {

    const options = {
        from: `"UZA" <${env.SMTP.EMAIL_SOURCE}>`,
        to: to,
        subject: sub,
        html: msg,
    };

    var transporter = createTransport();
    const info = await transporter.sendMail(options);
    return info;
};

function createTransport() {
    return nodemailer.createTransport({
        host: env.SMTP.HOST,
        port: 465,
        secure: true, // use SSL
        auth: {
            user: env.SMTP.USERNAME,
            pass: env.SMTP.PASSWORD,
        },
    });
};

module.exports = { sendEmail };