const validator = require('validator');
const User = require('../model/userSchema');
const bcrypt = require('bcrypt');

async function validateUserProfile(data, userId) {
    let errors = {};

    if (!data.username) {
        errors.username = 'Username is required';
    } else if (!validator.isLength(data.username, { min: 3, max: 50 })) {
        errors.username = 'Username must be 3-50 characters';
    } else if (!validator.matches(data.username, /^[a-zA-Z0-9\s\-_.,;:!?&()'"]*$/)) {
        errors.username = 'Username contains invalid characters';
    }

    if (!data.email) {
        errors.email = 'Email is required';
    } else if (!validator.isEmail(data.email)) {
        errors.email = 'Invalid email format';
    } else {
        const existingUser = await User.findOne({ email: data.email, _id: { $ne: userId } });
        if (existingUser) {
            errors.email = 'Email is already in use';
        }
    } 

    if (data.phone && !validator.isMobilePhone(data.phone, 'any')) {
        errors.phone = 'Invalid phone number format';
    } else if (data.phone) {
        const existingUser = await User.findOne({ phone: data.phone, _id: { $ne: userId } });
        if (existingUser) {
            errors.phone = 'Phone number is already in use';
        }
    }

    return errors;
}


async function validateEmailChange(user, data) {
    let errors = {};

    if (!data.currentPassword) {
        errors.currentPassword = 'Current password is required';
    } else if (!await bcrypt.compare(data.currentPassword, user.password)) {
        errors.currentPassword = 'Current password is incorrect';
    }

    if (!data.email) {
        errors.email = 'Email is required';
    } else if (!validator.isEmail(data.email)) {
        errors.email = 'Invalid email format';
    } else {
        const existingUser = await User.findOne({ email: data.email, _id: { $ne: user._id } });
        if (existingUser) {
            errors.email = 'Email is already in use';
        }
    }

    return errors;
}

module.exports = { 
    validateUserProfile, 
    // validatePasswordChange, 
    validateEmailChange 
};