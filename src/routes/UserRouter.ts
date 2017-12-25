import { Router } from 'express';
import { ENV } from '../index';
import { celebrate } from 'celebrate';
import * as boom from 'boom';
import User = require('../models/user');
import {
  setUserInfo,
  generateJWT,
  verifySMTP,
  sendEmailAsync,
  genToken,
  asyncMiddleware
} from '../util';
import {
  signIn,
  createNew,
  forgotPassword,
  resetPassword,
  verifyEmail
} from '../config/validationSchemas';

const upperFirst = require('lodash.upperfirst');
const lowerFirst = require('lodash.lowerfirst');

require('dotenv').config();

/* Constants */
let CLIENT_URL;
ENV !== 'production'
  ? (CLIENT_URL = 'http://localhost:4444')
  : (CLIENT_URL = process.env.CLIENT_URL);

/* Passport middleware */
const passport = require('passport');
const passportService = require('../config/passport');
const requireAuth = passport.authenticate('jwt', { session: false });

/*
* Main user router class
* @path = /api/v1/users
*/

export default class UserRouter {
  router: Router;
  path: string;

  constructor(path = '/api/v1/users') {
    this.router = Router();
    this.path = path;
    this.init();
  }

  /* return all users */
  public async getAll(req, res, next): Promise<void> {
    const allUsers = await User.find();
    if (!allUsers) {
      throw boom.notFound('There are no users');
    } else {
      res.json(allUsers);
    }
  }

  /* get single user by id */
  public async getById(req, res, next): Promise<void> {
    const user = await User.findById(req.params.id);
    if (!user) {
      throw boom.notFound(
        `The user with the id ${req.params.id} can't be found`
      );
    } else {
      res.json(user);
    }
  }

  /* Sign in handler*/
  public async signIn(req, res, next): Promise<any> {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      throw boom.notFound(
        "There doesn't appear to be an account with that id. Please try again."
      );
    }
    /* if the existingUser has an account, but has yet to verify their email */
    if (!existingUser.isVerified) {
      throw boom.forbidden(
        'Please verify your email before using this service.'
      );
    }
    /* if the supplied password param doesn't match the db password */
    if (!await existingUser.comparePassword(password)) {
      throw boom.unauthorized(
        'Your password looks a bit off. Please try again.'
      );
    }

