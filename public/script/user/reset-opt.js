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

async function verifyOTP(event) {
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
 
    try {
        const response = await fetch(`/reset-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({otp:otp})
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
            if(data.redirect){
                Swal.fire({ 
                    icon: "warning", title:data.message || 'Session Data is Expired..!', 
                    showConfirmButton: "OK",timer:1500, timerProgressBar: true
                })
                .then(() => {      
                    window.location = data.redirect 
                }) 
            }else {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Verify OTP';
                Swal.fire({
                    icon: "error",    
                    title:"Error",
                    text:data.message || 'Invalid Otp..!',
                    showConfirmButton: "OK",
                    timer:1500,  
                    timerProgressBar: true
                })
            }
        } else {
            Swal.fire({
                icon: "success",    
                title:"Success",
                text:data.message || 'OTP Verified Successfully',
                showConfirmButton: "OK",
                timer:1500,  
                timerProgressBar: true
            })
            .then(() => {
                history.replaceState(null,"","/reset-password");
                window.location.replace("/reset-password");
            });
        }
    } catch (error) {
        console.error('OTP Verification error:', error);
        Swal.fire('Error', 'Something went wrong: ' + error.message, 'error');
    }

    return false;
}



function resendOTP(event) {
    event.preventDefault(); 
    
    const resendBtn = document.getElementById('resendBtn');
    resendBtn.disabled = true;
    resendBtn.textContent = 'Sending...';

    $.ajax({
        type: "POST",
        url: "/resend-fOtp",
        headers: {
            'X-CSRF-TOKEN': csrfToken
        },
        data: {
            context: 'verification'
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
                resendBtn.textContent = 'Resend OTP';
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