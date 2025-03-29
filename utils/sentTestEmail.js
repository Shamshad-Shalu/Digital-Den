require('dotenv').config();
const {sendEmail} = require('./email');

async function sendEmailOtp(username, email, otp) {
    const emailContent = {
        subject: "Email Update OTP Verification",
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: #007bff;">Email Update Verification</h2>
                <p>Dear ${username},</p>
                <p>You’ve requested to update your email. Please use the following OTP:</p>
                <p>Your OTP is: <strong>${otp}</strong></p>
                <p>This OTP is valid for 10 minutes. Do not share it.</p>
                <p>Regards,<br>Support Team</p>
            </div>
        `
    };
    return await sendEmail({ to: email, subject: emailContent.subject, html: emailContent.html });
}

async function sendPhoneOtp(username, phone, otp, email) {
    const emailContent = {
        subject: "Phone Number Verification OTP",
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: #007bff;">Phone Number Verification</h2>
                <p>Dear ${username},</p>
                <p>You’ve requested to verify the phone number: <strong>${phone}</strong>.</p>
                <p>Please use the following OTP to complete the verification:</p>
                <p>Your OTP is: <strong>${otp}</strong></p>
                <p>This OTP is valid for 10 minutes. Do not share it.</p>
                <p>Regards,<br>Support Team</p>
            </div>
        `
    };
    return await sendEmail({ to: email, subject: emailContent.subject, html: emailContent.html });
}

function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
}

module.exports = { sendEmailOtp, sendPhoneOtp, generateOtp };