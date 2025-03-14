let timeLeft = 60;
let timerId = null;

// Get CSRF token from meta tag
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

function startTimer() {
    document.getElementById('resendBtn').disabled = true;
    timerId = setInterval(updateTimer, 1000);
}

function updateTimer() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timerElement = document.getElementById('timer');
    const timerCircle = document.getElementById('timerCircle');
    
    const percentage = (timeLeft / 60) * 100;
    const degrees = (percentage / 100) * 360;
    timerCircle.style.background = `conic-gradient(#4CAF50 ${degrees}deg, transparent 0deg)`;
    
    timerElement.textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    if (timeLeft === 0) {
        clearInterval(timerId);
        document.getElementById('resendBtn').disabled = false;
        return;
    }
    timeLeft--;
}

function moveToNext(input, index) {
    const inputs = document.querySelectorAll('.otp-box');
    
    if (input.value.length === input.maxLength) {
        if (index < 5) {
            inputs[index + 1].focus();
        }
    } else if (input.value.length === 0 && index > 0) {
        inputs[index - 1].focus();
    }
}

function verifyOTP(event) {
    event.preventDefault();
    
    // Get all OTP inputs
    const inputs = document.querySelectorAll('.otp-box');
    
    // Validate if all inputs are filled
    let isValid = true;
    inputs.forEach(input => {
        if (!input.value) {
            isValid = false;
        }
    });

    if (!isValid) {
        Swal.fire({
            icon: "error",
            title: "Incomplete OTP",
            text: "Please enter all digits of the OTP"
        });
        return false;
    }

    // Get OTP value
    const otp = Array.from(inputs).map(input => input.value).join('');
    
    // Validate OTP length
    if (otp.length !== 6) {
        Swal.fire({
            icon: "error",
            title: "Invalid OTP",
            text: "OTP must be 6 digits"
        });
        return false;
    }

    // Disable submit button
    const submitBtn = document.querySelector('.verify-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Verifying...';

    // Send AJAX request
    $.ajax({
        type: "POST",
        url: "/user/verify-otp",
        data: { 
            otp: otp 
        },
        headers: {
            'X-CSRF-TOKEN': csrfToken 
        },
        success: function(response) {
            if (response.success) {
                Swal.fire({
                    icon: "success",
                    title: "OTP Verified Successfully",
                    showConfirmButton: false,
                    timer: 1500
                }).then(() => {
                    history.replaceState(null,"",response.redirectUrl);
                    window.location.replace(response.redirectUrl);
                    // window.location.href = response.redirectUrl;
                });
            } else {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Verify OTP';
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: response.message
                });
            }
        },
        error: function(xhr, status, error) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Verify OTP';
            Swal.fire({
                icon: "error",
                title: "Invalid OTP",
                text: "Please try again"
            });
        }
    });

    return false;
}

function resendOTP(event) {
    event.preventDefault(); 

    const context = document.querySelector('input[name="context"]').value || 'verification';
    
    const resendBtn = document.getElementById('resendBtn');
    resendBtn.disabled = true;
    resendBtn.textContent = 'Sending...';

    $.ajax({
        type: "POST",
        url: "/user/resend-otp",
        headers: {
            'X-CSRF-TOKEN': csrfToken
        },
        success: function(response) {
            if (response.success) {
                timeLeft = 60;
                startTimer();
                resetOTP();
                Swal.fire({
                    icon: "success",
                    title: "OTP Resent",
                    text: "Please check your email for the new OTP",
                    showConfirmButton: false,
                    timer: 1500
                });
            } else {
                resendBtn.disabled = false;
                resendBtn.textContent = 'Resend OTP';
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: response.message || "Failed to resend OTP"
                });
            }
        },
        error: function(xhr) {
            resendBtn.disabled = false;
            resendBtn.textContent = 'Resend OTP';
            Swal.fire({
                icon: "error",
                title: "Error",
                text: xhr.responseJSON?.message || "Failed to resend OTP. Please try again."
            });
        }
    });
}

function resetOTP() {
    const inputs = document.querySelectorAll('.otp-box');
    inputs.forEach(input => input.value = '');
    inputs[0].focus();
}

// Initialize when document loads
document.addEventListener('DOMContentLoaded', function() {
    startTimer();

    const inputs = document.querySelectorAll('.otp-box');
    
    inputs.forEach((input, index) => {
        // Handle backspace
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && !this.value && index > 0) {
                inputs[index - 1].focus();
            }
        });
        
        // Only allow numbers
        input.addEventListener('keypress', function(e) {
            if (!/[0-9]/.test(e.key)) {
                e.preventDefault();
            }
        });
        
        // Clean non-numeric input
        input.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '');
        });
    });
});