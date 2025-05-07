const { sendEmail } = require('./email'); 

async function sendUserStatusEmail(user) {
    const emailContent = user.isBlocked
        ? {
              subject: 'Account Blocked Notification',
              html: `
                  <div style="font-family: Arial, sans-serif; padding: 20px;">
                      <h2 style="color: #d9534f;">Account Blocked</h2>
                      <p>Dear ${user.username},</p>
                      <p>Your account has been blocked. Contact support for details.</p>
                      <p>Regards,<br>Support Team</p>
                  </div>
              `,
          }
        : {
              subject: 'Account Unblocked Notification',
              html: `
                  <div style="font-family: Arial, sans-serif; padding: 20px;">
                      <h2 style="color: #28a745;">Account Unblocked</h2>
                      <p>Dear ${user.username},</p>
                      <p>Your account has been unblocked. You can now access the platform.</p>
                      <p>Regards,<br>Support Team</p>
                  </div>
              `,
          };

    return await sendEmail({
        to: user.email,
        subject: emailContent.subject,
        html: emailContent.html,
    });
}
       
async function sendForgotOtp (user, otp) { 
    const emailContent = {
        subject :"Password Reset OTP",
        html :`
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: #007bff;">Password Reset OTP</h2>
                <p>Dear ${user.username},</p>
                <p>Your OTP for password reset is: <strong>${otp}</strong></p>
                <p>This OTP is valid for 1 minute. Please do not share it with anyone.</p>
                <p>Regards,<br>Support Team</p>
            </div>
        `
    }

    return await sendEmail({
        to: user.email,
        subject: emailContent.subject,
        html: emailContent.html,
    });
}

async function sendSignupOtp(username,email,otp) {  
    const emailContent = {
        subject: "Account Verification OTP",
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: #007bff;">Welcome to Our Platform!</h2>
                <p>Dear ${username},</p>
                <p>Thank you for signing up! To complete your account verification, please use the following OTP:</p>
                <p>Your OTP is: <strong>${otp}</strong></p>
                <p>This OTP is valid for 60 seconds. Please do not share it with anyone.</p>
                <p>If you did not sign up for this account, please ignore this email.</p>
                <p>Regards,<br>Support Team</p>
            </div>
        `
    };
 
    return await sendEmail({
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
    });
}

async function sendProfileUpdateOtp(username, email, otp) {
    const emailContent = {
        subject: "Profile Update OTP Verification",
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: #007bff;">Profile Update Verification</h2>
                <p>Dear ${username},</p>
                <p>You’ve requested to update your email. Please use the following OTP to verify:</p>
                <p>Your OTP is: <strong>${otp}</strong></p>
                <p>This OTP is valid for 10 minutes. Do not share it.</p>
                <p>If you didn’t request this, please contact support.</p>
                <p>Regards,<br>Support Team</p>
            </div>
        `
    };
    console.log(`Sending OTP ${otp} to ${email} for ${username}`);
    return await sendEmail({
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
    });
}

async function sendstatusUpdateMail(status , order) {
    const emailContent = status === "approved" 
        ? {
              subject: 'Return Request Approved',
              html: `

              <p>Dear ${order.userId.username}, 
              your return request for order #${order.orderId} has been approved.
               ₹${order.finalAmount.toLocaleString('en-IN')} has been credited to your wallet.</p>
             
                `,
          }
        : {
              subject: 'Return Request Rejected',
              html: `
                  <p>Dear ${order.userId.username}, your return request for order #${order.orderId} has been rejected.</p>
              `,
          };

    return await sendEmail({
        to: order.userId.email,
        subject: emailContent.subject,
        html: emailContent.html,
    });
}

module.exports = { 
    sendUserStatusEmail, 
    sendForgotOtp,
    sendSignupOtp,
    sendProfileUpdateOtp,
    sendstatusUpdateMail
};