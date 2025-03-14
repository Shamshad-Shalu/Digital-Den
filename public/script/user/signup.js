function togglePassword(inputId, iconId) {
    const passwordInput = document.getElementById(inputId);
    const eyeIcon = document.getElementById(iconId);
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.className = 'fa-regular fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        eyeIcon.className = 'fa-regular fa-eye';
    }
}

document.addEventListener("DOMContentLoaded", ()=> {
    const form = document.getElementById("signupForm");

    form.addEventListener("submit" ,(event)=> {
        event.preventDefault();

         // Get values at submission time
         const username = document.getElementById("username").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();
        const cpassword = document.getElementById("confirmPassword").value;
        const terms = document.getElementById("terms").checked;
        const errorContainer = document.querySelector('.error-container');
        errorContainer.innerHTML = '';

        
        try {

            if(!username || !password || !email ||!cpassword){
            showError("All fields are required !");
            return false;
        }

        if (password !== cpassword) {
            showError("Passwords do not match!");
            return false;
        }
        if (!terms) {
            showError("Please accept the Terms & Conditions");
            return false;
        }

        const formData = {
            username,
            email,
            password
        }

        Swal.fire({
            title: 'Processing...',
            text: 'Please wait until otp is send',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        $.ajax({
            url:"/user/signup",
            type:"POST",
            data:JSON.stringify(formData),
            contentType:"application/json",
            dataType:"json",
            success:function (response){
                if(response.success) {
                    Swal.fire({
                        icon:'success',
                        title:"success!",
                        text:response.message || "Signup successful",
                        timer:1000,
                        showConfirmButton:false
                    }).then(()=>{
                        history.replaceState(null,"",response.redirectUrl);
                        window.location.replace(response.redirectUrl);
                    });
                }else {
                    Swal.fire({
                        icon:"error",
                        title:"Signup Failed",
                        text:response.message
                    });
                }
            },
            error:(xhr) =>{
                console.log("Error:",xhr);
                let errorMessage = "Something went wrong";

                if(xhr.responseJSON && xhr.responseJSON.message){
                    errorMessage = xhr.responseJSON.message;
                }
                Swal.fire({
                    icon: 'error',
                    title: 'Signup Failed',
                    text: errorMessage
                });
            }
        })
            
        } catch (error) {
            showError("An error occurred. Please try again.");
        }

    })
})

function showError(message) {
    const errorContainer = document.querySelector('.error-container');
    errorContainer.innerHTML = `
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
}