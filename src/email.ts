import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail', // You can use other email services
    auth: {
        user: process.env.EMAIL_ADDRESS,
        pass: process.env.EMAIL_PW,
    },
});

export const sendEmail = (to: string, subject: string, text: string) => {
    console.log(process.env.EMAIL_ADDRESS)
    const mailOptions = {
        from: process.env.EMAIL_ADDRESS,
        to,
        subject,
        text,
    };

    return transporter.sendMail(mailOptions);
};