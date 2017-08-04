"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const express_1 = require("express");
const User = require("../models/user");
const jsonwebtoken_1 = require("jsonwebtoken");
const crypto_1 = require("crypto");
const nodemailer_1 = require("nodemailer");
const JWT_SECRET = process.env.JWT_SECRET;
const SMTP_URL = process.env.SMTP_URL;
const FROM_EMAIL = process.env.FROM_EMAIL;
const generateJWT = user => jsonwebtoken_1.sign(user, JWT_SECRET, { expiresIn: '2h' });
const setUserInfo = user => ({
    email: user.email,
    firstName: user.profile.firstName,
    lastName: user.profile.lastName,
    role: user.role,
    isVerified: user.isVerified
});
const passport = require('passport');
const passportService = require('../config/passport');
const requireAuth = passport.authenticate('jwt', { session: false });
const requireLogin = passport.authenticate('local', { session: false });
class UserRouter {
    constructor(path = '/api/v1/users') {
        this.router = express_1.Router();
        this.path = path;
        this.init();
    }
    getAll(req, res, next) {
        User.find()
            .then(res => {
            const users = res;
            return users;
        })
            .then(users => res.status(200).json(users))
            .catch(err => {
            res.status(500).json({
                status: res.status,
                message: 'Everything blew up'
            });
        });
    }
    getById(req, res, next) {
        User.findById(req.params.id)
            .then(res => {
            const user = res;
            return user;
        })
            .then(user => res.status(200).json(user))
            .catch(err => {
            res.status(400).json({
                status: res.status,
                message: `No user found with the id: ${req.params.id}`
            });
        });
    }
    signIn(req, res, next) {
        req.checkBody('email', 'Please enter a valid email address').isEmail();
        req.checkBody('email', 'Please enter an email').notEmpty();
        req.sanitizeBody('email').escape();
        req.sanitizeBody('email').trim();
        const email = req.body.email;
        req.getValidationResult().then(result => {
            if (!result.isEmpty()) {
                res.status(406).json({
                    status: res.status,
                    messages: result.array()
                });
                return;
            }
        });
        User.findOne({ email }, (err, existingUser) => {
            if (err)
                return next(err);
            if (existingUser) {
                const userInfo = setUserInfo(existingUser);
                return res.status(200).json({
                    token: `JWT ${generateJWT(userInfo)}`,
                    user: userInfo
                });
            }
        });
    }
    createNew(req, res, next) {
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
        const email = `${req.body.employeeNumber}@bestbuy.com`;
        const firstName = req.body.firstName;
        const lastName = req.body.lastName;
        const password = req.body.password;
        const employeeNumber = req.body.employeeNumber;
        const storeNumber = req.body.storeNumber;
        req.getValidationResult().then(result => {
            if (!result.isEmpty()) {
                res.status(406).json({
                    status: res.status,
                    messages: result.array()
                });
                return;
            }
        });
        User.findOne({ email }, (err, existingUser) => {
            if (err) {
                return next(err);
            }
            if (existingUser) {
                return res.status(409).json({
                    status: res.status,
                    message: 'Sorry, it looks as if there is already an account associated with that employee number'
                });
            }
            crypto_1.randomBytes(24, (err, buffer) => {
                if (err) {
                    return next(err);
                }
                const verifyToken = buffer.toString('hex');
                const user = new User({
                    email,
                    password,
                    confirmationEmailToken: verifyToken,
                    profile: { firstName, lastName },
                    storeNumber,
                    employeeNumber
                });
                user.save((err, user) => {
                    if (err) {
                        return next(err);
                    }
                    const transporter = nodemailer_1.createTransport(SMTP_URL);
                    const emailData = {
                        to: user.email,
                        from: FROM_EMAIL,
                        subject: 'Quantified Account Confirmation',
                        text: `${'You are receiving this because you (or someone else) have requested an account with Quantified.\n\n' +
                            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                            'http://'}${req.headers
                            .host}/confirm-email/${verifyToken}\n\n` +
                            `If you did not request this, please ignore this email.\n`
                    };
                    if (process.env.NODE_ENV === 'test') {
                        return res.status(201).json({
                            message: 'Your account has been created, now please check your work email to confirm your account.',
                            status: res.status,
                            user
                        });
                    }
                    else {
                        transporter.sendMail(emailData);
                        return res.status(201).json({
                            message: 'Your account has been created, now please check your work email to confirm your account.',
                            status: res.status,
                            user
                        });
                    }
                });
            });
        });
    }
    deleteById(req, res, next) {
        User.findByIdAndRemove(req.params.id)
            .then(userObject => {
            if (userObject == null) {
                return res.status(400).json({
                    status: res.status,
                    message: 'There was an error my mans'
                });
            }
            res.status(202).json({
                status: res.status,
                message: `${userObject.profile.firstName} ${userObject.profile
                    .lastName} has been removed.`
            });
        })
            .catch(err => {
            res.status(400).json({
                status: res.status,
                message: 'There was an error, my guy'
            });
        });
    }
    updateById(req, res, next) {
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
        immutableFields.forEach(field => {
            if (field in req.body) {
                return res.status(401).json({
                    status: res.status,
                    message: "Sorry, you can't update those settings on your account"
                });
            }
        });
        mutableFields.forEach(field => {
            if (field in req.body) {
                updated[field] = req.body[field];
            }
        });
        User.findByIdAndUpdate(req.params.id, { $set: updated }, { new: true })
            .exec()
            .then(userObject => {
            if (userObject == null) {
                return res.status(404).json({
                    status: res.status,
                    message: 'Whom are you looking for anyway my guy?'
                });
            }
            res.status(201).json({
                status: res.status,
                message: `${userObject.profile.firstName} ${userObject.profile
                    .lastName} has updated their account`
            });
        })
            .catch(err => {
            res.status(404).json({
                status: res.status,
                message: 'Who are you looking for anyway?'
            });
        });
    }
    verifyEmail(req, res, next) {
        User.findOne({ confirmationEmailToken: req.params.token }, (err, existingUser) => {
            if (!existingUser) {
                return res.status(422).json({
                    status: res.status,
                    message: 'Account not found'
                });
            }
            else {
                existingUser.isVerified = true;
                existingUser.save(err => {
                    if (err)
                        return next(err);
                    const userInfo = setUserInfo(existingUser);
                    return res.status(200).json({
                        token: `JWT ${generateJWT(userInfo)}`,
                        user: userInfo
                    });
                });
            }
        });
    }
    forgotPassword(req, res, next) {
        req.checkBody('email', 'Please enter a valid email address').isEmail();
        req.checkBody('email', 'Please enter an email').notEmpty();
        req.sanitizeBody('email').escape();
        req.sanitizeBody('email').trim();
        const email = req.body.email;
        const errors = { status: 406, messages: [] };
        req.getValidationResult().then(result => {
            if (!result.isEmpty()) {
                errors.messages = result.array();
            }
        });
        User.findOne({ email }, (err, existingUser) => {
            if (err)
                return next(err);
            if (existingUser === null || errors.messages.length > 0) {
                return res
                    .status(errors.messages.length > 0 ? errors.status : 422)
                    .json({
                    status: errors.messages.length > 0 ? errors.status : 422,
                    messages: errors.messages.length > 0
                        ? errors.messages
                        : "There doesn't seem to be an account associated with that email. Please try again."
                });
            }
            crypto_1.randomBytes(24, (err, buffer) => {
                const resetToken = buffer.toString('hex');
                if (err)
                    return next(err);
                existingUser.resetPasswordToken = resetToken;
                existingUser.resetPasswordExpires = Date.now() + 3600000;
                existingUser.save(err => {
                    if (err)
                        return err;
                    const transporter = nodemailer_1.createTransport(SMTP_URL);
                    const emailData = {
                        to: existingUser.email,
                        from: FROM_EMAIL,
                        subject: 'Quantified Password Reset',
                        text: `${'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
                            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                            'http://'}${req.headers
                            .host}/reset-password/${resetToken}\n\n` +
                            `If you did not request this, please ignore this email and your password will remain unchanged.\n`
                    };
                    if (process.env.NODE_ENV === 'test') {
                        return res.status(200).json({
                            status: res.status,
                            resetToken,
                            message: 'Thank you. Please check your work email for a message containing the link to reset your password.'
                        });
                    }
                    else {
                        transporter.sendMail(emailData);
                        return res.status(200).json({
                            status: res.status,
                            resetToken,
                            message: 'Thank you. Please check your work email for a message containing the link to reset your password.'
                        });
                    }
                });
            });
        });
    }
    resetPassword(req, res, next) {
        User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        }, (err, existingUser) => {
            if (!existingUser) {
                return res.status(422).json({
                    status: res.status,
                    message: 'Whoops! It looks like your reset token has already expired. Please try to reset your password again.'
                });
            }
            req.sanitizeBody('password').escape();
            req.sanitizeBody('password').trim();
            const newPassword = req.body.password;
            existingUser.password = newPassword;
            existingUser.resetPasswordToken = undefined;
            existingUser.resetPasswordExpires = undefined;
            existingUser.save(err => {
                if (err)
                    return next(err);
                const transporter = nodemailer_1.createTransport(SMTP_URL);
                const emailData = {
                    to: existingUser.email,
                    from: FROM_EMAIL,
                    subject: 'Your Quantified password has been reset',
                    text: 'You are receiving this email because you changed your password. \n\n' +
                        'If you did not request this change, please contact us immediately.'
                };
                if (process.env.NODE_ENV === 'test') {
                    return res.status(200).json({
                        status: res.status,
                        message: 'Your password has been changed successfully'
                    });
                }
                else {
                    transporter.sendMail(emailData);
                    return res.status(200).json({
                        status: res.status,
                        message: 'Your password has been changed successfully'
                    });
                }
            });
        });
    }
    init() {
        this.router.get('/', this.getAll);
        this.router.get('/:id', this.getById);
        this.router.post('/', this.createNew);
        this.router.post('/sign-in', this.signIn, requireLogin);
        this.router.post('/verify-email/:token', this.verifyEmail);
        this.router.post('/forgot-password', this.forgotPassword);
        this.router.post('/reset-password/:token', this.resetPassword);
        this.router.put('/:id', this.updateById);
        this.router.delete('/:id', this.deleteById);
    }
}
exports.default = UserRouter;
//# sourceMappingURL=UserRouter.js.map