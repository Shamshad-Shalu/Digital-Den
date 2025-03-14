document.addEventListener('DOMContentLoaded', function () {

    // Edit Category
    const editForm = document.getElementById('editCategoryForm');
    let editFormId; 
    document.querySelector("#editCategoryModal").addEventListener("show.bs.modal", (e) => {
       const button = e.relatedTarget;
       editFormId = button.getAttribute("data-id"); 
       editForm.querySelector('[name = "name"]').value = button.getAttribute("data-name"); 
       editForm.querySelector('[name = "description"]').value = button.getAttribute("data-description"); 
       editForm.querySelector('[name = "categoryOffer"]').value = button.getAttribute("data-offer"); 
    });

    editForm.addEventListener("submit" , async function (event) {
       event.preventDefault();

       const name = editForm.querySelector('[name="name"]').value.trim();
       const description = editForm.querySelector('[name="description"]').value.trim();
       const categoryOffer = editForm.querySelector('[name="categoryOffer"]').value.trim();

       const descriptionError = document.querySelector(" .descriptionError");
       const categoryOfferError = document.querySelector(".categoryOfferError");
       const nameError = document.querySelector(".nameError");

        // Validate
        const errors = validateCategory(name, description, categoryOffer);

       // clear previous error
       document.querySelectorAll('.invalid-feedback').forEach(ele => {
           ele.textContent = '';
           ele.style.display = 'none';
        });

       if (errors.name) {
           nameError.textContent = errors.name;
           nameError.style.display = 'block';
       }
       if (errors.description) {
           descriptionError.textContent = errors.description;
           descriptionError.style.display = 'block';
       }

       if (errors.categoryOffer) {
           categoryOfferError.textContent = errors.categoryOffer;
           categoryOfferError.style.display = 'block';
       }
       
       if (Object.keys(errors).length === 0) {

           try {
               const response = await fetch(`/admin/categories/edit/${editFormId}`, {
                   method: 'PATCH',
                   headers: { 'Content-Type': 'application/json' },
                   body:JSON.stringify({
                       name,
                       description,
                       categoryOffer
                   })
               });

               const data = await response.json();

               if(data.success) {
                   // Close modal
                   const modal = bootstrap.Modal.getInstance(document.getElementById('addCategoryModal'));
                   if (modal) modal.hide();

                   Swal.fire({
                       icon: 'success',
                       title: data.message || 'Category Added',
                       text: data.message,
                       confirmButtonColor: '#3085d6'
                   }).then(() => {    
                       window.location.reload();
               
                   });

               }else {
                   console.log("An error found while updating category");
                   Swal.fire({
                       icon: 'error',
                       title: 'Error',
                       text: data.message,
                       confirmButtonColor: '#3085d6'
                   });
               }

           } catch (error) {
               console.error('Add categoryerror:', error);
               Swal.fire({
                   icon: 'error',
                   title: 'Error',
                   text: error.message || 'Failed to Add category',
                   confirmButtonColor: '#3085d6'
               });
           }
       }
   })
   

    document.getElementById('addCategoryForm').addEventListener('submit',async function(event) {
      event.preventDefault();

       const name = document.getElementById('name').value.trim();
       const description = document.getElementById('description').value.trim();
       const categoryOffer = document.getElementById('categoryOffer').value.trim();

       const descriptionError = document.getElementById("descriptionError");
       const categoryOfferError = document.getElementById("categoryOfferError");
       const nameError = document.getElementById("nameError");


       // Validate
       const errors = validateCategory(name, description, categoryOffer);

       // Clear previous errors
       nameError.textContent = '';
       descriptionError.textContent = '';
       categoryOfferError.textContent = '';

       // Display new errors
       if (errors.name) {
           nameError.textContent = errors.name;
           nameError.style.display = 'block';
       }
       if (errors.description) {
           descriptionError.textContent = errors.description;
           descriptionError.style.display = 'block';
       }

       if (errors.categoryOffer) {
           categoryOfferError.textContent = errors.categoryOffer;
           categoryOfferError.style.display = 'block';
       }

       if (Object.keys(errors).length === 0) {
   
           console.log('Form is valid, submitting...');
           const formData = {
               name,
               description,
               categoryOffer
           }

           fetch('/admin/categories/add', {
               method :"POST" ,
               headers:{
                   'Content-Type': 'application/json'
               },
               body :JSON.stringify(formData)
           }).then(response => {
               return response.json()
           }).then(data => {
               if(data.success){
                   // Close modal
                   const modal = bootstrap.Modal.getInstance(document.getElementById('addCategoryModal'));
                   if (modal) modal.hide();

                   Swal.fire({
                       icon: 'success',
                       title: data.message || 'Category Added',
                       text: data.message,
                       confirmButtonColor: '#3085d6'
                   }).then(() => {

                   window.location.reload();
               
                   });
               }else {
                   // Optional: Sweet Alert for success
                   Swal.fire({
                       icon: 'error',
                       title: 'Error',
                       text: data.message,
                       confirmButtonColor: '#3085d6'
                   });

               }
           }).catch(error => {
               console.error('Add categoryerror:', error);
               Swal.fire({
                   icon: 'error',
                   title: 'Error',
                   text: error.message || 'Failed to Add category',
                   confirmButtonColor: '#3085d6'
               });
           })
       
       }

})

const statusModal = document.getElementById('statusModal');
const filterForm = document.getElementById("categoryFilterForm");
let currentCategoryId = '';

   // Unified form submission
   filterForm.addEventListener('change', function (e) {
           if (e.target.matches('#statusFilter')) {
               filterForm.submit();
           }
   });

   statusModal.addEventListener("show.bs.modal", (event) => {
       const button = event.relatedTarget;
       currentCategoryId = button.getAttribute("data-id");
       const currentStatus = button.getAttribute('data-status');
       const categoryName = button.getAttribute('data-name');
       const newStatus = currentStatus === 'Listed' ? 'Unlisted' : 'Listed';

       document.getElementById('statusMessage').textContent = 
           `Are you sure you want to change "${categoryName}" from ${currentStatus} to ${newStatus}?`;
       document.getElementById('confirmStatus').className = `btn ${newStatus === 'Listed' ? 'btn-success' : 'btn-danger'}`;
   });

   document.getElementById("confirmStatus").addEventListener("click", async () => {
       try {
           const response = await fetch(`/admin/categories/toggle/${currentCategoryId}`, { 
               method: 'PATCH',
               headers: {
                   'X-Requested-With': 'XMLHttpRequest',
                   'Content-Type': 'application/json'
               }
           });
           
           const data = await response.json();
           
           if (data.success) {
               // Update UI
               const button = document.querySelector(`.status-btn[data-id="${currentCategoryId}"]`);
               const statusText = button.querySelector('.status-text');
               
               statusText.textContent = data.isListed ? 'Listed' : 'Unlisted';
               button.classList.remove('bg-success', 'bg-danger');
               button.classList.add(data.isListed ? 'bg-success' : 'bg-danger');
               
               // Close modal
               bootstrap.Modal.getInstance(statusModal).hide();
               
               // Optional: Sweet Alert for success
               Swal.fire({
                   icon: 'success',
                   title: 'Status Updated',
                   text: data.message,
                   confirmButtonColor: '#3085d6'
               });


           } else {
               throw new Error(data.message);
           }
       } catch (error) {
           console.error('Toggle status error:', error);
           Swal.fire({
               icon: 'error',
               title: 'Error',
               text: error.message || 'Failed to update status',
               confirmButtonColor: '#3085d6'
           });
       }
   });

   // Delete Category
   let currentId ;
   document.querySelector('#deleteModal').addEventListener('show.bs.modal', (e) => {
       const button = e.relatedTarget;
       currentId = button.getAttribute("data-id");
       const categoryName = button.getAttribute('data-name');
       document.getElementById('deleteMessage').textContent = 
           `Are you sure you want to delete "${categoryName}"?`;
   });
   
   document.getElementById("confirmDelete").addEventListener("click", async () => {
       try {
           const response =  await fetch(`/admin/categories/delete/${currentId}`, { 
               method: 'PATCH',
               headers: {
                   'X-Requested-With': 'XMLHttpRequest',
                   'Content-Type': 'application/json'
               }
           });
           
           const data = await response.json();
           
           if (data.success) {
               document.querySelector(`.delete-btn[data-id="${currentId}"]`).closest('tr').remove();
               // Close the delete modal
               bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();

               // Check if the table is now empty
               const tableBody = document.querySelector('.user-table tbody');
               const currentPage = parseInt(document.querySelector('.page-item.active .page-link').textContent);

                   Swal.fire({
                       icon: 'success',
                       title: 'Category Deleted',
                       text: data.message,
                       confirmButtonColor: '#3085d6',
                       timer: 2000,
                       timerProgressBar: true,
                       didClose: () => {
                           // If table is empty and not on first page, go to previous page
                           if (tableBody.querySelectorAll('tr').length === 0 && currentPage > 1) {
                               window.location.href = `/admin/categories?page=${currentPage - 1}`;
                           } else {
                               window.location.reload();
                           }
                       }
                   });
           } else {
               throw new Error(data.message);
           }
       } catch (error) {
           console.error('delete category error:', error);
           Swal.fire({
               icon: 'error',
               title: 'Error',
               text: error.message || 'Failed to delete category',
               confirmButtonColor: '#3085d6'
           });
       }
   });
});

