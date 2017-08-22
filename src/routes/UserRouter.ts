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
const FROM_EMAIL = process.env.FROM_EMAIL;
const SMTP_URL = process.env.SMTP_URL;
const CLIENT_URL = process.env.CLIENT_URL;

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

/* In our use case the function it will take is an express route handler, 
 * and since we are passing that handler into Promise.resolve it will
 * resolve with whatever value our route handler returns. If, however,
 * one of the await statements in our handler gives us a rejected promise,
 * it will go into the .catch on line 4 and be passed to next which will
 * eventually give the error to our express error middleware to handle. 
 */
const asyncMiddleware = fn => (
  req: Request,
  res: Response,
  next?: NextFunction
): Promise<any> => Promise.resolve(fn(req, res, next)).catch(next);

/* generate a verify token for the user */
const genToken = async (size): Promise<any> => {
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

/* Passport middleware */
const passport = require('passport');
const passportService = require('../config/passport');

const requireAuth = passport.authenticate('jwt', { session: false });

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
  public async getAll(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<any> {
    let allUsers;
    allUsers = await User.find();
    allUsers === null
      ? res.status(404).json({ error: 'There are no users' })
      : res.json(allUsers);
  }

  /* get single user by id */
  public async getById(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<any> {
    let user;

    user = await User.findById(req.params.id);
    user === null
      ? res.status(404).json({
          error: `The user with the id ${req.params.id} can't be found`
        })
      : res.json(user);
  }

  /* Sign in handler*/
  public async signIn(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<any> {
    // * Sanitize and validate input */
    req.checkBody('email', 'Please enter a valid email address').isEmail();
    req.checkBody('email', 'Please enter an email').notEmpty();

    req.checkBody('password', 'Please enter a password.').notEmpty();
    req.checkBody('password', 'Please enter a valid password').isAlpha();

    req.sanitizeBody('email').normalizeEmail({
      all_lowercase: true
    });
    req.sanitizeBody('email').escape();
    req.sanitizeBody('email').trim();
    req.sanitizeBody('password').escape();
    req.sanitizeBody('password').trim();

    const cleanEmail = req.body.email;
    const cleanPassword = req.body.password;

    const validationResult = await req.getValidationResult();

    if (!validationResult.isEmpty()) {
      const validationErrors = [];
      validationResult.array().forEach(error => validationErrors.push(error));
      return res.status(400).json({ validationErrors });
    }

    const existingUser = await User.findOne({ email: cleanEmail });
    if (!existingUser) {
      return res.status(400).json({
        emailMessage:
          "We can't seem to find an account registered with that id. Please try again"
      });
    }
    /* if the existingUser has an account, but has yet to verify their email */
    if (!existingUser.isVerified) {
      return res.status(400).json({
        verifyMessage: 'Please verify your email before using this service.'
      });
    }

    existingUser.comparePassword(cleanPassword, (err, isMatch) => {
      /* if there was an error */
      if (err) {
        return next(err);
      }
      /* if the supplied password param doesn't match the db password */
      if (!isMatch) {
        return res.status(400).json({
          passwordMessage: 'Your password looks a bit off. Please try again.'
        });
      }

      /* return the user successfully after  generating a JWT for 
       * client authentication
       */
      const userInfo = setUserInfo(existingUser);
      return res.status(200).json({
        token: `JWT ${generateJWT(userInfo)}`,
        user: userInfo
      });
    });
  }

  /* create a new user (Register) */
  public async createNew(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<any> {
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
    const validationResult = await req.getValidationResult();
    if (!validationResult.isEmpty()) {
      return res.status(406).json({
        status: res.status,
        messages: validationResult.array()
      });
    }

    /* await the call to check if the user exists already */
    let existingUser;
    existingUser = await User.findOne({ email });

    /* if the user already has an account registered with their employee id */
    if (existingUser) {
      return res.status(409).json({
        status: res.status,
        message:
          'Sorry, it looks as if there is already an account associated with that employee number'
      });
    } else {
      /* create a new user */
      const newUser = await new User({
        email,
        employeeNumber,
        password,
        storeNumber,
        confirmationEmailToken: await genToken(24),
        profile: { firstName, lastName }
      }).save();
      const emailData = {
        to: newUser.email,
        from: FROM_EMAIL,
        subject: 'Quantified Account Confirmation',
        text:
          'You are receiving this because you (or someone else) have requested an account with Quantified.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          `${CLIENT_URL}/confirm-email/${newUser.confirmationEmailToken}\n\n` +
          `If you did not request this, please ignore this email.\n`
      };
      /* don't send a confirmation email when testing / development, but return the same result */
      if (process.env.NODE_ENV === 'development') {
        res.status(201).json({
          newUser,
          message:
            'Your account has been created, now please check your work email to confirm your account.',
          status: res.status
        });
      } else {
        await transporter.sendMail(emailData);

        res.status(201).json({
          newUser,
          message:
            'Your account has been created, now please check your work email to confirm your account.',
          status: res.status
        });
      }
    }
  }

  /* delete an existing user by the id params */
  public async deleteById(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<any> {
    let userToDelete;
    userToDelete = await User.findByIdAndRemove(req.params.id);
    userToDelete === null
      ? res.status(404).json({
          error: `We cant find the user you\'re trying to delete 😐 `
        })
      : res.status(202).json({
          message: `${userToDelete.profile.firstName} ${userToDelete.profile
            .lastName} has been removed.`
        });
  }

  /* update an existing user by the id params */
  public async updateById(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<any> {
    /* get user that will be updated */
    const userToUpdate = await User.findById(req.params.id);

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
    const fieldsRequestedToUpdate = Object.keys(req.body);
    const errors = immutableFields.filter(field =>
      fieldsRequestedToUpdate.includes(field)
    );

    /* If there are errors, respond with an error else, accumulate new user
       * object with props sent in from the request body and set on user & save
       */
    if (errors.length > 0) {
      res.status(401).json({
        message: "You can't update those fields, brother"
      });
    } else {
      mutableFields.forEach(field => {
        if (field in req.body) {
          updated[field] = req.body[field];
        }
      });

      let updatedUser;
      updatedUser = await User.update(
        req.params.id,
        { $set: updated },
        { new: true }
      );

      userToUpdate === null
        ? res.status(404).json({
            error: 'Whom are you looking for anyway my guy?'
          })
        : res.status(201).json({
            message: `${userToUpdate.profile.firstName} ${userToUpdate.profile
              .lastName} has updated their account`
          });
    }
  }

  /* verify an existing users account */
  public async verifyEmail(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<any> {
    const existingUser = await User.findOne({
      confirmationEmailToken: req.params.token
    });

    if (!existingUser) {
      res.status(422).json({
        status: res.status,
        message: 'Account not found'
      });
    } else {
      /* if a user is found, flip the verified flag, save the document, and set auth headers */
      existingUser.isVerified = true;

      const updatedUser = await existingUser.save();
      const userInfo = setUserInfo(updatedUser);
      res.status(200).json({
        token: `JWT ${generateJWT(userInfo)}`,
        user: userInfo
      });
    }
  }

  /* forgot password handler for existing users */
  public async forgotPassword(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<any> {
    /* Sanitize and validate input */
    req.checkBody('email', 'Please enter a valid email address').isEmail();
    req.checkBody('email', 'Please enter an email').notEmpty();

    req.sanitizeBody('email').escape();
    req.sanitizeBody('email').trim();

    /* Assign valid and sanitized input to a variable for use */
    const cleanEmail: string = req.body.email;

    /* Accumulate errors in result and return errors if so */
    const validationResult = await req.getValidationResult();

    if (!validationResult.isEmpty()) {
      const validationErrors = [];
      validationResult.array().forEach(error => validationErrors.push(error));
      res.status(400).json({ validationErrors });
    } else {
      /* get existing user */
      let existingUser;
      existingUser = await User.findOne({ email: cleanEmail });

      if (existingUser === null) {
        res
          .status(404)
          .json({ error: "We can't find the user you're looking for" });
      } else {
        /* set the token and expiration time */
        const resetPasswordToken = await genToken(24);
        existingUser.resetPasswordToken = resetPasswordToken;
        existingUser.resetPasswordExpires = Date.now() + 3600000; /* 1 Hour */

        await existingUser.save();

        const emailData = {
          to: existingUser.email,
          from: FROM_EMAIL,
          subject: 'Quantified Password Reset',
          text:
            'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
            `${CLIENT_URL}/reset-password/${resetPasswordToken}\n\n` +
            `If you did not request this, please ignore this email and your password will remain unchanged.\n`
        };

        if (process.env.NODE_ENV === 'production') {
          await transporter.sendMail(emailData);
          res.status(200).json({
            message:
              'Thank you. Please check your work email for a message containing the link to reset your password.'
          });
        } else {
          res.status(200).json({
            message:
              'Thank you. Please check your work email for a message containing the link to reset your password.'
          });
        }
      }
    }
  }

  /* reset password handler for existing users */
  public async resetPassword(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<any> {
    const existingUser = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!existingUser) {
      res.status(422).json({
        message:
          'Whoops! It looks like your reset token has already expired. Please try to reset your password again.'
      });
    } else {
      /* Sanitize password */
      req.sanitizeBody('password').escape();
      req.sanitizeBody('password').trim();

      /* Assign sanitized password to variable */
      const newPassword = req.body.password;

      /* save the new password and clear the reset token in DB */
      existingUser.password = newPassword;
      existingUser.resetPasswordToken = undefined;
      existingUser.resetPasswordExpires = undefined;

      await existingUser.save();

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
      if (process.env.NODE_ENV !== 'production') {
        res.status(200).json({
          message: 'Your password has been changed successfully'
        });
      } else {
        await transporter.sendMail(emailData);
        res.status(200).json({
          message: 'Your password has been changed successfully'
        });
      }
    }
  }

  /* attach route handlers to their endpoints */
  private init(): void {
    this.router.get('/', asyncMiddleware(this.getAll));
    this.router.get('/:id', asyncMiddleware(this.getById));
    this.router.post('/', asyncMiddleware(this.createNew));
    this.router.post('/sign-in', asyncMiddleware(this.signIn));
    this.router.post('/verify-email/:token', asyncMiddleware(this.verifyEmail));
    this.router.post('/forgot-password', asyncMiddleware(this.forgotPassword));
    this.router.post(
      '/reset-password/:token',
      asyncMiddleware(this.resetPassword)
    );
    this.router.put('/:id', asyncMiddleware(this.updateById));
    this.router.delete('/:id', asyncMiddleware(this.deleteById));
  }
}