    /* return the user successfully after  generating a JWT for authentication */
    const userInfo = setUserInfo(existingUser);
    return res.status(200).json({
      jwt: `JWT ${generateJWT(userInfo)}`,
      user: userInfo
    });
  }

  /* create a new user (Register) */
  public async createNew(req, res, next): Promise<any> {
    const { password, storeNumber } = req.body;
    const employeeNumber = lowerFirst(req.body.employeeNumber);
    const firstName = upperFirst(req.body.firstName);
    const lastName = upperFirst(req.body.lastName);
    const email = `${employeeNumber}@bestbuy.com`;

    /* await the call to check if the user exists already */
    const existingUser = await User.findOne({ email });

    /* if the user already has an account registered with their employee id */
    if (existingUser) {
      throw boom.conflict(
        'Sorry, it looks as if there is already an account associated with that employee number'
      );
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
          `${CLIENT_URL}/verify-email?token=${
            newUser.confirmationEmailToken
          }\n\n` +
          `If you did not request this, please ignore this email.\n`
      };

      /* ONLY SEND THE EMAIL IN PRODUCTION */
      if (ENV === 'production') {
        await verifySMTP();
        await sendEmailAsync(emailData);
        return res.status(201).json({
          message:
            'Thank you for signing up! Your account has been created, now please check your work email to confirm your account.'
        });
      } else {
        return res.status(201).json({
          message:
            'Your account has been created, now please check your work email to confirm your account.'
        });
      }
    }
  }

  /* delete an existing user by the id params */
  public async deleteById(req, res, next): Promise<void> {
    const userToDelete = await User.findByIdAndRemove(req.params.id);

    if (!userToDelete) {
      throw boom.notFound("We cant find the user you're trying to delete");
    } else {
      const { firstName, lastName } = userToDelete.profile;
      return res.status(202).json({
        message: `${firstName} ${lastName} has been removed.`
      });
    }
  }

  /* update an existing user by the id params */
  public async updateById(req, res, next): Promise<void> {
    /* get user that will be updated */
    const userToUpdate = await User.findById(req.params.id);

    if (!userToUpdate) {
      throw boom.notFound("We cant find the user you're trying to update");
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
        throw boom.forbidden("You can't update those fields, brother");
      } else {
        mutableFields.forEach(field => {
          if (field in req.body) {
            updated[field] = req.body[field];
          }
        });

        const updatedUser = await User.update(
          { _id: req.params.id },
          { $set: updated },
          { new: true }
        );

        return res.status(201).json({
          message: `${firstName} ${lastName} has updated their account`
        });
      }
    }
  }

  /* verify an existing users account */
  public async verifyEmail(req, res, next): Promise<void> {
    const existingUser = await User.findOne({
      confirmationEmailToken: req.query.token
    });

    if (!existingUser) {
      throw boom.notFound('Account not found');
    } else {
      /* if a user is found, flip the verified flag, clear the token, save the document, and set auth headers */
      existingUser.isVerified = true;
      existingUser.confirmationEmailToken = undefined;

      const updatedUser = await existingUser.save();
      const userInfo = setUserInfo(updatedUser);
      return res.status(200).json({
        jwt: `JWT ${generateJWT(userInfo)}`,
        user: userInfo
      });
    }
  }

  /* forgot password handler for existing users */
  public async forgotPassword(req, res, next): Promise<void> {
    const { employeeNumber } = req.body;

    const existingUser = await User.findOne({ employeeNumber });

    if (!existingUser) {
      throw boom.notFound(
        "We can't find an account associated with that employee number. Please try again."
      );
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
          `${CLIENT_URL}/reset-password?token=${resetPasswordToken}\n\n` +
          `If you did not request this, please ignore this email and your password will remain unchanged.\n`
      };

      if (ENV === 'production') {
        await verifySMTP();
        await sendEmailAsync(emailData);
        return res.status(200).json({
          resetToken: resetPasswordToken,
          message:
            'Thank you. Please check your work email for a message containing the link to reset your password.'
        });
      } else {
        return res.status(200).json({
          resetToken: resetPasswordToken,
          message:
            'Thank you. Please check your work email for a message containing the link to reset your password.'
        });
      }
    }
  }

  /* reset password handler for existing users */
  public async resetPassword(req, res, next): Promise<void> {
    const existingUser = await User.findOne({
      resetPasswordToken: req.query.token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!existingUser) {
      throw boom.badRequest(
        'Whoops! It looks like your reset token has already expired. Please try to reset your password again.'
      );
    } else {
      const { password } = req.body;

      /* save the new password and clear the reset token in DB */
      existingUser.password = password;
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

      if (ENV === 'production') {
        await verifySMTP();
        await sendEmailAsync(emailData);
        return res.status(200).json({
          message:
            'Your password has been changed successfully. Redirecting you to the sign in page now...'
        });
      } else {
        return res.status(200).json({
          message:
            'Your password has been changed successfully. Redirecting you to the sign in page now...'
        });
      }
    }
  }

  public async getSavedTable(req, res, next): Promise<void> {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) {
      throw boom.notFound(
        "Can't seem to find those products you were looking for"
      );
    } else {
      return res.status(200).json({
        products: user.tableData.products
      });
    }
  }

  public async updateSavedTable(req, res, next): Promise<void> {
    const { currentTableState } = req.body;
    const userId = req.params.id;

    const updatedUser = await User.findOneAndUpdate(
      { _id: userId },
      { $set: { 'tableData.products': currentTableState } },
      { new: true }
    );

    if (!updatedUser) {
      throw boom.notFound("Can't seem to find the user to update their table");
    } else {
      return res.status(201).json({
        updatedUser,
        message: 'Updated the table successfully!'
      });
    }
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
    this.router.post(
      '/',
      celebrate(createNew),
      asyncMiddleware(this.createNew)
    );
    this.router.post(
      '/sign-in',
      celebrate(signIn),
      asyncMiddleware(this.signIn)
    );
    this.router.post(
      '/verify-email',
      celebrate(verifyEmail),
      asyncMiddleware(this.verifyEmail)
    );
    this.router.post(
      '/forgot-password',
      celebrate(forgotPassword),
      asyncMiddleware(this.forgotPassword)
    );
    this.router.post(
      '/reset-password',
      celebrate(resetPassword),
      asyncMiddleware(this.resetPassword)
    );
    this.router.put('/:id', asyncMiddleware(this.updateById));
    this.router.delete('/:id', asyncMiddleware(this.deleteById));
  }
}
