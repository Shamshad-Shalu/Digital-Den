 // add or remove wishlist 
 async function toggleWishlist (productId , button,event) {
    event.preventDefault()
    event.stopPropagation()
    const icon = button.querySelector("i");
    const isInWishlist = icon.classList.contains("fas");

    try {
        if(isInWishlist) {
            //remove from wishlist 
            const response = await fetch("/user/wishlist/remove",{
                method:"POST",
                headers:{
                'Content-Type': 'application/json', 
                },
                body:JSON.stringify({productId})
            });

            const data = await response.json();

            if(data.success) {
                icon.classList.remove("fas","text-danger");
                icon.classList.add("far");
                button.classList.remove("always-visible");
                button.style.opacity = '0';
                setTimeout(() => {
                    button.style.opacity = '';
                }, 0);
                Swal.fire({
                    icon: 'success',
                    title: 'Removed',
                    text: 'Product removed from wishlist!',
                    timer: 1200,
                    showConfirmButton: false
                });
            }else if (data.redirect) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Authentication Required',
                    text: 'Please sign in to manage your wishlist.',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    window.location.href = data.redirect;
                });
            }else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.message || 'Failed to remove from wishlist',
                    timer: 1500,
                    showConfirmButton: "OK"
                })
            }
        }else {
           // add to wishlist 
           const response = await fetch("/user/wishlist/add",{
                method:"POST",
                headers:{
                'Content-Type': 'application/json', 
                },
                body:JSON.stringify({productId})
            });

            const data = await response.json();
            if(data.success) {
                icon.classList.remove("far");
                icon.classList.add("fas", "text-danger");
                button.classList.add("always-visible");
                button.style.opacity = '1';
                setTimeout(() => {
                    button.style.opacity = '';
                }, 0);
                Swal.fire({
                    icon: 'success',
                    title: 'Added',
                    text: 'Product added to wishlist!',
                    timer: 1200,
                    showConfirmButton: false
                });
            }else if (data.redirect) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Authentication Required',
                    text: 'Please sign in to manage your wishlist.',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    window.location.href = data.redirect;
                });
            }else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.message || 'Failed to add to wishlist',
                    timer: 1500,
                    showConfirmButton: "OK"
                })
            } 
        }  
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An error occurred. Please try again.',
            timer: 1500,
            showConfirmButton: false
        });  
    }    
}
