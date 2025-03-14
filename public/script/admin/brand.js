document.addEventListener('DOMContentLoaded', function () {

    function validateBrand(name, brandOffer) {
        let errors = {};

        if (!name) {
            errors.name = 'Name is required';
        } else if (name.length < 2 || name.length > 50) {
            errors.name = 'Name must be 2-50 characters.';
        } else if (!/[a-zA-Z0-9]/.test(name)) {
            errors.name = 'Brand name must contain at least one letter or number';
        }else if (!/^[a-zA-Z0-9\s\-_.,;:!?&()'"+%]*$/.test(name)) {
            errors.name = 'Brand name contains invalid characters';
        }else if (/^\s+$/.test(name) || /\s{3,}/.test(name)) {
            errors.name = 'Brand name cannot be only spaces or have excessive spacing';
        }

        if (!brandOffer) {
            errors.brandOffer = 'Brand offer is required';
        } else if (isNaN(brandOffer) || brandOffer < 0 || brandOffer > 100) {
            errors.brandOffer = 'Brand offer must be a number between 0 and 100.';
        }

        return errors;
    }

    // Edit Brand
    const editForm = document.getElementById('editBrandForm');
    let editFormId;
    document.querySelector("#editBrandModal").addEventListener("show.bs.modal", (e) => {
        const button = e.relatedTarget;
        editFormId = button.getAttribute("data-id");
        editForm.querySelector('[name="name"]').value = button.getAttribute("data-name");
        editForm.querySelector('[name="brandOffer"]').value = button.getAttribute("data-offer");
    });

    editForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const name = editForm.querySelector('[name="name"]').value.trim();
        const brandOffer = editForm.querySelector('[name="brandOffer"]').value.trim();

        const brandOfferError = document.querySelector(".brandOfferError");
        const nameError = document.querySelector(".nameError");

        //validate
        const errors = validateBrand(name, brandOffer);

        nameError.textContent = '';
        brandOfferError.textContent = '';

        if (errors.name) {
            nameError.textContent = errors.name;
            nameError.style.display = 'block';
        }
        if (errors.brandOffer) {
            brandOfferError.textContent = errors.brandOffer;
            brandOfferError.style.display = 'block';
        }

        if (Object.keys(errors).length === 0) {
            try {
                const response = await fetch(`/admin/brands/edit/${editFormId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name,
                        brandOffer
                    })
                });

                const data = await response.json();

                if (data.success) {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('addBrandModal'));
                    if (modal) modal.hide();

                    Swal.fire({
                        icon: 'success',
                        title: data.message || 'Brand Updated',
                        text: data.message,
                        confirmButtonColor: '#3085d6'
                    }).then(() => {
                        window.location.reload();
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: data.message,
                        confirmButtonColor: '#3085d6'
                    });
                }
            } catch (error) {
                console.error('Update brand error:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.message || 'Failed to update brand',
                    confirmButtonColor: '#3085d6'
                });
            }
        }
    });

    document.getElementById('addBrandForm').addEventListener('submit', async function (event) {
        event.preventDefault();

        const name = document.getElementById('name').value.trim();
        const brandOffer = document.getElementById('brandOffer').value.trim();

        const brandOfferError = document.getElementById("brandOfferError");
        const nameError = document.getElementById("nameError");

        // Validate
        const errors = validateBrand(name, brandOffer);

         // Clear previous errors
        nameError.textContent = '';
        brandOfferError.textContent = '';

        if (errors.name) {
            nameError.textContent = errors.name;
            nameError.style.display = 'block';
        }
        if (errors.brandOffer) {
            brandOfferError.textContent = errors.brandOffer;
            brandOfferError.style.display = 'block';
        }

        if (Object.keys(errors).length === 0) {
            const formData = {
                name,
                brandOffer
            };

            fetch('/admin/brands/add', {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            }).then(response => {
                return response.json();
            }).then(data => {
                if (data.success) {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('addBrandModal'));
                    if (modal) modal.hide();

                    Swal.fire({
                        icon: 'success',
                        title: data.message || 'Brand Added',
                        text: data.message,
                        confirmButtonColor: '#3085d6'
                    }).then(() => {
                        window.location.reload();
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: data.message,
                        confirmButtonColor: '#3085d6'
                    });
                }
            }).catch(error => {
                console.error('Add brand error:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.message || 'Failed to Add brand',
                    confirmButtonColor: '#3085d6'
                });
            });
        }
    });

    const statusModal = document.getElementById('statusModal');
    const filterForm = document.getElementById("brandFilterForm");
    let currentBrandId = '';

     // Unified form submission
    filterForm.addEventListener('change', function (e) {
        if (e.target.matches('#statusFilter')) {
            filterForm.submit();
        }
    });

    statusModal.addEventListener("show.bs.modal", (event) => {
        const button = event.relatedTarget;
        currentBrandId = button.getAttribute("data-id");
        const currentStatus = button.getAttribute('data-status');
        const brandName = button.getAttribute('data-name');
        const newStatus = currentStatus === 'Listed' ? 'Unlisted' : 'Listed';

        document.getElementById('statusMessage').textContent =
            `Are you sure you want to change "${brandName}" from ${currentStatus} to ${newStatus}?`;
        document.getElementById('confirmStatus').className = `btn ${newStatus === 'Listed' ? 'btn-success' : 'btn-danger'}`;
    });

    document.getElementById("confirmStatus").addEventListener("click", async () => {
        try {
            const response = await fetch(`/admin/brands/toggle/${currentBrandId}`, {
                method: 'PATCH',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                const button = document.querySelector(`.status-btn[data-id="${currentBrandId}"]`);
                const statusText = button.querySelector('.status-text');

                statusText.textContent = data.isListed ? 'Listed' : 'Unlisted';
                button.classList.remove('bg-success', 'bg-danger');
                button.classList.add(data.isListed ? 'bg-success' : 'bg-danger');

                bootstrap.Modal.getInstance(statusModal).hide();

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

    // Delete Brand
    let currentId;
    document.querySelector('#deleteModal').addEventListener('show.bs.modal', (e) => {
        const button = e.relatedTarget;
        currentId = button.getAttribute("data-id");
        const brandName = button.getAttribute('data-name');
        document.getElementById('deleteMessage').textContent =
            `Are you sure you want to delete "${brandName}"?`;
    });

    document.getElementById("confirmDelete").addEventListener("click", async () => {
        try {
            const response = await fetch(`/admin/brands/delete/${currentId}`, {
                method: 'PATCH',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                
                document.querySelector(`.delete-btn[data-id="${currentId}"]`).closest('tr').remove();
                bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();

                const tableBody = document.querySelector('.user-table tbody');
                const currentPage = parseInt(document.querySelector('.page-item.active .page-link').textContent);

                Swal.fire({
                    icon: 'success',
                    title: 'Brand Deleted',
                    text: data.message,
                    confirmButtonColor: '#3085d6',
                    timer: 2000,
                    timerProgressBar: true,
                    didClose: () => {
                        if (tableBody.querySelectorAll('tr').length === 0 && currentPage > 1) {
                            window.location.href = `/admin/brands?page=${currentPage - 1}`;
                        } else {
                            window.location.reload();
                        }
                    }
                });
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Delete brand error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Failed to delete brand',
                confirmButtonColor: '#3085d6'
            });
        }
    });
});