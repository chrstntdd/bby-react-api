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

  /* create a new user */
  createNew(req: $Request, res: $Response, next: $NextFunction): void {
    const email = `${req.body.employeeNumber}@bestbuy.com`;
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const password = req.body.password;
    const employeeNumber = req.body.employeeNumber;
    const storeNumber = req.body.storeNumber;

    /* ========================== */
    /* CHECK FOR ALL VALID FIELDS */
    /* including validation and   */
    /* serialization. use express */
    /* validator!!                */
    /* ========================== */

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
          /* comment out for testing */
          // transporter.sendMail(emailData);
          return res.status(201).json({
            message:
              'Your account has been created, now please check your work email to confirm your account.',
            status: res.status
          });
        });
      });
    });
  }

  /* attach route handlers to their endpoints */
  init(): void {
    this.router.get('/', this.getAll);
    this.router.get('/:id', this.getById);
    this.router.post('/', this.createNew);
  }
}
