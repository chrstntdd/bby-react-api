import { ValidationSchema } from 'express-validator';
require('dotenv').config();

import { Router, Request, Response, NextFunction } from 'express';
// tslint:disable-next-line:import-name
import User = require('../models/user');
import { sign } from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import * as nodemailer from 'nodemailer';

/* Interfaces */
import { IError, MappedError, IUser } from '../interfaces/index';

/* Constants */
const JWT_SECRET = process.env.JWT_SECRET;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL;
const SMTP_URL = process.env.SMTP_URL;

const transporter = nodemailer.createTransport(SMTP_URL);

/* Utility functions */
const generateJWT = user => sign(user, JWT_SECRET, { expiresIn: '2h' });

const setUserInfo = user => ({
  id: user._id,
  email: user.email,
  firstName: user.profile.firstName,
  lastName: user.profile.lastName,
  role: user.role,
  isVerified: user.isVerified,
  tables: user.tableData.tables.map(table => table.id)
});

/* Passport middleware */
const passport = require('passport');
const passportService = require('../config/passport');

const requireAuth = passport.authenticate('jwt', { session: false });
const requireLogin = passport.authenticate('local', { session: false });

/* 
*
* Main user router class
* @path = /api/v1/users
*/

export default class UserRouter {
  router: Router;
  path: any;

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
  public getAll(req: Request, res: Response, next?: NextFunction): void {
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
  public getById(req: Request, res: Response, next?: NextFunction): void {
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
  public signIn(req: Request, res: Response, next?: NextFunction): void {
    /* returned from passport */
    const passportResponse = req.user;

    if (Object.keys(passportResponse).includes('passportError')) {
      const { passportError } = passportResponse;
      res.status(400).json({
        /* passport validation errors */
        passportError
      });
    } else if (Object.keys(passportResponse).includes('validationErrors')) {
      const { validationErrors } = passportResponse;
      res.status(406).json({
        /* express validation errors */
        validationErrors
      });
    } else {
      const userInfo = setUserInfo(passportResponse);
      res.status(200).json({
        token: `JWT ${generateJWT(userInfo)}`,
        user: userInfo
      });
    }
  }

  /* create a new user (Register) */
  public createNew(req: Request, res: Response, next?: NextFunction): void {
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
        const user = new User({
          email,
          employeeNumber,
          password,
          storeNumber,
          confirmationEmailToken: verifyToken,
          profile: { firstName, lastName }
        });

        user.save((err, user) => {
          if (err) {
            return next(err);
          }

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
          /* don't send a confirmation email when testing / development, but return the same result */
          if (
            process.env.NODE_ENV === 'test' ||
            process.env.NODE_ENV === 'development'
          ) {
            return res.status(201).json({
              user,
              message:
                'Your account has been created, now please check your work email to confirm your account.',
              status: res.status
            });
          } else {
            transporter.sendMail(emailData, (error, info) => {
              error
                ? console.log(error)
                : res.status(201).json({
                    user,
                    message:
                      'Your account has been created, now please check your work email to confirm your account.',
                    status: res.status
                  });
            });
          }
        });
      });
    });
  }

  /* delete an existing user by the id params */
  public deleteById(req: Request, res: Response, next?: NextFunction): void {
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

  /* update an existing user by the id params */
  public updateById(req: Request, res: Response, next?: NextFunction): void {
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

  /* verify an existing users account */
  public verifyEmail(req: Request, res: Response, next?: NextFunction): void {
    User.findOne(
      { confirmationEmailToken: req.params.token },
      (err, existingUser) => {
        if (!existingUser) {
          return res.status(422).json({
            status: res.status,
            message: 'Account not found'
          });
        } else {
          /* if a user is found, flip the verified flag and set auth headers */
          existingUser.isVerified = true;
          existingUser.save(err => {
            if (err) return next(err);
            const userInfo = setUserInfo(existingUser);
            return res.status(200).json({
              token: `JWT ${generateJWT(userInfo)}`,
              user: userInfo
            });
          });
        }
      }
    );
  }

  /* forgot password handler for existing users */
  public forgotPassword(
    req: Request,
    res: Response,
    next?: NextFunction
  ): void {
    /* Sanitize and validate input */
    req.checkBody('email', 'Please enter a valid email address').isEmail();
    req.checkBody('email', 'Please enter an email').notEmpty();

    req.sanitizeBody('email').escape();
    req.sanitizeBody('email').trim();

    /* Assign valid and sanitized input to a variable for use */
    const email: string = req.body.email;

    const errors: IError = { status: 406, messages: [] };

    /* Accumulate errors in result and return errors if so */
    req.getValidationResult().then(result => {
      if (!result.isEmpty()) {
        errors.messages = result.array();
      }
    });

    User.findOne({ email }, (err, existingUser) => {
      if (err) return next(err);

      /* if there is no user found or errors */
      if (existingUser === null || errors.messages.length > 0) {
        return res
          .status(errors.messages.length > 0 ? errors.status : 422)
          .json({
            status: errors.messages.length > 0 ? errors.status : 422,
            messages:
              errors.messages.length > 0
                ? errors.messages
                : "There doesn't seem to be an account associated with that email. Please try again."
          });
      }

      /* if a user is found, generate a token for resetting their password */
      randomBytes(24, (err, buffer) => {
        const resetToken = buffer.toString('hex');
        if (err) return next(err);

        existingUser.resetPasswordToken = resetToken;
        existingUser.resetPasswordExpires = Date.now() + 3600000; /* 1 hour */

        existingUser.save(err => {
          if (err) return err;
          const emailData = {
            to: existingUser.email,
            from: FROM_EMAIL,
            subject: 'Quantified Password Reset',
            text:
              `${'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
                'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                'http://'}${req.headers
                .host}/reset-password/${resetToken}\n\n` +
              `If you did not request this, please ignore this email and your password will remain unchanged.\n`
          };
          /* don't send email when testing / development, but return the same result */
          if (
            process.env.NODE_ENV === 'test' ||
            process.env.NODE_ENV === 'development'
          ) {
            return res.status(200).json({
              resetToken,
              status: res.status,
              message:
                'Thank you. Please check your work email for a message containing the link to reset your password.'
            });
          } else {
            transporter.sendMail(emailData);
            return res.status(200).json({
              resetToken,
              status: res.status,
              message:
                'Thank you. Please check your work email for a message containing the link to reset your password.'
            });
          }
        });
      });
    });
  }

  /* reset password handler for existing users */
  public resetPassword(req: Request, res: Response, next?: NextFunction): void {
    User.findOne(
      {
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }
      },
      (err, existingUser) => {
        if (!existingUser) {
          return res.status(422).json({
            status: res.status,
            message:
              'Whoops! It looks like your reset token has already expired. Please try to reset your password again.'
          });
        }

        /* Sanitize password */
        req.sanitizeBody('password').escape();
        req.sanitizeBody('password').trim();

        /* Assign sanitized password to variable */
        const newPassword = req.body.password;

        /* save the new password and clear the reset token in DB */
        existingUser.password = newPassword;
        existingUser.resetPasswordToken = undefined;
        existingUser.resetPasswordExpires = undefined;

        existingUser.save(err => {
          if (err) return next(err);

          /* if password reset is successful, alert via email */
          const emailData = {
            to: existingUser.email,
            from: FROM_EMAIL,
            subject: 'Your Quantified password has been reset',
            text:
              'You are receiving this email because you changed your password. \n\n' +
              'If you did not request this change, please contact us immediately.'
          };

          /* when testing / development, don't send a confirmation email */
          if (
            process.env.NODE_ENV === 'test' ||
            process.env.NODE_ENV === 'development'
          ) {
            return res.status(200).json({
              status: res.status,
              message: 'Your password has been changed successfully'
            });
          } else {
            transporter.sendMail(emailData);
            return res.status(200).json({
              status: res.status,
              message: 'Your password has been changed successfully'
            });
          }
        });
      }
    );
  }

  /* attach route handlers to their endpoints */
  private init(): void {
    this.router.get('/', this.getAll);
    this.router.get('/:id', this.getById);
    this.router.post('/', this.createNew);
    this.router.post('/sign-in', requireLogin, this.signIn);
    this.router.post('/verify-email/:token', this.verifyEmail);
    this.router.post('/forgot-password', this.forgotPassword);
    this.router.post('/reset-password/:token', this.resetPassword);
    this.router.put('/:id', this.updateById);
    this.router.delete('/:id', this.deleteById);
  }
}
