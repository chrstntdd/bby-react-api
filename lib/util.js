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
const boom = require("boom");
const crypto_1 = require("crypto");
const nodemailer = require("nodemailer");
const smtpTransport = require("nodemailer-smtp-transport");
const jsonwebtoken_1 = require("jsonwebtoken");
require('dotenv').config();
const JWT_SECRET = process.env.JWT_SECRET;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const SMTP_URL = process.env.SMTP_URL;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
exports.transporter = nodemailer.createTransport(smtpTransport({
    service: 'gmail',
    tls: {
        rejectUnauthorized: false
    },
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
    }
}));
exports.sendEmailAsync = emailData => new Promise((resolve, reject) => {
    exports.transporter.sendMail(emailData, err => {
        err ? reject(err) : resolve(emailData);
    });
});
exports.verifySMTP = () => new Promise((resolve, reject) => {
    exports.transporter.verify((error, success) => (error ? reject(error) : resolve(success)));
});
exports.generateJWT = user => jsonwebtoken_1.sign(user, JWT_SECRET, { expiresIn: '2h' });
exports.setUserInfo = ({ _id, email, profile, role, isVerified }) => ({
    email,
    role,
    isVerified,
    id: _id,
    firstName: profile.firstName,
    lastName: profile.lastName
});
exports.asyncMiddleware = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(err => {
    if (err.isBoom) {
        return next(err);
    }
    return next(boom.badImplementation(err));
});
exports.genToken = (size) => __awaiter(this, void 0, void 0, function* () {
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