function validateCategory(name, description, categoryOffer) {
           let errors = {};

           if(!name ){
               errors.name = 'Name is required' 
           }else if(name.length < 3 || name.length > 20 ){
               errors.name = 'Name must be 3-20 characters.'
           }else if (!/^(?=.*[a-zA-Z])[a-zA-Z0-9 ]+$/.test(name) ){
               errors.name =  'Please enter a valid category name'
           }

           if (!description) {
               errors.description = 'Description is required';
           } else if (description.length < 10 || description.length > 150) {
               errors.description = 'Description must be 10-150 characters';
           } else if (!/[a-zA-Z0-9]/.test(description)) {
               errors.description = 'Description must contain at least one letter or number';
           } else if (!/^[a-zA-Z0-9\s\.,!?;:]*$/.test(description)) {
               errors.description = 'Description contains invalid characters';
           } else if (/^\s+$/.test(description) || /\s{3,}/.test(description)) {
               errors.description = 'Description cannot have excessive spacing';
           }

           if (!categoryOffer) {
               errors.categoryOffer = 'Category offer is required';
           } else if (isNaN(categoryOffer) || categoryOffer < 0 || categoryOffer > 100) {
               errors.categoryOffer = 'Category offer must be a number between 0 and 100.';
           }

       return errors;
  }