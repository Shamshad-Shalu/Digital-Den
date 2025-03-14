document.addEventListener('DOMContentLoaded', function () {

    document.getElementById("resetForm")
      .addEventListener("submit" , async (event) => {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();

        if(!email ) {
            return Swal.fire('Login failed', 'Email is required', 'error');
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(! emailPattern.test(email)) {
            return Swal.fire('Login failed', 'Please enter a valid email address', 'error');

        }

        try {
            Swal.fire({
                title: 'Processing...',
                text: 'Please wait until otp is send',
                allowOutsideClick: false,
                didOpen: () => {
                   Swal.showLoading();
                }
            });

            const response = await fetch("/user/forgot-password",{
                method:"POST",
                headers: { 'Content-Type': 'application/json' },
                body:JSON.stringify({email:email})
            })

            const data = await response.json();

            if(data.success) {
                Swal.fire({
                        icon:'success',
                        title:"success!",
                        text:data.message || "Otp sent",
                        timer:500,
                        showConfirmButton:false
                    }).then(()=>{
                        history.replaceState(null,"",data.redirectUrl);
                        window.location.replace(data.redirectUrl);
                });

            }else {
                Swal.fire({
                        icon:"error",
                        title:"Signup Failed",
                        text:data.message
                });
            }
            
        } catch (error) {

            console.log("Error on forgot page:",error);
            Swal.fire('Login failed', 'Something went wrong....', 'error');
            
        }

    })
})