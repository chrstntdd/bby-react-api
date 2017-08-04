"use strict";
const mongoose = require("mongoose");
const bcrypt = require("bcrypt-nodejs");
const table_1 = require("./table");
const UserSchema = new mongoose.Schema({
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
        tables: [table_1.TableSchema]
    }
}, {
    timestamps: true
});
UserSchema.virtual('fullName').get(function () {
    return `${this.profile.firstName} ${this.profile.lastName}`;
});
UserSchema.virtual('url').get(function () {
    return `/api/v1/users/${this._id}`;
});
UserSchema.pre('save', function (next) {
    const user = this;
    const SALT_FACTOR = 5;
    if (!user.isModified('password'))
        return next();
    bcrypt.genSalt(SALT_FACTOR, (err, salt) => {
        if (err)
            return next(err);
        bcrypt.hash(user.password, salt, null, (err, hash) => {
            if (err)
                return next(err);
            user.password = hash;
            next();
        });
    });
});
UserSchema.methods.comparePassword = function (inputPassword, callback) {
    bcrypt.compare(inputPassword, this.password, function (err, isMatch) {
        if (err)
            return callback(err);
        callback(null, isMatch);
    });
};
const User = mongoose.model('User', UserSchema);
module.exports = User;
//# sourceMappingURL=user.js.map