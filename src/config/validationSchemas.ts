import { Joi } from 'celebrate';

/* All exported objects are schemas to validate payloads expected from various endpoints. 
 * Having the schemas defined here allows the routes to be a bit more terse and abstracts away validation.
 */

const password = Joi.string()
  .required()
  .alphanum()
  .min(6, 'utf-8')
  .max(36, 'utf-8');

const email = Joi.string()
  .email()
  .required();

const name = Joi.string()
  .alphanum()
  .required();

const storeNumber = Joi.number()
  .integer()
  .min(1)
  .max(3000)
  .required();

const employeeNumber = Joi.string()
  .regex(/^[a-zA-Z]\d+/gi, 'employeeNumber')
  .min(2, 'utf-8')
  .max(16, 'utf-8')
  .required();

const token = Joi.string()
  .alphanum()
  .required();

const upc = Joi.string().length(12);

/* Below are the validation schemas for each corresponding route */

export const signIn = {
  body: Joi.object().keys({
    email,
    password
  })
};

export const createNew = {
  body: Joi.object().keys({
    firstName: name,
    lastName: name,
    password,
    employeeNumber,
    storeNumber
  })
};

export const forgotPassword = {
  body: Joi.object().keys({
    employeeNumber
  })
};

export const resetPassword = {
  body: Joi.object().keys({
    password
  }),
  query: Joi.object().keys({
    token
  })
};

export const verifyEmail = {
  query: Joi.object().keys({
    token
  })
};

export const getByUPC = {
  body: Joi.object().keys({
    upc
  })
};
