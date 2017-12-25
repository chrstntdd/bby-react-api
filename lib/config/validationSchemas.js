"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const celebrate_1 = require("celebrate");
const password = celebrate_1.Joi.string()
    .required()
    .alphanum()
    .min(6, 'utf-8')
    .max(36, 'utf-8');
const email = celebrate_1.Joi.string()
    .email()
    .required();
const name = celebrate_1.Joi.string()
    .alphanum()
    .required();
const storeNumber = celebrate_1.Joi.number()
    .integer()
    .min(1)
    .max(3000)
    .required();
const employeeNumber = celebrate_1.Joi.string()
    .regex(/^[a-zA-Z]\d+/gi, 'employeeNumber')
    .min(2, 'utf-8')
    .max(16, 'utf-8')
    .required();
const token = celebrate_1.Joi.string()
    .alphanum()
    .required();
const upc = celebrate_1.Joi.string().length(12);
exports.signIn = {
    body: celebrate_1.Joi.object().keys({
        email,
        password
    })
};
exports.createNew = {
    body: celebrate_1.Joi.object().keys({
        firstName: name,
        lastName: name,
        password,
        employeeNumber,
        storeNumber
    })
};
exports.forgotPassword = {
    body: celebrate_1.Joi.object().keys({
        employeeNumber
    })
};
exports.resetPassword = {
    body: celebrate_1.Joi.object().keys({
        password
    }),
    query: celebrate_1.Joi.object().keys({
        token
    })
};
exports.verifyEmail = {
    query: celebrate_1.Joi.object().keys({
        token
    })
};
exports.getByUPC = {
    body: celebrate_1.Joi.object().keys({
        upc
    })
};
