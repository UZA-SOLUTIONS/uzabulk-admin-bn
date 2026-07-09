const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

module.exports.sendEmail = async (to, subject, message, attachments = []) => {
    return new Promise(async (resolve, reject) => {
        try {
            // Create a transporter using Gmail's SMTP settings
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: env.GMAIL.EMAIL, // Your Gmail address
                    pass: env.GMAIL.PASSWORD, // App password for Gmail
                },
            });

            // Prepare attachments for nodemailer
            const formattedAttachments = attachments
                .filter(filePath => typeof filePath === 'string' && fs.existsSync(filePath))
                .map(filePath => ({
                    filename: path.basename(filePath),
                    path: filePath, // Path to the file
                }));

            // Mail options
            const mailOptions = {
                from: env.GMAIL.EMAIL, // Sender address
                to, // Receiver address
                subject, // Subject line
                html: message, // HTML body
                attachments: formattedAttachments, // Attachments
            };

            // Send email
            const info = await transporter.sendMail(mailOptions);
            console.log('Email sent: ', info.messageId);
            resolve(info);
        } catch (error) {
            console.error('Error sending email: ', error);
            reject(error);
        }
    });
};