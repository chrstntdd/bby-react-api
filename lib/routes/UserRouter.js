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
const express_1 = require("express");
const index_1 = require("../index");
const celebrate_1 = require("celebrate");
const boom = require("boom");
const User = require("../models/user");
const util_1 = require("../util");
const validationSchemas_1 = require("../config/validationSchemas");
const upperFirst = require('lodash.upperfirst');
const lowerFirst = require('lodash.lowerfirst');
require('dotenv').config();
let CLIENT_URL;
index_1.ENV !== 'production'
    ? (CLIENT_URL = 'http://localhost:4444')
    : (CLIENT_URL = process.env.CLIENT_URL);
const passport = require('passport');
const passportService = require('../config/passport');
const requireAuth = passport.authenticate('jwt', { session: false });
class UserRouter {
    constructor(path = '/api/v1/users') {
        this.router = express_1.Router();
        this.path = path;
        this.init();
    }
    getAll(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const allUsers = yield User.find();
            if (!allUsers) {
                throw boom.notFound('There are no users');
            }
            else {
                res.json(allUsers);
            }
        });
    }
    getById(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield User.findById(req.params.id);
            if (!user) {
                throw boom.notFound(`The user with the id ${req.params.id} can't be found`);
            }
            else {
                res.json(user);
            }
        });
    }
    signIn(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const { email, password } = req.body;
            const existingUser = yield User.findOne({ email });
            if (!existingUser) {
                throw boom.notFound("There doesn't appear to be an account with that id. Please try again.");
            }
            if (!existingUser.isVerified) {
                throw boom.forbidden('Please verify your email before using this service.');
            }
            if (!(yield existingUser.comparePassword(password))) {
                throw boom.unauthorized('Your password looks a bit off. Please try again.');
            }
            const userInfo = util_1.setUserInfo(existingUser);
            return res.status(200).json({
                jwt: `JWT ${util_1.generateJWT(userInfo)}`,
                user: userInfo
            });
        });
    }
    createNew(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const { password, storeNumber } = req.body;
            const employeeNumber = lowerFirst(req.body.employeeNumber);
            const firstName = upperFirst(req.body.firstName);
            const lastName = upperFirst(req.body.lastName);
            const email = `${employeeNumber}@bestbuy.com`;
            const existingUser = yield User.findOne({ email });
            if (existingUser) {
                throw boom.conflict('Sorry, it looks as if there is already an account associated with that employee number');
            }
            else {
                const newUser = yield new User({
                    email,
                    employeeNumber,
                    password,
                    storeNumber,
                    confirmationEmailToken: yield util_1.genToken(24),
                    profile: { firstName, lastName }
                }).save();
                const emailData = {
                    to: newUser.email,
                    from: 'noreply@quantified',
                    subject: 'Quantified Account Confirmation',
                    text: 'You are receiving this because you (or someone else) have requested an account with Quantified.\n\n' +
                        'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                        `${CLIENT_URL}/verify-email?token=${newUser.confirmationEmailToken}\n\n` +
                        `If you did not request this, please ignore this email.\n`
                };
                if (index_1.ENV === 'production') {
                    yield util_1.verifySMTP();
                    yield util_1.sendEmailAsync(emailData);
                    return res.status(201).json({
                        message: 'Thank you for signing up! Your account has been created, now please check your work email to confirm your account.'
                    });
                }
                else {
                    return res.status(201).json({
                        message: 'Your account has been created, now please check your work email to confirm your account.'
                    });
                }
            }
        });
    }
    deleteById(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const userToDelete = yield User.findByIdAndRemove(req.params.id);
            if (!userToDelete) {
                throw boom.notFound("We cant find the user you're trying to delete");
            }
            else {
                const { firstName, lastName } = userToDelete.profile;
                return res.status(202).json({
                    message: `${firstName} ${lastName} has been removed.`
                });
            }
        });
    }
    updateById(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const userToUpdate = yield User.findById(req.params.id);
            if (!userToUpdate) {
                throw boom.notFound("We cant find the user you're trying to update");
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
                    throw boom.forbidden("You can't update those fields, brother");
                }
                else {
                    mutableFields.forEach(field => {
                        if (field in req.body) {
                            updated[field] = req.body[field];
                        }
                    });
                    const updatedUser = yield User.update({ _id: req.params.id }, { $set: updated }, { new: true });
                    return res.status(201).json({
                        message: `${firstName} ${lastName} has updated their account`
                    });
                }
            }
        });
    }
    verifyEmail(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const existingUser = yield User.findOne({
                confirmationEmailToken: req.query.token
            });
            if (!existingUser) {
                throw boom.notFound('Account not found');
            }
            else {
                existingUser.isVerified = true;
                existingUser.confirmationEmailToken = undefined;
                const updatedUser = yield existingUser.save();
                const userInfo = util_1.setUserInfo(updatedUser);
                return res.status(200).json({
                    jwt: `JWT ${util_1.generateJWT(userInfo)}`,
                    user: userInfo
                });
            }
        });
    }
    forgotPassword(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const { employeeNumber } = req.body;
            const existingUser = yield User.findOne({ employeeNumber });
            if (!existingUser) {
                throw boom.notFound("We can't find an account associated with that employee number. Please try again.");
            }
            else {
                const resetPasswordToken = yield util_1.genToken(24);
                existingUser.resetPasswordToken = resetPasswordToken;
                existingUser.resetPasswordExpires = Date.now() + 3600000;
                yield existingUser.save();
                const emailData = {
                    to: existingUser.email,
                    from: 'noreply@quantified',
                    subject: 'Quantified Password Reset',
                    text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
                        'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                        `${CLIENT_URL}/reset-password?token=${resetPasswordToken}\n\n` +
                        `If you did not request this, please ignore this email and your password will remain unchanged.\n`
                };
                if (index_1.ENV === 'production') {
                    yield util_1.verifySMTP();
                    yield util_1.sendEmailAsync(emailData);
                    return res.status(200).json({
                        resetToken: resetPasswordToken,
                        message: 'Thank you. Please check your work email for a message containing the link to reset your password.'
                    });
                }
                else {
                    return res.status(200).json({
                        resetToken: resetPasswordToken,
                        message: 'Thank you. Please check your work email for a message containing the link to reset your password.'
                    });
                }
            }
        });
    }
    resetPassword(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const existingUser = yield User.findOne({
                resetPasswordToken: req.query.token,
                resetPasswordExpires: { $gt: Date.now() }
            });
            if (!existingUser) {
                throw boom.badRequest('Whoops! It looks like your reset token has already expired. Please try to reset your password again.');
            }
            else {
                const { password } = req.body;
                existingUser.password = password;
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
                if (index_1.ENV === 'production') {
                    yield util_1.verifySMTP();
                    yield util_1.sendEmailAsync(emailData);
                    return res.status(200).json({
                        message: 'Your password has been changed successfully. Redirecting you to the sign in page now...'
                    });
                }
                else {
                    return res.status(200).json({
                        message: 'Your password has been changed successfully. Redirecting you to the sign in page now...'
                    });
                }
            }
        });
    }
    getSavedTable(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const userId = req.params.id;
            const user = yield User.findById(userId);
            if (!user) {
                throw boom.notFound("Can't seem to find those products you were looking for");
            }
            else {
                return res.status(200).json({
                    products: user.tableData.products
                });
            }
        });
    }
    updateSavedTable(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const { currentTableState } = req.body;
            const userId = req.params.id;
            const updatedUser = yield User.findOneAndUpdate({ _id: userId }, { $set: { 'tableData.products': currentTableState } }, { new: true });
            if (!updatedUser) {
                throw boom.notFound("Can't seem to find the user to update their table");
            }
            else {
                return res.status(201).json({
                    updatedUser,
                    message: 'Updated the table successfully!'
                });
            }
        });
    }
    init() {
        this.router.get('/', util_1.asyncMiddleware(this.getAll));
        this.router.get('/:id', util_1.asyncMiddleware(this.getById));
        this.router.get('/:id/table', requireAuth, util_1.asyncMiddleware(this.getSavedTable));
        this.router.put('/:id/table', requireAuth, util_1.asyncMiddleware(this.updateSavedTable));
        this.router.post('/', celebrate_1.celebrate(validationSchemas_1.createNew), util_1.asyncMiddleware(this.createNew));
        this.router.post('/sign-in', celebrate_1.celebrate(validationSchemas_1.signIn), util_1.asyncMiddleware(this.signIn));
        this.router.post('/verify-email', celebrate_1.celebrate(validationSchemas_1.verifyEmail), util_1.asyncMiddleware(this.verifyEmail));
        this.router.post('/forgot-password', celebrate_1.celebrate(validationSchemas_1.forgotPassword), util_1.asyncMiddleware(this.forgotPassword));
        this.router.post('/reset-password', celebrate_1.celebrate(validationSchemas_1.resetPassword), util_1.asyncMiddleware(this.resetPassword));
        this.router.put('/:id', util_1.asyncMiddleware(this.updateById));
        this.router.delete('/:id', util_1.asyncMiddleware(this.deleteById));
    }
}
exports.default = UserRouter;
