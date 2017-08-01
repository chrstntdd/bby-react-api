// @flow

require('dotenv').config();

import type { $Request, $Response, $NextFunction } from 'express';
import { Router } from 'express';
import { User } from '../models/user';
import { sign } from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { createTransport } from 'nodemailer';

/* Constants */
const JWT_SECRET = process.env.JWT_SECRET;
const SMTP_URL = process.env.SMTP_URL;
const FROM_EMAIL = process.env.FROM_EMAIL;

/* Utility functions */
const generateJWT = user => sign(user, JWT_SECRET, { expiresIn: '2h' });

const setUserInfo = req => ({
  _id: req._id,
  firstName: req.profile.firstName,
  lastName: req.profile.lastName,
  email: req.email,
  role: req.role
});

/* Passport middleware */
const passport = require('passport');
const passportService = require('../config/passport');

const requireAuth = passport.authenticate('jwt', { session: false });
const requireLogin = passport.authenticate('local', { session: false });

/* 
*
* Main user router class
*
*/

export default class UserRouter {
  router: Router;
  path: String;

  constructor(path = '/api/v1/users') {
    this.router = Router();
    this.path = path;
    this.init();
  }

  /* 
  * Controllers for users
  * CRUD thru n thru
  */

  /* return all users */
  getAll(req: $Request, res: $Response): void {
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

  /* get single user by id */
  getById(req: $Request, res: $Response): void {
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

  /* Sign in handler*/
  signIn(req: $Request, res: $Response, next: $NextFunction): void {
    /* Sanitize and validate input */
    req.checkBody('email', 'Please enter a valid email address').isEmail();
    req.checkBody('email', 'Please enter an email').notEmpty();

    req.sanitizeBody('email').escape();
    req.sanitizeBody('email').trim();

    /* Assign valid and sanitized input to a variable for use */
    const email = req.body.email;

    /* Accumulate errors in result and return errors if so */
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
      if (err) return next(err);
      if (existingUser) {
        /* errors are handles within the passport.js config */

        /* grab data from user response to set in JWT */
        const userInfo = {
          email: existingUser.email,
          firstName: existingUser.profile.firstName,
          lastName: existingUser.profile.lastName,
          role: existingUser.role
        };

        return res.status(200).json({
          token: `JWT ${generateJWT(userInfo)}`,
          user: userInfo
        });
      }
    });
  }

  /* create a new user (Register) */
  createNew(req: $Request, res: $Response, next: $NextFunction): void {
    /* Validation stack. Prepare yourself */
    /* No need to validate the email since it's generated on the server from the employee number */

    req.checkBody('firstName', 'Please enter your first name').notEmpty();
    req
      .checkBody(
        'firstName',
        'Only letters are allowed for names. Try again please.'
      )
      .isAlpha();

    req.checkBody('lastName', 'Please enter your last name').notEmpty();
    req
      .checkBody(
        'lastName',
        'Only letters are allowed for names. Try again please.'
      )
      .isAlpha();

    req.checkBody('password', 'Please enter in a password').notEmpty();
    req
      .checkBody(
        'password',
        'Your password should only contain alphanumeric characters'
      )
      .isAlphanumeric();

    req
      .checkBody('employeeNumber', 'Please enter your employee number')
      .notEmpty();
    req
      .checkBody(
        'employeeNumber',
        'Your employee number should be in the format <LETTER><NUMBERiD>'
      )
      .isAlphanumeric();

    req.checkBody('storeNumber', 'Please enter your store number').notEmpty();
    req.checkBody('storeNumber', 'Please enter a valid store number').isInt();

    /* Time to sanitize! */

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

    /* Assign validated and sanitized inputs to variables for later use */
    const email = `${req.body.employeeNumber}@bestbuy.com`;
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const password = req.body.password;
    const employeeNumber = req.body.employeeNumber;
    const storeNumber = req.body.storeNumber;

    /* Accumulate errors in result and return error if so */
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

      /* if the user already has an account registered with their employee id */
      if (existingUser) {
        return res.status(409).json({
          status: res.status,
          message:
            'Sorry, it looks as if there is already an account associated with that employee number'
        });
      }

      /* generate a verify token for the user */
      randomBytes(24, (err, buffer) => {
        if (err) {
          return next(err);
        }
        const verifyToken = buffer.toString('hex');
        /* create a new user since an existing one wasn't found */
        let user = new User({
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
          const transporter = createTransport(SMTP_URL);
          const emailData = {
            to: user.email,
            from: FROM_EMAIL,
            subject: 'Quantified Account Confirmation',
            text:
              `${'You are receiving this because you (or someone else) have requested an account with Quantified.\n\n' +
                'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                'http://'}${req.headers
                .host}/confirm-email/${verifyToken}\n\n` +
              `If you did not request this, please ignore this email.\n`
          };
          /* don't send a confirmation email when testing, but return the same result */
          if (process.env.NODE_ENV === 'test') {
            return res.status(201).json({
              message:
                'Your account has been created, now please check your work email to confirm your account.',
              status: res.status
            });
          } else {
            transporter.sendMail(emailData);
            return res.status(201).json({
              message:
                'Your account has been created, now please check your work email to confirm your account.',
              status: res.status
            });
          }
        });
      });
    });
  }

  /* delete an existing user by the id params */
  deleteById(req: $Request, res: $Response): void {
    User.findByIdAndRemove(req.params.id)
      .then(userObject => {
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

  /* update an existing user by the id params */
  updateById(req: $Request, res: $Response): void {
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

    /* Check that the user isn't submitting update params that are restricted */
    immutableFields.forEach(field => {
      if (field in req.body) {
        return res.status(401).json({
          status: res.status,
          message: "Sorry, you can't update those settings on your account"
        });
      }
    });

    /* Accumulates new user object with props send in from the request body */
    mutableFields.forEach(field => {
      if (field in req.body) {
        updated[field] = req.body[field];
      }
    });

    User.findByIdAndUpdate(req.params.id, { $set: updated }, { new: true })
      .exec()
      .then(userObject => {
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

  /* attach route handlers to their endpoints */
  init(): void {
    this.router.get('/', this.getAll);
    this.router.get('/:id', this.getById);
    this.router.post('/', this.createNew);
    this.router.post('/sign-in', this.signIn, requireLogin);
    this.router.put('/:id', this.updateById);
    this.router.delete('/:id', this.deleteById);
  }
}
