document.addEventListener('DOMContentLoaded', function () {
    const statusModal = document.getElementById('statusModal');
    const filterForm = document.getElementById('userFilterForm');
    let currentUserId = '';

    // Unified form submission
    filterForm.addEventListener('change', function (e) {
        if (e.target.matches('#statusFilter')) {
            filterForm.submit();
        }
    });

    // Show modal and set content
    statusModal.addEventListener('show.bs.modal', function (event) {
        const button = event.relatedTarget;
        currentUserId = button.getAttribute('data-userid');
        const currentStatus = button.getAttribute('data-status');
        const username = button.getAttribute('data-username');
        const newStatus = currentStatus === 'Active' ? 'Blocked' : 'Active';

        document.getElementById('statusText').innerHTML = `
            Are you sure you want to change <strong>${username}</strong>'s status from <strong>${currentStatus}</strong> to <strong>${newStatus}</strong>?`;
        document.getElementById('statusIcon').innerHTML = newStatus === 'Blocked'
            ? '<i class="fas fa-ban text-danger fa-4x mb-3"></i>'
            : '<i class="fas fa-check-circle text-success fa-4x mb-3"></i>';
        document.getElementById('confirmStatusChange').className = `btn ${newStatus === 'Blocked' ? 'btn-danger' : 'btn-success'}`;
        document.getElementById('actionWarningText').textContent = newStatus === 'Blocked'
            ? 'This will block the user and send an email notification.'
            : 'This will unblock the user and restore access.';
    });

    // Handle status change
    document.getElementById('confirmStatusChange').addEventListener('click', function () {
        const modal = bootstrap.Modal.getInstance(statusModal);
        modal.hide();

        const button = document.querySelector(`.status-btn[data-userid="${currentUserId}"]`);
        const statusText = button.querySelector('.status-text');
        const spinner = button.querySelector('.spinner-border');
        statusText.classList.add('d-none');
        spinner.classList.remove('d-none');
        button.disabled = true;

        fetch(`/admin/users/toggle/${currentUserId}`, {
            method: 'PATCH',
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(response.status === 404 ? 'User not found' : 'Server error');
            }
            return response.json();
        })
        .then(data => {
            Swal.fire({
                icon: data.success ? 'success' : 'error',
                title: data.success ? 'Success' : 'Error',
                html: data.message,
                confirmButtonColor: '#3085d6',
            }).then(() => {
                if (data.success) {
                    statusText.textContent = data.isBlocked ? 'Blocked' : 'Active';
                    button.className = `btn btn-sm status-btn ${data.isBlocked ? 'bg-danger' : 'bg-success'} text-white`;
                }
            });
        })
        .catch(error => {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'An unexpected error occurred',
                confirmButtonColor: '#3085d6',
            });
        })
        .finally(() => {
            statusText.classList.remove('d-none');
            spinner.classList.add('d-none');
            button.disabled = false;
        });
    });
});