"use strict";
const bcrypt_nodejs_1 = require("bcrypt-nodejs");
const mongoose = require("mongoose");
const product_1 = require("./product");
const userSchema = new mongoose.Schema({
    email: {
        type: String,
        lowercase: true,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    profile: {
        firstName: {
            type: String
        },
        lastName: {
            type: String
        }
    },
    employeeNumber: {
        type: String
    },
    storeNumber: {
        type: Number
    },
    role: {
        type: String,
        enum: ['Member', 'Client', 'Owner', 'Admin'],
        default: 'Member'
    },
    resetPasswordToken: {
        type: String
    },
    resetPasswordExpires: {
        type: Date
    },
    confirmationEmailToken: {
        type: String
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    tableData: {
        tableMetadata: { type: String },
        products: [product_1.ProductSchema]
    }
}, {
    timestamps: true
});
userSchema.virtual('fullName').get(function () {
    return `${this.profile.firstName} ${this.profile.lastName}`;
});
userSchema.virtual('url').get(function () {
    return `/api/v1/users/${this._id}`;
});
userSchema.pre('save', function (next) {
    const user = this;
    const SALT_FACTOR = 12;
    if (!user.isModified('password'))
        return next();
    bcrypt_nodejs_1.genSalt(SALT_FACTOR, (err, salt) => {
        if (err)
            return next(err);
        bcrypt_nodejs_1.hash(user.password, salt, null, (err, hash) => {
            if (err)
                return next(err);
            user.password = hash;
            next();
        });
    });
});
userSchema.methods.comparePassword = function (inputPassword, callback) {
    bcrypt_nodejs_1.compare(inputPassword, this.password, (err, isMatch) => {
        err ? callback(err) : callback(null, isMatch);
    });
};
const User = mongoose.model('User', userSchema, 'User');
module.exports = User;
