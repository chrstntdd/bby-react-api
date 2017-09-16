require('dotenv').config();
import { ValidationSchema } from 'express-validator';
import { Router, Request, Response, NextFunction } from 'express';
import User = require('../models/user');
import { sign } from 'jsonwebtoken';
import { randomBytes } from 'crypto';

/* Interfaces */
import { MappedError, IUser } from '../interfaces/index';

/* Constants */
const JWT_SECRET = process.env.JWT_SECRET;
const CLIENT_URL = process.env.CLIENT_URL;

/* EMAIL CONFIG */
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/* Passport middleware */
const passport = require('passport');
const passportService = require('../config/passport');
const requireAuth = passport.authenticate('jwt', { session: false });

/* Utility functions */
const generateJWT = user => sign(user, JWT_SECRET, { expiresIn: '2h' });

const setUserInfo = user => ({
  id: user._id,
  email: user.email,
  firstName: user.profile.firstName,
  lastName: user.profile.lastName,
  role: user.role,
  isVerified: user.isVerified
});

/* In our use case the function it will take is an express route handler,
 * and since we are passing that handler into Promise.resolve it will
 * resolve with whatever value our route handler returns. If, however,
 * one of the await statements in our handler gives us a rejected promise,
 * it will go into the .catch on line 4 and be passed to next which will
 * eventually give the error to our express error middleware to handle.
 */
export const asyncMiddleware = fn => (
  req: Request,
  res: Response,
  next?: NextFunction
): Promise<void> => Promise.resolve(fn(req, res, next)).catch(next);

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

