document.addEventListener("DOMContentLoaded", function() {
    const maxProduct = 10;  
    // Quantity increase
    document.querySelectorAll(".btn-quantity.increase").forEach(button => {
        button.addEventListener("click",async  function() {
            const cartItem  = this.closest(".cart-item");
            const productId = cartItem.dataset.productId;
            const input =  this.parentNode.querySelector(".quantity-input");
            const currentValue = parseInt(input.value);
                await updateCartQuantity(productId,1,cartItem);
        });   
    });

    // Quantity degreese
    document.querySelectorAll('.btn-quantity.decrease').forEach(button => {
        button.addEventListener('click', async function() {
            const cartItem  = this.closest(".cart-item");
            const productId = cartItem.dataset.productId;
            const input =  this.parentNode.querySelector(".quantity-input");
            const currentValue = parseInt(input.value);
            if (currentValue > 1) {
                await updateCartQuantity(productId, -1,cartItem);
            }

        })
    })

    async function updateCartQuantity(productId ,quantity ,cartItem){
        try {
            console.log("Quantity:",quantity)
                cartItem.classList.add('updating');
                const response  = await fetch("/cart/update",{
                    method:"POST",
                    headers:{
                        'Content-Type': 'application/json'
                    },
                    body:JSON.stringify({productId,quantity})
                });

                const data = await response.json();

                if(data.success ){
                        cartItem.classList.remove('updating');
                        location.reload()                  
                }else {
                    cartItem.classList.remove('updating');
                    Swal.fire({ 
                        icon: "error", title:"Error", text:data.message || 'Invalid form validations..!', 
                        showConfirmButton: "OK",timer:1500, timerProgressBar: true
                    })
                    .then(() => {      
                        if(data.redirect){
                            window.location = data.redirect
                        }  
                    }) 
                }
        } catch (error) {
            console.error('Error:', error);
        }
    }
    // Remove item
    document.querySelectorAll('.btn-delete').forEach(button => {
        button.addEventListener('click', async function() {
            const productId = this.closest('.cart-item').dataset.productId;
            await removeFromCart(productId); 
        });   
    });

    // Save for later
    document.querySelectorAll('.btn-save').forEach(button => {
        button.addEventListener('click', async function() {
            const productId = this.dataset.productId;
            await saveForLater(productId);
        });
    });

    document.getElementById('checkoutBtn').addEventListener('click', async function(e) {
        e.preventDefault();

        // Client-side check
        const hasInvalidItems = Array.from(document.querySelectorAll('.cart-item')).some(item => {
            const status = item.querySelector('.status-badge').textContent.trim();
            return status === 'Out of stock' || status === 'Discontinued';
        });

        if (hasInvalidItems) {
            Swal.fire('Error', 'Please remove out-of-stock or discontinued items before proceeding to checkout.', 'error');
            return;
        }

        // Server-side validation
        try {
            const response = await fetch('/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });

            const result = await response.json();

            if (!result.success) {
                Swal.fire({ 
                    icon: "error", title:"Error", text:data.message || 'Please remove out-of-stock or discontinued items before proceeding to checkout.', 
                    showConfirmButton: "OK",timer:1500, timerProgressBar: true
                })
                .then(() => {      
                    if(data.redirect){
                        window.location = data.redirect
                    }  
                }) 
                return;
            }else {
                window.location.replace(result.redirectUrl);
            }

            
        } catch (error) {
            console.error('Error validating cart:', error);
            Swal.fire('Error', 'Failed to validate cart. Please try again.', 'error');
        }
    });


    async function removeFromCart(productId) {
        try {
            const response  = await fetch("/cart/remove",{
                method:"POST",
                headers:{
                    'Content-Type': 'application/json'
                },
                body:JSON.stringify({productId})
            });

            const data = await response.json();
            if(data.success ){
                    location.reload()
            }else {
                Swal.fire({ 
                    icon: "error", title:"Error", text:data.message || 'An error found..', 
                    showConfirmButton: "OK",timer:1500, timerProgressBar: true
                })
                .then(() => {      
                    if(data.redirect){
                        window.location = data.redirect
                    }  
                }) 
            }
        } catch (error) {
            console.error('Error removing item:', error);
            Swal.fire('Error', data.message || ' Failed to remove item', 'error');
        }
    }

    async function saveForLater(productId) {
        try {
            const response = await fetch('/wishlist/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId }),
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                await removeFromCart(productId); 
            } else {
                Swal.fire({ 
                    icon: "error", title:"Error", text:data.message || 'Invalid form validations..!', 
                    showConfirmButton: "OK",timer:1500, timerProgressBar: true
                })
                .then(() => {      
                    if(data.redirect){
                        window.location = data.redirect
                    }  
                }) 

            }
        } catch (error) {
            console.error('Error saving for later:', error);
            Swal.fire('Error',"Failed to remove item", 'error');
        }
    }


    // Toggle coupon dropdown
    document.querySelector('.coupon-toggle').addEventListener('click', () => {
        const dropdown = document.querySelector('.coupon-dropdown');
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    });

    // Apply coupon from dropdown
    document.querySelectorAll('.apply-coupon').forEach(button => {
        button.addEventListener('click', async () => {
            const couponCode = button.dataset.code;
            await applyCoupon(couponCode);
        });
    });


    document.getElementById('applyPromo').addEventListener('click', async () => {
        const couponCode = document.getElementById('promoCode').value;
        await applyCoupon(couponCode);
    });

    async function applyCoupon(couponCode) {
        try {
            const response = await fetch('/cart/apply-coupon', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ couponCode })
            });
            const data = await response.json();
            if (data.success) {
                Swal.fire('Success', data.message, 'success').then(() => location.reload());
            } else {
                Swal.fire({ 
                    icon: "error", title:"Error", text:data.message || 'Invalid form validations..!', 
                    showConfirmButton: "OK",timer:1500, timerProgressBar: true
                })
                .then(() => {      
                    if(data.redirect) window.location = data.redirect
                    
                }) 
            }
        } catch (error) {
            console.error('Error applying coupon:', error);
            Swal.fire('Error', 'Failed to apply coupon', 'error');
        }
    }
});


