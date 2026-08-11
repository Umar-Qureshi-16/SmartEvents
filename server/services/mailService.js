const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = async () => {
    if (transporter) return transporter;

    const emailMode = process.env.EMAIL_MODE || 'test';

    if (emailMode === 'production') {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    } else {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });
        console.log(`◇ Nodemailer: Ethereal test account initialized: user=${testAccount.user}`);
    }

    return transporter;
};

exports.sendEmail = async (to, subject, htmlText) => {
    try {
        const client = await getTransporter();
        const info = await client.sendMail({
            from: '"SmartEvents Platform" <concierge@smartevents.com>',
            to,
            subject,
            html: htmlText
        });

        if (process.env.EMAIL_MODE !== 'production') {
            console.log(`\n=================== NODEMAILER DEMO EMAIL ===================`);
            console.log(`Subject: ${subject}`);
            console.log(`To: ${to}`);
            console.log(`Ethereal Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
            console.log(`============================================================\n`);
        }
        return info;
    } catch (err) {
        console.error('Error sending email:', err);
    }
};
