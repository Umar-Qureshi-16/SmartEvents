const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = async () => {
    if (transporter) return transporter;

    if (process.env.NODE_ENV === 'test') {
        transporter = nodemailer.createTransport({
            jsonTransport: true
        });
        return transporter;
    }

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
            from: process.env.MAIL_FROM || '"SmartEvents Platform" <concierge@smartevents.com>',
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
        throw err;
    }
};

exports.sendVerificationEmail = async (to, name, token) => {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const verificationUrl = `${clientUrl}/verify-email?token=${token}`;

    const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b;">
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%); padding: 32px 24px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Smartie Events</h1>
            <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Verify your email address to get started</p>
        </div>
        <div style="padding: 32px 24px;">
            <h2 style="color: #f1f5f9; font-size: 20px; margin-top: 0;">Welcome, ${name || 'Event Enthusiast'}!</h2>
            <p style="color: #94a3b8; font-size: 15px; line-height: 1.6;">
                Thank you for joining Smartie! To complete your registration and activate your account, please verify your email address.
            </p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="${verificationUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                    Verify Email Address
                </a>
            </div>
            <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
                If the button above doesn't work, copy and paste this link into your browser:
                <br />
                <a href="${verificationUrl}" style="color: #38bdf8; word-break: break-all;">${verificationUrl}</a>
            </p>
            <hr style="border: none; border-top: 1px solid #1e293b; margin: 24px 0;" />
            <p style="color: #64748b; font-size: 12px; margin: 0;">
                This link will expire in 24 hours. If you did not create an account with Smartie, you can safely ignore this email.
            </p>
        </div>
    </div>
    `;

    return exports.sendEmail(to, 'Verify your email for Smartie', html);
};
