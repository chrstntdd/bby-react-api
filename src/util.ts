import * as boom from 'boom';
import { randomBytes } from 'crypto';
import * as nodemailer from 'nodemailer';
import * as smtpTransport from 'nodemailer-smtp-transport';
import { sign } from 'jsonwebtoken';
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const SMTP_URL = process.env.SMTP_URL;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export const transporter = nodemailer.createTransport(
  smtpTransport({
    service: 'gmail',
    tls: {
      rejectUnauthorized: false
    },
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS
    }
  })
);

export const sendEmailAsync = emailData =>
  new Promise((resolve, reject) => {
    transporter.sendMail(emailData, err => {
      err ? reject(err) : resolve(emailData);
    });
  });

export const verifySMTP = () =>
  new Promise((resolve, reject) => {
    transporter.verify(
      (error, success) => (error ? reject(error) : resolve(success))
    );
  });

export const generateJWT = user => sign(user, JWT_SECRET, { expiresIn: '2h' });

export const setUserInfo = ({ _id, email, profile, role, isVerified }) => ({
  email,
  role,
  isVerified,
  id: _id,
  firstName: profile.firstName,
  lastName: profile.lastName
});

/* In our use case the function it will take is an express route handler,
 * and since we are passing that handler into Promise.resolve it will
 * resolve with whatever value our route handler returns. If, however,
 * one of the await statements in our handler gives us a rejected promise,
 * it will go into the .catch on line 4 and be passed to next which will
 * eventually give the error to our express error middleware to handle.
 */
export const asyncMiddleware = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(err => {
    if (err.isBoom) {
      return next(err);
    }
    return next(boom.badImplementation(err));
  });

/* generate a verify token for the user */
export const genToken = async (size): Promise<any> => {
  return await new Promise((resolve, reject) => {
    randomBytes(size, (err, buffer) => {
      if (buffer) {
        resolve(buffer.toString('hex'));
      }
      if (err) {
        reject(err);
      }
    });
  });
};
