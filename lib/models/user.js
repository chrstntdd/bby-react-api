"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const bcrypt_1 = require("bcrypt");
const mongoose = require("mongoose");
const product_1 = require("./product");
const SALT_FACTOR = 12;
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
const hashPassword = (password) => __awaiter(this, void 0, void 0, function* () {
    try {
        if (!password) {
            return null;
        }
        const hashedPassword = yield bcrypt_1.hash(password, SALT_FACTOR);
        return hashedPassword;
    }
    catch (err) {
        console.log(err);
    }
});
userSchema.methods.comparePassword = function (password) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return yield bcrypt_1.compare(password, this.password);
        }
        catch (err) {
            console.log(err);
        }
    });
};
userSchema.pre('save', function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            !this.isModified('password') && next();
            const hashedPassword = yield bcrypt_1.hash(this.password, SALT_FACTOR);
            this.password = hashedPassword;
            next();
        }
        catch (err) {
            next(err);
        }
    });
});
userSchema.pre('findOneAndUpdate', function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        const password = yield hashPassword(this.getUpdate().$set.password);
        !password && next();
        this.findOneAndUpdate({}, { password });
    });
});
const User = mongoose.model('User', userSchema, 'User');
module.exports = User;