/*
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

  /* return all users */
  public async getAll(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void> {
    const allUsers = await User.find();
    !allUsers
      ? res.status(404).json({ error: 'There are no users' })
      : res.json(allUsers);
  }

  /* get single user by id */
  public async getById(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void> {
    const user = await User.findById(req.params.id);
    !user
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
    /* Sanitize and validate input */
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
    const {
      firstName,
      lastName,
      password,
      employeeNumber,
      storeNumber
    } = req.body;
    const email = `${employeeNumber}@bestbuy.com`;

    /* Accumulate errors in result and return error if so */
    const validationResult = await req.getValidationResult();
    if (!validationResult.isEmpty()) {
      return res.status(406).json({
        status: res.status,
        messages: validationResult.array()
      });
    }

    /* await the call to check if the user exists already */
    const existingUser = await User.findOne({ email });

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
        from: 'noreply@quantified',
        subject: 'Quantified Account Confirmation',
        text:
          'You are receiving this because you (or someone else) have requested an account with Quantified.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          `${CLIENT_URL}/confirm-email/${newUser.confirmationEmailToken}\n\n` +
          `If you did not request this, please ignore this email.\n`
      };
      /* don't send a confirmation email when testing, but return the same result */
      if (process.env.NODE_ENV === 'test') {
        res.status(201).json({
          message:
            'Your account has been created, now please check your work email to confirm your account.'
        });
      } else {
        try {
          await sgMail.send(emailData);
          res.status(201).json({
            message:
              'Thank you for signing up! Your account has been created, now please check your work email to confirm your account.'
          });
        } catch (error) {
          console.error(error.toString());

          // Extract error msg
          const { message, code, response } = error;

          // Extract response msg
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

  /* delete an existing user by the id params */
  public async deleteById(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void> {
    const userToDelete = await User.findByIdAndRemove(req.params.id);

    if (!userToDelete) {
      res.status(404).json({
        error: `We cant find the user you\'re trying to delete 😐 `
      });
    } else {
      const { firstName, lastName } = userToDelete.profile;
      res.status(202).json({
        message: `${firstName} ${lastName} has been removed.`
      });
    }
  }

  /* update an existing user by the id params */
  public async updateById(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void> {
    /* get user that will be updated */
    const userToUpdate = await User.findById(req.params.id);

    if (!userToUpdate) {
      res.status(404).json({
        error: 'Whom are you looking for anyway my guy?'
      });
    } else {
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

        res.status(201).json({
          message: `${firstName} ${lastName} has updated their account`
        });
      }
    }
  }

  /* verify an existing users account */
  public async verifyEmail(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void> {
    req.sanitizeParams('token').trim();
    req.sanitizeParams('token').escape();

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
  ): Promise<void> {
    /* Sanitize and validate input */
    req
      .checkBody('employeeNumber', 'Please enter your employee number')
      .notEmpty();
    req
      .checkBody(
        'employeeNumber',
        'Your employee number should be in the format <LETTER><NUMBERiD>'
      )
      .isAlphanumeric();

    req.sanitizeBody('employeeNumber').escape();
    req.sanitizeBody('employeeNumber').trim();

    /* Assign valid and sanitized input to a variable for use */
    /* ACTUALLY COMING IN AS THE EMPLOYEE NUMBER */
    const cleanEmployeeNumber: string = req.body.employeeNumber;

    /* Accumulate errors in result and return errors if so */
    const validationResult = await req.getValidationResult();

    if (!validationResult.isEmpty()) {
      const validationErrors = [];
      validationResult.array().forEach(error => validationErrors.push(error));
      res.status(400).json({ validationErrors });
    } else {
      /* get existing user */
      const existingUser = await User.findOne({
        employeeNumber: cleanEmployeeNumber
      });

      if (!existingUser) {
        res.status(404).json({
          error:
            "We can't find an account associated with that employee number. Please try again."
        });
      } else {
        /* set the token and expiration time */
        const resetPasswordToken = await genToken(24);
        existingUser.resetPasswordToken = resetPasswordToken;
        existingUser.resetPasswordExpires = Date.now() + 3600000; /* 1 Hour */

        await existingUser.save();

        const emailData = {
          to: existingUser.email,
          from: 'noreply@quantified',
          subject: 'Quantified Password Reset',
          text:
            'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
            `${CLIENT_URL}/reset-password/${resetPasswordToken}\n\n` +
            `If you did not request this, please ignore this email and your password will remain unchanged.\n`
        };

        if (process.env.NODE_ENV === 'test') {
          res.status(200).json({
            resetToken: resetPasswordToken,
            message:
              'Thank you. Please check your work email for a message containing the link to reset your password.'
          });
        } else {
          try {
            await sgMail.send(emailData);
            res.status(200).json({
              resetToken: resetPasswordToken,
              message:
                'Thank you. Please check your work email for a message containing the link to reset your password.'
            });
          } catch (error) {
            console.error(error.toString());

            // Extract error msg
            const { message, code, response } = error;

            // Extract response msg
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
  }

  /* reset password handler for existing users */
  public async resetPassword(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void> {
    const existingUser = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!existingUser) {
      res.status(400).json({
        error:
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
        from: 'noreply@quantified',
        subject: 'Your Quantified password has been reset',
        text:
          'You are receiving this email because you changed your password. \n\n' +
          'If you did not request this change, please contact us immediately.'
      };

      /* when testing, don't send a confirmation email */

      if (process.env.NODE_ENV === 'test') {
        res.status(200).json({
          message: 'Your password has been changed successfully'
        });
      } else {
        try {
          await sgMail.send(emailData);
          res.status(200).json({
            message: 'Your password has been changed successfully'
          });
        } catch (error) {
          console.error(error.toString());

          // Extract error msg
          const { message, code, response } = error;

          // Extract response msg
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

  public async getSavedTable(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void> {
    const userId = req.params.id;
    const user = await User.findById(userId);
    !user
      ? res.status(404).json({
          error: "Can't seem to find those products you were looking for"
        })
      : res.status(200).json({
          products: user.tableData.products
        });
  }

  public async updateSavedTable(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void> {
    const { currentTableState } = req.body;
    const userId = req.params.id;

    const updatedUser = await User.findOneAndUpdate(
      { _id: userId },
      { $set: { 'tableData.products': currentTableState } },
      { new: true }
    );

    !updatedUser
      ? res.status(404).json({
          error: "Can't seem to find the user to update their table"
        })
      : res.status(201).json({
          updatedUser,
          message: 'Updated the table successfully!'
        });
  }

  /* attach route handlers to their endpoints */
  private init(): void {
    this.router.get('/', asyncMiddleware(this.getAll));
    this.router.get('/:id', asyncMiddleware(this.getById));
    this.router.get(
      '/:id/table',
      requireAuth,
      asyncMiddleware(this.getSavedTable)
    );
    this.router.put(
      '/:id/table',
      requireAuth,
      asyncMiddleware(this.updateSavedTable)
    );
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
