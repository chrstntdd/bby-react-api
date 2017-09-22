"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const express_1 = require("express");
const jsonwebtoken_1 = require("jsonwebtoken");
const User = require("../models/user");
const upperFirst = require('lodash.upperfirst');
require('dotenv').config();
const JWT_SECRET = process.env.JWT_SECRET;
const CLIENT_URL = process.env.CLIENT_URL;
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const passport = require('passport');
const passportService = require('../config/passport');
const requireAuth = passport.authenticate('jwt', { session: false });
const generateJWT = user => jsonwebtoken_1.sign(user, JWT_SECRET, { expiresIn: '2h' });
const setUserInfo = user => ({
    id: user._id,
    email: user.email,
    firstName: user.profile.firstName,
    lastName: user.profile.lastName,
    role: user.role,
    isVerified: user.isVerified
});
exports.asyncMiddleware = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const genToken = (size) => __awaiter(this, void 0, void 0, function* () {
    return yield new Promise((resolve, reject) => {
        crypto_1.randomBytes(size, (err, buffer) => {
            if (buffer) {
                resolve(buffer.toString('hex'));
            }
            if (err) {
                reject(err);
            }
        });
    });
});
class UserRouter {
    constructor(path = '/api/v1/users') {
        this.router = express_1.Router();
        this.path = path;
        this.init();
    }
    getAll(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const allUsers = yield User.find();
            !allUsers
                ? res.status(404).json({ error: 'There are no users' })
                : res.json(allUsers);
        });
    }
    getById(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield User.findById(req.params.id);
            !user
                ? res.status(404).json({
                    error: `The user with the id ${req.params.id} can't be found`
                })
                : res.json(user);
        });
    }
    signIn(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            req.checkBody('email', 'Please enter a valid email address').isEmail();
            req.checkBody('email', 'Please enter an email').notEmpty();
            req.checkBody('password', 'Please enter a password.').notEmpty();
            req.checkBody('password', 'Please enter a valid password').isAlphanumeric();
            req.sanitizeBody('email').normalizeEmail({
                all_lowercase: true
            });
            req.sanitizeBody('email').escape();
            req.sanitizeBody('email').trim();
            req.sanitizeBody('password').escape();
            req.sanitizeBody('password').trim();
            const cleanEmail = req.body.email;
            const cleanPassword = req.body.password;
            const validationResult = yield req.getValidationResult();
            if (!validationResult.isEmpty()) {
                const validationErrors = [];
                validationResult.array().forEach(error => validationErrors.push(error));
                return res.status(400).json({ validationErrors });
            }
            const existingUser = yield User.findOne({ email: cleanEmail });
            if (!existingUser) {
                return res.status(400).json({
                    emailMessage: "We can't seem to find an account registered with that id. Please try again"
                });
            }
            if (!existingUser.isVerified) {
                return res.status(400).json({
                    verifyMessage: 'Please verify your email before using this service.'
                });
            }
            existingUser.comparePassword(cleanPassword, (err, isMatch) => {
                if (err) {
                    return next(err);
                }
                if (!isMatch) {
                    return res.status(400).json({
                        passwordMessage: 'Your password looks a bit off. Please try again.'
                    });
                }
                const userInfo = setUserInfo(existingUser);
                return res.status(200).json({
                    token: `JWT ${generateJWT(userInfo)}`,
                    user: userInfo
                });
            });
        });
    }
    createNew(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            req.checkBody('firstName', 'Please enter your first name').notEmpty();
            req
                .checkBody('firstName', 'Only letters are allowed for names. Try again please.')
                .isAlpha();
            req.checkBody('lastName', 'Please enter your last name').notEmpty();
            req
                .checkBody('lastName', 'Only letters are allowed for names. Try again please.')
                .isAlpha();
            req.checkBody('password', 'Please enter in a password').notEmpty();
            req
                .checkBody('password', 'Your password should only contain alphanumeric characters')
                .isAlphanumeric();
            req
                .checkBody('employeeNumber', 'Please enter your employee number')
                .notEmpty();
            req
                .checkBody('employeeNumber', 'Your employee number should be in the format <LETTER><NUMBERiD>')
                .isAlphanumeric();
            req.checkBody('storeNumber', 'Please enter your store number').notEmpty();
            req.checkBody('storeNumber', 'Please enter a valid store number').isInt();
            req.sanitizeBody('firstName').escape();
            req.sanitizeBody('firstName').trim();
            req.sanitizeBody('lastName').escape();
            req.sanitizeBody('lastName').trim();
            req.sanitizeBody('password').escape();
            req.sanitizeBody('password').trim();
            req.sanitizeBody('employeeNumber').escape();
            req.sanitizeBody('employeeNumber').trim();
            req.sanitizeBody('storeNumber').escape();
            req.sanitizeBody('storeNumber').trim();
            req.sanitizeBody('storeNumber').toInt(10);
            const { password, employeeNumber, storeNumber } = req.body;
            const email = `${employeeNumber}@bestbuy.com`;
            const firstName = upperFirst(req.body.firstName);
            const lastName = upperFirst(req.body.lastName);
            const validationResult = yield req.getValidationResult();
            if (!validationResult.isEmpty()) {
                return res.status(406).json({
                    status: res.status,
                    messages: validationResult.array()
                });
            }
            const existingUser = yield User.findOne({ email });
            if (existingUser) {
                return res.status(409).json({
                    status: res.status,
                    message: 'Sorry, it looks as if there is already an account associated with that employee number'
                });
            }
            else {
                const newUser = yield new User({
                    email,
                    employeeNumber,
                    password,
                    storeNumber,
                    confirmationEmailToken: yield genToken(24),
                    profile: { firstName, lastName }
                }).save();
                const emailData = {
                    to: newUser.email,
                    from: 'noreply@quantified',
                    subject: 'Quantified Account Confirmation',
                    text: 'You are receiving this because you (or someone else) have requested an account with Quantified.\n\n' +
                        'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                        `${CLIENT_URL}/verify-email/${newUser.confirmationEmailToken}\n\n` +
                        `If you did not request this, please ignore this email.\n`
                };
                if (process.env.NODE_ENV === 'test') {
                    res.status(201).json({
                        message: 'Your account has been created, now please check your work email to confirm your account.'
                    });
                }
                else {
                    try {
                        yield sgMail.send(emailData);
                        res.status(201).json({
                            message: 'Thank you for signing up! Your account has been created, now please check your work email to confirm your account.'
                        });
                    }
                    catch (error) {
                        console.error(error.toString());
                        const { message, code, response } = error;
                        const { headers, body } = response;
                        res.status(500).json({
                            message,
                            code,
                            response,
                            headers,
                            body
                        });
                    }
                }
            }
        });
    }
    deleteById(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const userToDelete = yield User.findByIdAndRemove(req.params.id);
            if (!userToDelete) {
                res.status(404).json({
                    error: `We cant find the user you\'re trying to delete 😐 `
                });
            }
            else {
                const { firstName, lastName } = userToDelete.profile;
                res.status(202).json({
                    message: `${firstName} ${lastName} has been removed.`
                });
            }
        });
    }
    updateById(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const userToUpdate = yield User.findById(req.params.id);
            if (!userToUpdate) {
                res.status(404).json({
                    error: 'Whom are you looking for anyway my guy?'
                });
            }
            else {
                const { firstName, lastName } = userToUpdate.profile;
                const updated = {};
                const mutableFields = ['profile', 'storeNumber', 'password'];
                const immutableFields = [
                    'email',
                    'employeeNumber',
                    'role',
                    'resetPasswordToken',
                    'resetPasswordExpires',
                    'confirmationEmailToken',
                    'isVerified',
                    'created'
                ];
                const fieldsRequestedToUpdate = Object.keys(req.body);
                const errors = immutableFields.filter(field => fieldsRequestedToUpdate.includes(field));
                if (errors.length > 0) {
                    res.status(401).json({
                        message: "You can't update those fields, brother"
                    });
                }
                else {
                    mutableFields.forEach(field => {
                        if (field in req.body) {
                            updated[field] = req.body[field];
                        }
                    });
                    let updatedUser;
                    updatedUser = yield User.update(req.params.id, { $set: updated }, { new: true });
                    res.status(201).json({
                        message: `${firstName} ${lastName} has updated their account`
                    });
                }
            }
        });
    }
    verifyEmail(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            req.sanitizeParams('token').trim();
            req.sanitizeParams('token').escape();
            const existingUser = yield User.findOne({
                confirmationEmailToken: req.params.token
            });
            if (!existingUser) {
                res.status(422).json({
                    status: res.status,
                    message: 'Account not found'
                });
            }
            else {
                existingUser.isVerified = true;
                const updatedUser = yield existingUser.save();
                const userInfo = setUserInfo(updatedUser);
                res.status(200).json({
                    token: `JWT ${generateJWT(userInfo)}`,
                    user: userInfo
                });
            }
        });
    }
    forgotPassword(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            req
                .checkBody('employeeNumber', 'Please enter your employee number')
                .notEmpty();
            req
                .checkBody('employeeNumber', 'Your employee number should be in the format <LETTER><NUMBERiD>')
                .isAlphanumeric();
            req.sanitizeBody('employeeNumber').escape();
            req.sanitizeBody('employeeNumber').trim();
            const cleanEmployeeNumber = req.body.employeeNumber;
            const validationResult = yield req.getValidationResult();
            if (!validationResult.isEmpty()) {
                const validationErrors = [];
                validationResult.array().forEach(error => validationErrors.push(error));
                res.status(400).json({ validationErrors });
            }
            else {
                const existingUser = yield User.findOne({
                    employeeNumber: cleanEmployeeNumber
                });
                if (!existingUser) {
                    res.status(404).json({
                        error: "We can't find an account associated with that employee number. Please try again."
                    });
                }
                else {
                    const resetPasswordToken = yield genToken(24);
                    existingUser.resetPasswordToken = resetPasswordToken;
                    existingUser.resetPasswordExpires = Date.now() + 3600000;
                    yield existingUser.save();
                    const emailData = {
                        to: existingUser.email,
                        from: 'noreply@quantified',
                        subject: 'Quantified Password Reset',
                        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
                            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                            `${CLIENT_URL}/reset-password/${resetPasswordToken}\n\n` +
                            `If you did not request this, please ignore this email and your password will remain unchanged.\n`
                    };
                    if (process.env.NODE_ENV === 'test') {
                        res.status(200).json({
                            resetToken: resetPasswordToken,
                            message: 'Thank you. Please check your work email for a message containing the link to reset your password.'
                        });
                    }
                    else {
                        try {
                            yield sgMail.send(emailData);
                            res.status(200).json({
                                resetToken: resetPasswordToken,
                                message: 'Thank you. Please check your work email for a message containing the link to reset your password.'
                            });
                        }
                        catch (error) {
                            console.error(error.toString());
                            const { message, code, response } = error;
                            const { headers, body } = response;
                            res.status(500).json({
                                message,
                                code,
                                response,
                                headers,
                                body
                            });
                        }
                    }
                }
            }
        });
    }
    resetPassword(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const existingUser = yield User.findOne({
                resetPasswordToken: req.params.token,
                resetPasswordExpires: { $gt: Date.now() }
            });
            if (!existingUser) {
                res.status(400).json({
                    error: 'Whoops! It looks like your reset token has already expired. Please try to reset your password again.'
                });
            }
            else {
                req.sanitizeBody('password').escape();
                req.sanitizeBody('password').trim();
                const newPassword = req.body.password;
                existingUser.password = newPassword;
                existingUser.resetPasswordToken = undefined;
                existingUser.resetPasswordExpires = undefined;
                yield existingUser.save();
                const emailData = {
                    to: existingUser.email,
                    from: 'noreply@quantified',
                    subject: 'Your Quantified password has been reset',
                    text: 'You are receiving this email because you changed your password. \n\n' +
                        'If you did not request this change, please contact us immediately.'
                };
                if (process.env.NODE_ENV === 'test') {
                    res.status(200).json({
                        message: 'Your password has been changed successfully'
                    });
                }
                else {
                    try {
                        yield sgMail.send(emailData);
                        res.status(200).json({
                            message: 'Your password has been changed successfully'
                        });
                    }
                    catch (error) {
                        console.error(error.toString());
                        const { message, code, response } = error;
                        const { headers, body } = response;
                        res.status(500).json({
                            message,
                            code,
                            response,
                            headers,
                            body
                        });
                    }
                }
            }
        });
    }
    getSavedTable(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const userId = req.params.id;
            const user = yield User.findById(userId);
            !user
                ? res.status(404).json({
                    error: "Can't seem to find those products you were looking for"
                })
                : res.status(200).json({
                    products: user.tableData.products
                });
        });
    }
    updateSavedTable(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const { currentTableState } = req.body;
            const userId = req.params.id;
            const updatedUser = yield User.findOneAndUpdate({ _id: userId }, { $set: { 'tableData.products': currentTableState } }, { new: true });
            !updatedUser
                ? res.status(404).json({
                    error: "Can't seem to find the user to update their table"
                })
                : res.status(201).json({
                    updatedUser,
                    message: 'Updated the table successfully!'
                });
        });
    }
    init() {
        this.router.get('/', exports.asyncMiddleware(this.getAll));
        this.router.get('/:id', exports.asyncMiddleware(this.getById));
        this.router.get('/:id/table', requireAuth, exports.asyncMiddleware(this.getSavedTable));
        this.router.put('/:id/table', requireAuth, exports.asyncMiddleware(this.updateSavedTable));
        this.router.post('/', exports.asyncMiddleware(this.createNew));
        this.router.post('/sign-in', exports.asyncMiddleware(this.signIn));
        this.router.post('/verify-email/:token', exports.asyncMiddleware(this.verifyEmail));
        this.router.post('/forgot-password', exports.asyncMiddleware(this.forgotPassword));
        this.router.post('/reset-password/:token', exports.asyncMiddleware(this.resetPassword));
        this.router.put('/:id', exports.asyncMiddleware(this.updateById));
        this.router.delete('/:id', exports.asyncMiddleware(this.deleteById));
    }
}
exports.default = UserRouter;
