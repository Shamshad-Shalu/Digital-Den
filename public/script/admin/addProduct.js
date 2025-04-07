document.addEventListener('DOMContentLoaded', function() {
    let cropper = null;
    let currentFileInput = null;
    let currentImageIndex = null;
    const cropModal = new bootstrap.Modal(document.getElementById('cropModal'));

    // Form submission
    const productForm = document.getElementById('ProductForm');
    productForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        clearErrors();

        if (!validateForm()) return;

        const formData = new FormData(productForm);
        const url = '/admin/products/add';

        try {
            const response = await fetch(url, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                console.log('Validation errors from server:', result.errors);
                displayErrors(result.errors || {});
                Swal.fire('Error', result.message || 'Please fix the input errors and try again', 'error');
            } else {
                Swal.fire('Success', 'Product added successfully!', 'success')
                    .then(() => {
                        productForm.reset();
                        resetImageInputs();
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

    // Crop button listeners
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
                const file = files[currentImageIndex];
                if (!file) {
                    Swal.fire('Warning', 'No file selected for cropping', 'warning');
                    return;
                }
                openCropModal(file);
            } else {
                currentImageIndex = 0;
                if (!files.length) {
                    Swal.fire('Warning', 'Please select an image first', 'warning');
                    return;
                } else {
                    openCropModal(files[0]);
                }
            }
        });
    });

    // Crop functionality
    document.getElementById('cropButton').addEventListener('click', () => {
        if (!cropper) return;
        const canvas = cropper.getCroppedCanvas(
            {
             width: 500,
              height: 500,
              imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
            fillColor: 'transparent' 
            });
        canvas.toBlob(blob => {
            const croppedFile = new File([blob], `cropped_${Date.now()}.jpg`, { type: 'image/jpeg' });
            if (currentFileInput === 'cardImageUpload') {
                updateSingleFile(croppedFile);
            } else {
                updateMultipleFile(croppedFile);
            }
            cropModal.hide();
            destroyCropper();
        }, 'image/png', 1.0);
    });

    // Zoom and rotate controls
    document.getElementById('rotateLeftBtn').addEventListener('click', () => cropper?.rotate(-90));
    document.getElementById('rotateRightBtn').addEventListener('click', () => cropper?.rotate(90));
    document.getElementById('zoomInBtn').addEventListener('click', () => {
        if (cropper) cropper.zoom(0.1);
    });
    document.getElementById('zoomOutBtn').addEventListener('click', () => {
        if (cropper) cropper.zoom(-0.1);
    });

    // Modal cleanup
    document.getElementById('cropModal').addEventListener('hidden.bs.modal', () => {
        destroyCropper();
    });

    function destroyCropper() {
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
    }

    function openCropModal(file) {
        const img = document.getElementById('imageToCrop');
        const reader = new FileReader();
        reader.onload = e => {
            img.src = e.target.result;
            cropModal.show();
            document.getElementById('cropModal').addEventListener('shown.bs.modal', initializeCropper, { once: true });
        };
        reader.readAsDataURL(file);
    }

    function initializeCropper() {
        const img = document.getElementById('imageToCrop');
        destroyCropper(); // Ensure no previous instance exists
        cropper = new Cropper(img, {
            aspectRatio: 1,
            viewMode: 1,
            zoomable: true,
            scalable: true,
            movable: true,
            minCropBoxWidth: 100,
            minCropBoxHeight: 100,
            background: true,
            responsive: true,
            autoCropArea: 1,
            transparent: true,
        });
    }

    // Validation
    function validateForm() {
        let isValid = true;
        const fields = ['productName', 'description', 'category', 'brand', 'regularPrice', 'salePrice', 'quantity'];
        
        fields.forEach(id => {
            const input = document.getElementById(id);
            if (!input.value.trim()) {
                showError(id, `${input.labels[0].textContent.replace(' *', '')} is required`);
                isValid = false;
            }
        });

        const cardImage = document.getElementById('cardImageUpload');
        if (!cardImage.files.length) {
            showError('cardImageUpload', 'Card image is required');
            isValid = false;
        }

        const productImages = document.getElementById('productImagesUpload');
        if (productImages.files.length < 3) {
            showError('productImagesUpload', 'Minimum 3 product images required');
            isValid = false;
        } else if (productImages.files.length > 4) {
            showError('productImagesUpload', 'Maximum 4 product images allowed');
            isValid = false;
        }

        if (!validateSpecifications()) {
            isValid = false;
        }
        return isValid;
    }

    function validateSpecifications() {
        let isValid = true;
        const specEntries = document.querySelectorAll('.specification-entry');
        const specificationsContainer = document.getElementById('specifications-container');
        
        if (specEntries.length < 3) {
            let errorMessageArea = document.getElementById('specifications-error-area');
            if (!errorMessageArea) {
                errorMessageArea = document.createElement('div');
                errorMessageArea.id = 'specifications-error-area';
                errorMessageArea.className = 'alert alert-danger mt-2';
                errorMessageArea.style.display = 'none';
                const addSpecBtn = document.getElementById('add-spec-btn');
                addSpecBtn.parentNode.insertBefore(errorMessageArea, addSpecBtn);
            }
            errorMessageArea.textContent = 'Minimum 3 specifications required';
            errorMessageArea.style.display = 'block';
            specificationsContainer.classList.add('border', 'border-danger', 'p-2', 'rounded');
            isValid = false;
        } else if (specEntries.length > 10) {
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
            const errorMessageArea = document.getElementById('specifications-error-area');
            if (errorMessageArea) {
                errorMessageArea.style.display = 'none';
            }
            specificationsContainer.classList.remove('border', 'border-danger', 'p-2', 'rounded');
        }
        
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
        
        const errorMessageArea = document.getElementById('specifications-error-area');
        if (errorMessageArea) {
            errorMessageArea.style.display = 'none';
        }
        
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
        
        // Clear existing thumbnails
        container.innerHTML = '';
        
        Array.from(fileInput.files).forEach((file, index) => {
            if (validateFile(file)) {
                const reader = new FileReader();
                reader.onload = e => {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'thumbnail-wrapper';
                    wrapper.setAttribute('data-index', index);

                    const img = document.createElement('img');
                    img.className = 'thumbnail-img';
                    img.src = e.target.result;

                    const removeBtn = document.createElement('button');
                    removeBtn.className = 'remove-btn';
                    removeBtn.innerHTML = '×';
                    removeBtn.onclick = (e) => {
                        e.stopPropagation();
                        removeImage(index);
                    };

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
        files[currentImageIndex] = croppedFile;
        files.forEach(file => dt.items.add(file));
        fileInput.files = dt.files;

        const reader = new FileReader();
        reader.onload = e => img.src = e.target.result;
        reader.readAsDataURL(croppedFile);
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
        } else {
            const fileInput = document.getElementById('productImagesUpload');
            const container = document.getElementById('productThumbnails');
            const wrapper = container.querySelector(`.thumbnail-wrapper[data-index="${indexOrId}"]`);
            
            if (wrapper) {
                wrapper.remove();
                const dt = new DataTransfer();
                Array.from(fileInput.files).forEach((file, i) => {
                    if (i !== indexOrId) dt.items.add(file);
                });
                fileInput.files = dt.files;
                
                // Reindex thumbnails
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

    // Specifications handling
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
                  <input type="text" class="form-control spec-value" name="specifications[${newIndex}][value]" placeholder="e.g., Intel i5-10400F">
                    <div class="invalid-feedback">Specification value is required.</div>
                </div>
                <div class="col-md-2">
                    <button type="button" class="btn btn-outline-danger w-100 remove-spec-btn" data-index="${newIndex}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;
        
        container.appendChild(entryDiv);
        
        // Add event listener to the remove button
        entryDiv.querySelector('.remove-spec-btn').addEventListener('click', function() {
            removeSpecification(this.getAttribute('data-index'));
        });
        
        // Clear any specification validation error if it exists
        const errorMessageArea = document.getElementById('specifications-error-area');
        if (errorMessageArea) {
            errorMessageArea.style.display = 'none';
        }
        
        const specificationsContainer = document.getElementById('specifications-container');
        specificationsContainer.classList.remove('border', 'border-danger', 'p-2', 'rounded');
    });
    
    function removeSpecification(index) {
        const container = document.getElementById('specifications-container');
        const specToRemove = container.querySelector(`.specification-entry[data-index="${index}"]`);
        
        if (specToRemove) {
            specToRemove.remove();
            
            // Reindex remaining specifications
            const allSpecs = container.querySelectorAll('.specification-entry');
            allSpecs.forEach((spec, idx) => {
                spec.setAttribute('data-index', idx);
                spec.querySelector('.remove-spec-btn').setAttribute('data-index', idx);
                
                const nameInput = spec.querySelector('.spec-name');
                const valueInput = spec.querySelector('.spec-value');
                
                nameInput.name = `specifications[${idx}][name]`;
                valueInput.name = `specifications[${idx}][value]`;
            });
        }
    }
    
    // Add at least 3 specification fields by default
    for (let i = 0; i < 3; i++) {
        document.getElementById('add-spec-btn').click();
    }
});