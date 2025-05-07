
document.addEventListener("DOMContentLoaded", function() {

    document.querySelectorAll('.address-card').forEach(card => {
        card.addEventListener('click', function(e) {
            if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
                document.querySelectorAll('.address-card').forEach(c => {
                    c.classList.remove('active');
                });
                this.classList.add('active');
                this.querySelector('input[type="radio"]').checked = true;
            }
        });
    });

    const paymentOptions = document.querySelectorAll(".payment-option");
    const walletBalance = Number(document.getElementById("walletBalance").value);
    const totalAmount = Number(document.getElementById("totalAmount").value);
    const walletInput = document.getElementById("wallet");
    const codInput = document.getElementById("cod");
    const onlineInput = document.getElementById("online");

    // wallet disable
    walletInput.disabled = walletBalance < totalAmount

    if(totalAmount < 1000 ){
        codInput.disabled = true;
        onlineInput.checked = true;
        toggleActiveClass(".cod",".online");
  
    }else {
        codInput.disabled = false;
        codInput.checked = true;
        toggleActiveClass(".online", ".cod");
    }

    // Payment option selection
    paymentOptions.forEach((option) => {
        option.addEventListener("click", () => {
            const radio = option.querySelector('input[type="radio"]');
            if (!radio.disabled) {
                paymentOptions.forEach((opt) => opt.classList.remove("active"));
                option.classList.add("active");
                radio.checked = true;
            }
        });
    });

    function toggleActiveClass(add, remove){
        document.querySelector(`.payment-options ${add}`).classList.remove("active");
        document.querySelector(`.payment-options ${remove}`).classList.add("active");
    }

    // Show More Addresses
    const showMoreBtn = document.getElementById('showMore');
    if (showMoreBtn) {
        showMoreBtn.addEventListener('click', function() {
            document.querySelector('.more-addresses').style.display = 'block';
            this.style.display = 'none';
        });
    }

    const addAddressForm = document.getElementById('addAddressForm');
    if (addAddressForm) {
        addAddressForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearErrors(addAddressForm);

            const formData = new FormData(addAddressForm);
            const jsonData = Object.fromEntries(formData);
            //trim all values 
            Object.keys(jsonData).forEach(key => {
                if (typeof jsonData[key] === 'string') {
                    jsonData[key] = jsonData[key].trim();
                }
            });
            jsonData.isDefault = jsonData.isDefault === 'on'; 

            try {
                const response = await fetch('/address/add', {
                    method: 'POST',
                    body: JSON.stringify(jsonData),
                    headers: { 'Content-Type': 'application/json' }
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
                        displayFormErrors(addAddressForm, data.errors);
                        Swal.fire('Error', data.message || 'Invalid form validations..!', 'error');
                    }
                } else {
                    Swal.fire('Success', 'Address added successfully', 'success')
                        .then(() => window.location.reload());
                }
            } catch (error) {
                console.error('Add address error:', error);
                Swal.fire('Error', 'Something went wrong: ' + error.message, 'error');
            }
        });
    }

    document.querySelectorAll('.editAddressForm').forEach(editForm => {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearErrors(editForm);

            const formData = new FormData(editForm);
            const addressId = editForm.dataset.addressId;
            const jsonData = Object.fromEntries(formData);

            Object.keys(jsonData).forEach(key => {
                if (typeof jsonData[key] === 'string') {
                    jsonData[key] = jsonData[key].trim();
                }
            });
            jsonData.isDefault = jsonData.isDefault === 'on'; 

            try {
                const response = await fetch(`/address/edit/${addressId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(jsonData)
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
                        displayFormErrors(addAddressForm, data.errors);
                        Swal.fire('Error', data.message || 'Invalid form validations..!', 'error');
                    }
                } else {
                    Swal.fire('Success', 'Address updated successfully', 'success')
                        .then(() => window.location.reload());
                }
            } catch (error) {
                console.error('Edit address error:', error);
                Swal.fire('Error', 'Something went wrong: ' + error.message, 'error');
            }
        });
    });

    function displayFormErrors(form, errors) {
        clearErrors(form);
        if (errors && typeof errors === 'object') {
            Object.entries(errors).forEach(([field, message]) => {
                const input = form.querySelector(`[name="${field}"]`);
                if (input) {
                    input.classList.add('is-invalid');
                    const feedback = input.nextElementSibling;
                    if (feedback?.classList.contains('invalid-feedback')) {
                        feedback.textContent = message;
                    }
                }
            });
        }
    }

    function clearErrors(form) {
        form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        form.querySelectorAll('.invalid-feedback').forEach(el => el.textContent = '');
    }

    document.getElementById('placeOrder').addEventListener('click', async function(e) {
        e.preventDefault();
        const selectedAddress = document.querySelector('.address-card.active input[name="address"]:checked');
        const selectedPayment = document.querySelector('.payment-option.active input[name="paymentMethod"]:checked');

        if (!selectedAddress) {
            Swal.fire('Error', 'Please select a shipping address', 'error');
            return;
        }
        if (!selectedPayment) {
            Swal.fire('Error', 'Please select a payment method', 'error');
            return;
        }

        const orderData = {
            addressId: selectedAddress.value,
            paymentMethod: selectedPayment.value,
            totalAmount: totalAmount
        };

        try {
            if (orderData.paymentMethod === 'Online') {
                if (!totalAmount  || isNaN(totalAmount)  || totalAmount <= 0) {
                    Swal.fire('Error', 'Invalid order amount', 'error');
                    return;
                }

                let placeOrder = document.querySelector('.placeOrder');
                try {
                    // Processing status
                    placeOrder.disabled = true;
                    placeOrder.innerHTML = `
                        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        Processing...
                    `;

                    const response = await fetch('/order/create-razorpay-order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ amount: parseInt(totalAmount) })
                    });

                    const data = await response.json();

                    // Reset button state
                    placeOrder.disabled = false;
                    placeOrder.innerHTML = `Place Order`;

                    if (!data.success) {  
                        if(data.redirect){
                            Swal.fire({ 
                                icon: "warning", title:data.message || 'Session Data is Expired..!', 
                                showConfirmButton: "OK",timer:1500, timerProgressBar: true
                            })
                            .then(() => {      
                                window.location = data.redirect 
                            }) 
                            return;
                        } 

                        window.location.href = `/order-failure?totalAmount=${totalAmount}&addressId=${orderData.addressId}&error_description = Payment service is currently facing technical issues. Please try again later or use a different payment method.`;
                        return;
                    }

                    // Initialize Razorpay payment
                    const options = {
                        key: data.checkoutData?.razorpayKeyId || data.key_id,
                        amount: data.order.amount,
                        currency: "INR",
                        name: "Digitan Den",
                        description: "Order Payment",
                        order_id: data.order.id,
                        handler: async function (response) {
                            try {
                                orderData.razorpay_payment_id = response.razorpay_payment_id;
                                orderData.razorpay_order_id = response.razorpay_order_id;
                                orderData.razorpay_signature = response.razorpay_signature;

                                // Processing message
                                Swal.fire({
                                    title: 'Processing Payment',
                                    text: 'Please wait while we verify your payment...',
                                    allowOutsideClick: false,
                                    didOpen: () => {
                                        Swal.showLoading();
                                    }
                                });

                                // Verify payment
                                const placeOrderResponse = await fetch('/order/place', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(orderData)
                                });

                                const placeOrderResult = await placeOrderResponse.json();

                                if (placeOrderResult.success) {
                                    Swal.fire({
                                        icon: "success",
                                        title:"Success",
                                        text:placeOrderResult.message || 'Order placed succussfully..!',
                                        showConfirmButton: "OK",
                                        timer:1500,
                                        timerProgressBar: true
                                    })
                                    .then(() => {      
                                        window.location.href = '/order-success';
                                    }) 
                                } else {
                                    Swal.fire('Error', placeOrderResult.message || 'An error occurred', 'error');
                                }
                            } catch (error) {
                                console.error('Payment verification error:', error);
                                Swal.fire('Error', error.message || 'An error occurred', 'error');
                            }
                        },
                        prefill: {
                            name: data.user.name,
                            email: data.user.email,
                            contact: data.user.contact
                        },
                        theme: {
                            color: "#6366f1"
                        },
                        modal: {
                            ondismiss: function() {
                                // Redirect orderFailure page
                                window.location.href = `/order-failure?totalAmount=${totalAmount}&addressId=${orderData.addressId}&error_description=Payment was cancelled by the user`;
                            }
                        }
                    };

                    // Initialize Razorpay
                    const razorpayInstance = new Razorpay(options);
                    razorpayInstance.open();

                    // Handle Razorpay errors
                    razorpayInstance.on('payment.failed', function(response) {
                        // Redirect orderFailure 
                        window.location.href = `/order-failure?totalAmount=${totalAmount}&addressId=${orderData.addressId}&error_description=${encodeURIComponent(response.error.description || 'Payment failed')}`;
                    });

                } catch (error) {
                    console.error('Error:', error.message);
                    placeOrder.disabled = false;
                    placeOrder.innerHTML = `<i class="bi bi-lightning-charge-fill"></i> Place Order`;
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: error.message
                    });
                }
            } else {
                const response = await fetch('/order/place', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orderData)
                });
                const result = await response.json();
                if (result.success) {
                    Swal.fire('Success', result.message, 'success');
                    window.location.href = '/order-success';
                } else  if (data.redirect) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Authentication Required',
                        text: 'Please sign in to place order..',
                        timer: 1500,
                        showConfirmButton: false
                    }).then(() => {
                        window.location.href = data.redirect;
                    });
                }else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: data.message || 'Failed to remove to place order.',
                        timer: 1500,
                        showConfirmButton: "OK"
                    })
                }
            }
        } catch (error) {
            console.error('Error placing order:', error);
            Swal.fire('Error', 'An error occurred while placing the order', 'error');
        }
    });    
});