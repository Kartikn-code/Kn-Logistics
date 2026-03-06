import express from 'express';
import nodemailer from 'nodemailer';

const router = express.Router();

// Email transporter setup using Gmail
// Requires EMAIL_USER and EMAIL_PASS environment variables
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'ponniammantransport2023@gmail.com',
        pass: process.env.EMAIL_PASS || 'YOUR_APP_PASSWORD_HERE' // Must be an App Password, not regular password
    }
});

router.post('/contact', async (req, res) => {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Name, email, and message are required fields.' });
    }

    const mailOptions = {
        from: `"${name}" <${email}>`, // Note: Gmail often overrides 'from' with the authenticated user, but Reply-To helps
        to: 'ponniammantransport2023@gmail.com',
        replyTo: email,
        subject: `[Website Contact] ${subject || 'General Inquiry'} - From ${name}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #FFCC80; border-radius: 8px;">
                <h2 style="color: #D84315; text-align: center; border-bottom: 2px solid #FFE0B2; padding-bottom: 15px;">New Website Contact Form Submission</h2>
                
                <div style="background-color: #FFF3E0; padding: 15px; border-radius: 6px; margin-top: 20px;">
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> <a href="mailto:${email}" style="color: #FF5722;">${email}</a></p>
                    <p><strong>Subject:</strong> ${subject}</p>
                </div>
                
                <h3 style="color: #1F2937; margin-top: 25px;">Message Details:</h3>
                <div style="background-color: #f9fafb; padding: 20px; border-left: 4px solid #FF7043; border-radius: 4px; white-space: pre-wrap;">
${message}
                </div>
                
                <p style="margin-top: 30px; font-size: 0.85em; color: #4B5563; text-align: center;">
                    This email was automatically generated from the KN Logistics website contact form.
                    You can reply directly to this email to respond to <strong>${name}</strong>.
                </p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: 'Your message has been sent successfully!' });
    } catch (error) {
        console.error('Error sending contact email:', error);
        res.status(500).json({ error: 'Failed to send message. Please try again later or contact us directly via phone.' });
    }
});

export default router;
