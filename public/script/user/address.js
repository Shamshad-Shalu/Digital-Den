document.addEventListener('DOMContentLoaded', () => {
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
                    displayFormErrors(addAddressForm, data.errors);
                    Swal.fire({
                        icon: "error",
                        title:"Error",
                        text:data.message || 'Invalid form validations..!',
                        showConfirmButton: "OK",
                        timer:1500,
                        timerProgressBar: true
                    })
                    .then(() => {
                        if(data.redirect){
                            window.location = data.redirect
                        }  
                    })

                } else {
                    showSwal('success', 'Success', 'Address added successfully', 1500)
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
            //trim all values 
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
                    displayFormErrors(editForm, data.errors);
                    Swal.fire({
                        icon: "error",    
                        title:"Error",
                        text:data.message || 'Invalid form validations..!',
                        showConfirmButton: "OK",
                        timer:1500,
                        timerProgressBar: true
                    })
                    .then(() => {      
                        if(data.redirect){
                            window.location = data.redirect
                        }  
                    }) 
                } else {
                    showSwal('success', 'Success', 'Address updated successfully', 1500)
                        .then(() => window.location.reload());
                }
            } catch (error) {
                console.error('Edit address error:', error);
                Swal.fire('Error', 'Something went wrong: ' + error.message, 'error');
            }
        });
    });

    //delete address 
    document.querySelectorAll(".delete-confirm").forEach(button => {
        button.addEventListener("click",async ()=> {
            const addressId = button.dataset.addressId;

            try {
                const response = await fetch(`/address/delete/${addressId}`,{
                    method:"DELETE",
                    headers:{
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();
                if (!response.ok || !data.success) {
                    Swal.fire({
                        icon: "error",
                        title:"Error",
                        text:data.message || 'Failed to delete address',
                        showConfirmButton: "OK",
                        timer:1500,
                        timerProgressBar: true
                    }) 
                    .then(() => {
                        if(data.redirect){
                            window.location = data.redirect
                        }  
                    })
                } else {
                    showSwal('success','Address deleted successfully', "success" , 1500)
                        .then(() => window.location.reload());
                }     
            } catch (error) {
                console.error('Delete address error:', error);
                Swal.fire('Error', 'Something went wrong: ' + error.message, 'error');
            }
        } )
    })

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
});