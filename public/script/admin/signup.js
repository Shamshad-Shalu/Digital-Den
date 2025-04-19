function togglePassword(id) {
    const input = document.getElementById(id);
    const btn = input.nextElementSibling.nextElementSibling;
    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
    } else {
        input.type = 'password';
        btn.textContent = '👁️';
    }
}

document.addEventListener("DOMContentLoaded", ()=> {
    const form = document.getElementById("loginForm");
    
    form.addEventListener("submit" ,(event)=> {
        event.preventDefault();

        // Get values at submission time
        const email = document.getElementById("login-email").value.trim();
        const password = document.getElementById("login-password").value;

        // Basic validation
        if (!email && !password) {
            Swal.fire({
                icon: 'error',
                title: 'Login Failed',
                text: 'Required all the fields'
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
            url:"/admin/login",
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
                let errorMessage = "Something went wrong in ajax login";

                if(xhr.responseJSON && xhr.responseJSON.message){
                    errorMessage = xhr.responseJSON.message;
                }
                Swal.fire({
                    icon: 'error',
                    title: 'Login Failed',
                    text: errorMessage
                });
            }
        });
        
    })
})