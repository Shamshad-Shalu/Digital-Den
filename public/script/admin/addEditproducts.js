
document.addEventListener('DOMContentLoaded', function() {
    let cropper;
    let currentFileInput;
    let currentImageIndex;
    const cropModal = new bootstrap.Modal(document.getElementById('cropModal'));
    const isEditMode = !!document.getElementById("productId").value;

    // Form submission
    const productForm = document.getElementById('ProductForm');
    productForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        clearErrors();

        if (!validateForm()) return;

        const formData = new FormData(productForm);
        const url = isEditMode ? `/admin/products/edit/${formData.get('productId')}` : '/admin/products/add';
        const method = isEditMode ? 'PATCH' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });

            const result = await response.json();
            if ( !response.ok || !result.success) {
                console.log('Validation errors from server:', result.errors);
                displayErrors(result.errors || {});
                Swal.fire('Error', result.message || 'Please fix the input errors and try again', 'error');
            } else {
                Swal.fire('Success', isEditMode ? 'Product updated successfully!' : 'Product added successfully!', 'success')
                .then(() => {
                        if (!isEditMode) {
                            productForm.reset();
                            resetImageInputs();
                        }
                        window.location.href = '/admin/products';
                });
            }
        } catch (error) {
            console.error('Submission error:', error);
            Swal.fire('Error', 'Server error. Please try again.', 'error');
        }
    });

    // File input listeners
    document.getElementById('cardImageUpload').addEventListener('change', () => 
        handleFileChange('cardImageUpload', 'cardThumbnail', 'cardThumbnailContainer'));
    document.getElementById('productImagesUpload').addEventListener('change', handleMultipleFileChange);

    document.querySelectorAll('.crop-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            currentFileInput = this.getAttribute('data-target');
            const files = document.getElementById(currentFileInput).files;

            if (currentFileInput === 'productImagesUpload') {
                const selected = document.querySelector('.thumbnail-selected');
                if (!selected) {
                    Swal.fire('Warning', 'Please select an image to crop', 'warning');
                    return;
                }
                currentImageIndex = parseInt(selected.getAttribute('data-index'));
                const isExisting = selected.getAttribute('data-existing');
                let file;
                if (isExisting) {
                    // For existing images, fetch the image as a blob
                    fetch(selected.querySelector('img').src)
                        .then(res => res.blob())
                        .then(blob => {
                            file = new File([blob], `existing-${currentImageIndex}.jpg`, { type: 'image/jpeg' });
                            openCropModal(file);
                        });
                } else {
                    file = files[currentImageIndex];
                    if (!file) {
                        Swal.fire('Warning', 'No file selected for cropping', 'warning');
                        return;
                    }
                    openCropModal(file);
                }
            } else {
                currentImageIndex = 0;
                if (!files.length && !isEditMode) {
                    Swal.fire('Warning', 'Please select an image first', 'warning');
                    return;
                } else if (!files.length && isEditMode) {
                    // For cardImage in edit mode
                    fetch(document.getElementById('cardThumbnail').src)
                        .then(res => res.blob())
                        .then(blob => {
                            const file = new File([blob], 'existing-card.jpg', { type: 'image/jpeg' });
                            openCropModal(file);
                        });
                } else {
                    openCropModal(files[0]);
                }
            }
        });
    });

    // Crop functionality
    document.getElementById('cropButton').addEventListener('click', () => {
        if (!cropper) return;

        const canvas = cropper.getCroppedCanvas({ width: 500, height: 500 });
        canvas.toBlob(blob => {
            const croppedFile = new File([blob], `cropped_${Date.now()}.jpg`, { type: 'image/jpeg' });
            if (currentFileInput === 'cardImageUpload') {
                updateSingleFile(croppedFile);
            } else {
                updateMultipleFile(croppedFile);
            }
            cropModal.hide();
            cropper.destroy();
            cropper = null;
        }, 'image/jpeg', 0.9);
    });

    document.getElementById('rotateLeftBtn').addEventListener('click', () => cropper?.rotate(-90));
    document.getElementById('rotateRightBtn').addEventListener('click', () => cropper?.rotate(90));
    document.getElementById('zoomInBtn').addEventListener('click', () => cropper?.zoom(0.1));
    document.getElementById('zoomOutBtn').addEventListener('click', () => cropper?.zoom(-0.1));

    // Validation
    function validateForm() {
        let isValid = true;
        const fields = ['productName', 'description', 'category', 'brand', 'regularPrice', 'salePrice', 'quantity', 'status'];
        
        fields.forEach(id => {
            const input = document.getElementById(id);
            if (!input.value.trim()) {
                showError(id, `${input.labels[0].textContent} is required`);
                isValid = false;
            }
        });

        const cardImage = document.getElementById('cardImageUpload');
        const cardThumbnailContainer = document.getElementById('cardThumbnailContainer');
        if (!cardImage.files.length && (!isEditMode || cardThumbnailContainer.style.display === 'none')) {
            showError('cardImageUpload', 'Card image is required');
            isValid = false;
        }

        const productImages = document.getElementById('productImagesUpload');
        const thumbnails = document.querySelectorAll('#productThumbnails .thumbnail-wrapper');
        const existingImagesCount = Array.from(thumbnails).filter(t => t.getAttribute('data-existing')).length;
        const newImagesCount = productImages.files.length;
        const totalImages = existingImagesCount + newImagesCount;

        if ((!isEditMode && totalImages < 3) || (isEditMode && totalImages < 3 && newImagesCount === 0)) {
            showError('productImagesUpload', 'Minimum 3 product images required');
            isValid = false;
        } else if (totalImages > 4) {
            showError('productImagesUpload', 'Maximum 4 product images allowed');
            isValid = false;
        }

        if (!validateSpecifications()) {
           isValid = false;
        }
        return isValid;
    }

    // Add this function alongside your other validation functions
    function validateSpecifications() {
        let isValid = true;
        const specEntries = document.querySelectorAll('.specification-entry');
        const specificationsContainer = document.getElementById('specifications-container');
        
        // Check if there are at least 3 specifications
        if (specEntries.length < 3) {
            // Create or update a visible error message area
            let errorMessageArea = document.getElementById('specifications-error-area');
            if (!errorMessageArea) {
                errorMessageArea = document.createElement('div');
                errorMessageArea.id = 'specifications-error-area';
                errorMessageArea.className = 'alert alert-danger mt-2';
                errorMessageArea.style.display = 'none';
                
                // Insert it after the specifications container but before the add button
                const addSpecBtn = document.getElementById('add-spec-btn');
                addSpecBtn.parentNode.insertBefore(errorMessageArea, addSpecBtn);
            }
            errorMessageArea.textContent = 'Minimum 3 specifications required';
            errorMessageArea.style.display = 'block';
            
            // Also add invalid class to container for visual indication
            specificationsContainer.classList.add('border', 'border-danger', 'p-2', 'rounded');
            
            isValid = false;
        } else if (specEntries.length > 10) {
            // Same approach for maximum limit
            let errorMessageArea = document.getElementById('specifications-error-area');
            if (!errorMessageArea) {
                errorMessageArea = document.createElement('div');
                errorMessageArea.id = 'specifications-error-area';
                errorMessageArea.className = 'alert alert-danger mt-2';
                errorMessageArea.style.display = 'none';
                
                const addSpecBtn = document.getElementById('add-spec-btn');
                addSpecBtn.parentNode.insertBefore(errorMessageArea, addSpecBtn);
            }
            
            errorMessageArea.textContent = 'Maximum 10 specifications allowed';
            errorMessageArea.style.display = 'block';
            
            specificationsContainer.classList.add('border', 'border-danger', 'p-2', 'rounded');
            
            isValid = false;
        } else {
            // If valid, hide the error message and remove danger styling
            const errorMessageArea = document.getElementById('specifications-error-area');
            if (errorMessageArea) {
                errorMessageArea.style.display = 'none';
            }
            specificationsContainer.classList.remove('border', 'border-danger', 'p-2', 'rounded');
        }
        
        // Validate each specification entry
        specEntries.forEach((entry) => {
            const nameInput = entry.querySelector('.spec-name');
            const valueInput = entry.querySelector('.spec-value');
            
            if (!nameInput.value.trim()) {
                nameInput.classList.add('is-invalid');
                const feedback = nameInput.nextElementSibling;
                if (feedback && feedback.classList.contains('invalid-feedback')) {
                    feedback.textContent = 'Specification name is required.';
                    feedback.style.display = 'block';
                }
                isValid = false;
            } else {
                nameInput.classList.remove('is-invalid');
            }
            
            if (!valueInput.value.trim()) {
                valueInput.classList.add('is-invalid');
                const feedback = valueInput.nextElementSibling;
                if (feedback && feedback.classList.contains('invalid-feedback')) {
                    feedback.textContent = 'Specification value is required.';
                    feedback.style.display = 'block';
                }
                isValid = false;
            } else {
                valueInput.classList.remove('is-invalid');
            }
        });
        
        return isValid;
    }

  // Error handling
    function showError(id, message) {
        const input = document.getElementById(id);
        input.classList.add('is-invalid');
        const feedback = input.nextElementSibling;
        if (feedback && feedback.classList.contains('invalid-feedback')) {
            feedback.textContent = message;
            feedback.style.display = 'block';
        }
    }

    function clearErrors() {
        document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        document.querySelectorAll('.invalid-feedback').forEach(el => {
            el.textContent = '';
            el.style.display = 'none';
        });
        
        // Clear specification error area
        const errorMessageArea = document.getElementById('specifications-error-area');
        if (errorMessageArea) {
            errorMessageArea.style.display = 'none';
        }
        
        // Remove danger styling from specifications container
        const specificationsContainer = document.getElementById('specifications-container');
        if (specificationsContainer) {
            specificationsContainer.classList.remove('border', 'border-danger', 'p-2', 'rounded');
        }
    }

    function displayErrors(errors) {
        Object.entries(errors).forEach(([field, msg]) => {
            const inputId = field === 'cardImage' ? 'cardImageUpload' : 
                            field === 'productImages' ? 'productImagesUpload' : field;
            showError(inputId, msg);
        });
    }

    // Image handling
    function handleFileChange(inputId, thumbnailId, containerId) {
        const fileInput = document.getElementById(inputId);
        const thumbnail = document.getElementById(thumbnailId);
        const container = document.getElementById(containerId);

        if (fileInput.files.length) {
            const file = fileInput.files[0];
            if (validateFile(file)) {
                const reader = new FileReader();
                reader.onload = e => {
                    thumbnail.src = e.target.result;
                    container.style.display = 'block';

                    const removeInput = document.querySelector('input[name="removeCardImage"]');
                if (removeInput) removeInput.remove();
                };
                reader.readAsDataURL(file);
            } else {
                fileInput.value = '';
                container.style.display = 'none';
            }
        }
    }

    function handleMultipleFileChange() {
        const fileInput = document.getElementById('productImagesUpload');
        const container = document.getElementById('productThumbnails');
        const existingThumbnails = Array.from(container.children).filter(t => t.getAttribute('data-existing'));

        // Clear previous new uploads but retain existing
        Array.from(container.children).forEach(child => {
            if (!child.getAttribute('data-existing')) child.remove();
        });
        
        Array.from(fileInput.files).forEach((file, index) => {
            if (validateFile(file)) {
                const reader = new FileReader();
                reader.onload = e => {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'thumbnail-wrapper';
                    wrapper.setAttribute('data-index', existingThumbnails.length + index);

                    const img = document.createElement('img');
                    img.className = 'thumbnail-img';
                    img.src = e.target.result;

                    const removeBtn = document.createElement('button');
                    removeBtn.className = 'remove-btn';
                    removeBtn.innerHTML = '×';
                    removeBtn.onclick = () => removeImage(existingThumbnails.length + index);

                    wrapper.appendChild(img);
                    wrapper.appendChild(removeBtn);
                    wrapper.onclick = e => {
                        if (e.target !== removeBtn) selectThumbnail(wrapper);
                    };
                    container.appendChild(wrapper);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    function validateFile(file) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type) || file.size > 5 * 1024 * 1024) {
            Swal.fire('Error', `Invalid file: ${file.name}. Use JPEG/PNG/GIF/WEBP under 5MB`, 'error');
            return false;
        }
        return true;
    }

    function updateSingleFile(croppedFile) {
        const fileInput = document.getElementById(currentFileInput);
        const thumbnail = document.getElementById('cardThumbnail');
        const container = document.getElementById('cardThumbnailContainer');

        const dt = new DataTransfer();
        dt.items.add(croppedFile);
        fileInput.files = dt.files;

        const reader = new FileReader();
        reader.onload = e => {
            thumbnail.src = e.target.result;
            container.style.display = 'block';
        };
        reader.readAsDataURL(croppedFile);
    }

    function updateMultipleFile(croppedFile) {
        const fileInput = document.getElementById(currentFileInput);
        const wrapper = document.querySelector(`.thumbnail-wrapper[data-index="${currentImageIndex}"]`);
        const img = wrapper.querySelector('img');

        const dt = new DataTransfer();
        const files = Array.from(fileInput.files);
        // files[currentImageIndex] = croppedFile;

        if (wrapper.getAttribute('data-existing')) {
            files.push(croppedFile); // Add new file for existing images
        } else {
            files[currentImageIndex] = croppedFile;
        }

        files.forEach(file => dt.items.add(file));
        fileInput.files = dt.files;

        const reader = new FileReader();
        reader.onload = e => img.src = e.target.result;
        reader.readAsDataURL(croppedFile);
    }

    function openCropModal(file) {
        const img = document.getElementById('imageToCrop');
        const reader = new FileReader();
        reader.onload = e => {
            img.src = e.target.result;
            cropModal.show();
            // Use Bootstrap's 'shown.bs.modal' event to ensure modal is visible
            document.getElementById('cropModal').addEventListener('shown.bs.modal', () => {
                if (cropper) cropper.destroy();
                cropper = new Cropper(img, {
                    aspectRatio: 1,
                    viewMode: 1,
                    zoomable: true,
                    scalable: true,
                    movable: true,
                    minCropBoxWidth: 100,
                    minCropBoxHeight: 100,
                    background: false,
                    responsive: true,
                    autoCropArea: 1,
                });
            },
            //  { once: true }
            ); 
        };
        reader.readAsDataURL(file);
    }

    function selectThumbnail(wrapper) {
        document.querySelectorAll('.thumbnail-wrapper').forEach(el => el.classList.remove('thumbnail-selected'));
        wrapper.classList.add('thumbnail-selected');
    }

    function removeImage(indexOrId) {
        if (typeof indexOrId === 'string' && indexOrId === 'cardImageUpload') {
            const fileInput = document.getElementById(indexOrId);
            const container = document.getElementById('cardThumbnailContainer');
            fileInput.value = '';
            container.style.display = 'none';
            if (isEditMode) {
                const removeInput = document.createElement('input');
                removeInput.type = 'hidden';
                removeInput.name = 'removeCardImage';
                removeInput.value = 'true';
                productForm.appendChild(removeInput);
            }
        } else {
            const fileInput = document.getElementById('productImagesUpload');
            const container = document.getElementById('productThumbnails');
            const wrapper = document.querySelector(`.thumbnail-wrapper[data-index="${indexOrId}"]`);
            if (wrapper) {
                const isExisting = wrapper.getAttribute('data-existing');
                wrapper.remove();
                if (isExisting && isEditMode) {
                    const removeInput = document.createElement('input');
                    removeInput.type = 'hidden';
                    removeInput.name = `removedImages[${indexOrId}]`;
                    removeInput.value = 'true';
                    productForm.appendChild(removeInput);
                } else if (!isExisting) {
                    const dt = new DataTransfer();
                    Array.from(fileInput.files).forEach((file, i) => {
                        if (i !== indexOrId - document.querySelectorAll('[data-existing]').length) dt.items.add(file);
                    });
                    fileInput.files = dt.files;
                }
                Array.from(container.children).forEach((child, i) => child.setAttribute('data-index', i));
            }
        }
    }

    function resetImageInputs() {
        document.getElementById('cardImageUpload').value = '';
        document.getElementById('cardThumbnailContainer').style.display = 'none';
        document.getElementById('productImagesUpload').value = '';
        document.getElementById('productThumbnails').innerHTML = '';
    }

    document.getElementById('add-spec-btn').addEventListener('click', function() {
    const container = document.getElementById('specifications-container');
    const specEntries = container.querySelectorAll('.specification-entry');
    const newIndex = specEntries.length;
    
    const entryDiv = document.createElement('div');
    entryDiv.className = 'specification-entry mb-3';
    entryDiv.setAttribute('data-index', newIndex);
    
    entryDiv.innerHTML = `
        <div class="row g-3 align-items-end">
            <div class="col-md-5">
                <label class="form-label">Specification Name</label>
                <input type="text" class="form-control spec-name" name="specifications[${newIndex}][name]" placeholder="e.g., Processor">
                <div class="invalid-feedback">Specification name is required.</div>
            </div>
            <div class="col-md-5">
                <label class="form-label">Value</label>
                <input type="text" class="form-control spec-value" name="specifications[${newIndex}][value]" placeholder="e.g., Intel i7">
                <div class="invalid-feedback">Value is required.</div>
            </div>
            <div class="col-md-2">
                <button type="button" class="btn btn-danger remove-spec-btn w-100">Remove</button>
            </div>
        </div>
    `;
    
    container.appendChild(entryDiv);
    
    // Add event listener for the remove button
    entryDiv.querySelector('.remove-spec-btn').addEventListener('click', function() {
        entryDiv.remove();
        // Re-index remaining specifications
        reindexSpecifications();
    });
});


// Helper function to re-index specifications after removal
function reindexSpecifications() {
    const container = document.getElementById('specifications-container');
    const specEntries = container.querySelectorAll('.specification-entry');
    
    specEntries.forEach((entry, index) => {
        entry.setAttribute('data-index', index);
        const nameInput = entry.querySelector('.spec-name');
        const valueInput = entry.querySelector('.spec-value');
        
        nameInput.name = `specifications[${index}][name]`;
        valueInput.name = `specifications[${index}][value]`;
    });
}



document.querySelectorAll('.remove-spec-btn').forEach(button => {
    button.addEventListener('click', function() {
        const specEntry = this.closest('.specification-entry');
        specEntry.remove();
        reindexSpecifications();
    });
});
});
