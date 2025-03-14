const mongoose = require("mongoose");

function validateProduct(product) {
    let errors = {};

    // Validate productName
    if (!product.productName) {
        errors.productName = 'Product name is required';
    } else if (product.productName.length < 3 || product.productName.length > 50) {
        errors.productName = 'Product name must be 3-50 characters.';
    }else if (!/[a-zA-Z0-9]/.test(product.productName)){
        errors.productName = 'Product name must contain at least one letter or number';
    }else if (!/^[a-zA-Z0-9\s\-_.,;:!?&()'"+%]*$/.test(product.productName)){
        errors.productName = 'Product name must contain at least one letter or number';
    }else if  (/^\s+$/.test(product.productName) || /\s{3,}/.test(product.productName)){
        errors.productName = 'Product name must contain at least one letter or number';
    }

    // Validate description
    if (!product.description) {
        errors.description = 'Description is required';
    } else if (product.description.length < 10 || product.description.length > 10000) {
        errors.description = 'Description must be 10-10000 characters.';
    } else if (!/[a-zA-Z0-9]/.test(product.description)) {
        errors.description = 'Description must contain actual text content';
    } else if (/(.)\1{10,}/.test(product.description)) {
        errors.description = 'Description contains excessive repetitive characters';
    }
   

    // Validate category
    if (!product.category) {
        errors.category = 'Category is required';
    } else if (!mongoose.Types.ObjectId.isValid(product.category)) {
        errors.category = 'Please enter a valid category ID.';
    }

    // Validate brand
    if (!product.brand) {
        errors.brand = 'Brand is required';
    }  else if (!mongoose.Types.ObjectId.isValid(product.brand)) {
        errors.brand = 'Please enter a valid brand ID.';
    }

    // Validate regularPrice
    if (!product.regularPrice) {
        errors.regularPrice = 'Regular price is required';
    } else if (isNaN(product.regularPrice) || product.regularPrice < 0) {
        errors.regularPrice = 'Regular price must be a positive number.';
    }

    // Validate salePrice
    if (!product.salePrice) {
        errors.salePrice = 'Sale price is required';
    } else if (isNaN(product.salePrice) || product.salePrice < 0) {
        errors.salePrice = 'Sale price must be a positive number.';
    } else if (product.salePrice > product.regularPrice) {
        errors.salePrice = 'Sale price must be less than or equal to regular price.';
    }

    // Validate quantity
    if (!product.quantity) {
        errors.quantity = 'Quantity is required';
    } else if (isNaN(product.quantity) || product.quantity < 0) {
        errors.quantity = 'Quantity must be a positive number.';
    }

    // Validate cardImage
    if (!product.cardImage && !product.cardImage.length) {
        errors.cardImage = 'Card image is required';
    }

    // Validate productImages
    if (!product.productImages || product.productImages.length < 3) {
        errors.productImages = 'Minimum 3 product images are required';
    } else if (product.productImages.length > 4) {
        errors.productImages = 'Maximum 4 product images are allowed';
    }


    // Validate status
    if (!product.status) {
        errors.status = 'Status is required';
    } else if (!["Available", "out of stock"].includes(product.status)) {
        errors.status = 'Status must be one of: Available, out of stock,';
    }

    // Validate specifications
    if (!product.specifications || product.specifications.length === 0) {
        errors.specifications = 'At least one specification is required';
    } else {
        product.specifications.forEach((spec, index) => {
            // Validate specification name
            if (!spec.name) {
                errors[`specifications[${index}].name`] = 'Specification name is required';
            } else if (spec.name.trim().length < 2 || spec.name.trim().length > 50) {
                errors[`specifications[${index}].name`] = 'Specification name must be 2-50 characters';
            } else if (!/^[a-zA-Z0-9\s\-_.,&()]+$/.test(spec.name)) {
                errors[`specifications[${index}].name`] = 'Specification name contains invalid characters';
            }
            
            // Validate specification value
            if (!spec.value) {
                errors[`specifications[${index}].value`] = 'Specification value is required';
            } else if (spec.value.trim().length < 1 || spec.value.trim().length > 100) {
                errors[`specifications[${index}].value`] = 'Specification value must be 1-100 characters';
            } else if (!/[a-zA-Z0-9]/.test(spec.value)) {
                errors[`specifications[${index}].value`] = 'Specification value must contain actual content';
            }
        });
    }


    return errors;
}

module.exports = { validateProduct};


