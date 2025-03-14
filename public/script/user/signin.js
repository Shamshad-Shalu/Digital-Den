function togglePassword() {
    const passwordInput = document.getElementById('password');
    const eyeIcon = document.getElementById('eyeIcon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.className = 'fa-regular fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        eyeIcon.className = 'fa-regular fa-eye';
    }
}

document.addEventListener("DOMContentLoaded", ()=> {
    const form = document.getElementById("login-form");

    form.addEventListener("submit" ,(event)=> {
        event.preventDefault();

         // Get values at submission time
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        // Basic validation
        if (!email) {
            Swal.fire({
                icon: 'error',
                title: 'Login Failed',
                text: 'Email is required'
            });
            return;
        }
         //Email validation pattern
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            Swal.fire({
                icon: 'error',
                title: 'Login Failed',
                text: 'Please enter a valid email address'
            });
            return;
        }

        const formData = {
            email,
            password
        }

        $.ajax({
            url:"/user/signin",
            type:"POST",
            data:JSON.stringify(formData),
            contentType:"application/json",
            dataType:"json",
            success:function (response){
                if(response.success) {
                    Swal.fire({
                        icon:'success',
                        title:"success!",
                        text:response.message || "Login successful",
                        timer:1000,
                        showConfirmButton:false
                    }).then(()=>{
                        history.replaceState(null,"",response.redirectUrl);
                        window.location.replace(response.redirectUrl);
                    });
                }else {
                    Swal.fire({
                        icon:"error",
                        title:"Login Failed",
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
                    title: 'Login Failed',
                    text: errorMessage
                });
            }
        })

        
    })
})