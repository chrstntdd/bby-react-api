require('dotenv').config();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user');
const nodemailer = require('nodemailer');

const JWT_SECRET = process.env.JWT_SECRET;
const SMTP_URL = process.env.SMTP_URL;
const FROM_EMAIL = process.env.FROM_EMAIL;

const generateToken = user => {
  return jwt.sign(user, JWT_SECRET, {
    expiresIn: '2h'
  });
};

// SET USER INFO FROM REQUEST
const setUserInfo = req => ({
  _id: req._id,
  firstName: req.profile.firstName,
  lastName: req.profile.lastName,
  email: req.email,
  role: req.role
});

// LOGIN ROUTE
exports.login = (req, res, next) => {
  const email = req.body.email;
  User.findOne({ email }, (err, user) => {
    console.log(user);
    const userInfo = setUserInfo(req.user);
    res.status(200).json({
      token: `JWT ${generateToken(userInfo)}`,
      user: userInfo
    });
  });
};

exports.register = (req, res, next) => {
  const email = req.body.email;
  const firstName = req.body.firstName;
  const lastName = req.body.lastName;
  const password = req.body.password;

  // VALIDATION FOR REQUIRED FIELDS
  if (!email)
    return res.status(422).send({ error: 'You must enter an email address' });
  if (!firstName || !lastName)
    return res.status(422).send({ error: 'You must enter your full name' });
  if (!password)
    return res.status(422).send({ error: 'You must enter a password' });

  User.findOne({ email }, (err, existingUser) => {
    if (err) return next(err);
    // IF EMAIL ALREADY EXISTS
    if (existingUser)
      return res.status(422).send({ error: 'That email is already in use' });

    // GENERATE VERIFY TOKEN
    crypto.randomBytes(48, (err, buffer) => {
      if (err) return next(err);
      const verifyToken = buffer.toString('hex');
      // CREATE ACCOUNT
      let user = new User({
        email,
        password,
        isVerified: false,
        confirmationEmailToken: verifyToken,
        profile: { firstName, lastName }
      });
      user.save((err, user) => {
        if (err) return next(err);
        const transporter = nodemailer.createTransport(SMTP_URL);
        const emailData = {
          to: user.email,
          from: FROM_EMAIL,
          subject: 'Quantified Account Confirmation',
          text:
            `${'You are receiving this because you (or someone else) have requested an account with Quantified.\n\n' +
              'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
              'http://'}${req.headers.host}/confirm-email/${verifyToken}\n\n` +
            `If you did not request this, please ignore this email.\n`
        };

        transporter.sendMail(emailData);
        return res.status(200).json({
          message: 'Please check your work email to confirm your account.'
        });
      });
    });
  });
};

exports.verifyEmail = (req, res, next) => {
  User.findOne({ confirmationEmailToken: req.params.token }, (err, user) => {
    // IF THE USER ISN'T FOUND
    if (!user) {
      res.status(422).json({ error: 'Account not found' });
    }
    // IF A USER iS FOUND, FLIP VERIFIED FLAG AND SET AUTH HEADERS
    user.isVerified = true;
    user.save(err => {
      if (err) return next(err);
      const userInfo = setUserInfo(user);
      res.status(200).json({
        token: `JWT ${generateToken(userInfo)}`,
        user: userInfo
      });
      next();
    });
  });
};

// = = = = = = = = = = = = = = = = =
//- FORGOT PASSWORD ROUTE CONTROLLER
// = = = = = = = = = = = = = = = = =
exports.forgotPassword = (req, res, next) => {
  const email = req.body.email;

  User.findOne({ email }, (err, existingUser) => {
    // NO USER. RENDER ERROR
    if (err || existingUser == null) {
      res.status(422).json({
        error:
          'Your request could not be processed as entered. Please try again.'
      });
      return next(err);
    }
    //  IF USER IS FOUND, GENERATE AND SAVE A TOKEN

    crypto.randomBytes(48, (err, buffer) => {
      const resetToken = buffer.toString('hex');
      if (err) return next(err);

      existingUser.resetPasswordToken = resetToken;
      existingUser.resetPasswordExpires = Date.now() + 3600000; // 1 HOUR

      existingUser.save(err => {
        // IF THERE IS AN ERROR IN SAVING THE TOKEN, RETURN IT
        if (err) return next(err);
        const transporter = nodemailer.createTransport(SMTP_URL);
        const emailData = {
          to: existingUser.email,
          from: FROM_EMAIL,
          subject: 'Best Buy Manifest Tool Password Reset',
          text:
            `${'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
              'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
              'http://'}${req.headers.host}/reset-password/${resetToken}\n\n` +
            `If you did not request this, please ignore this email and your password will remain unchanged.\n`
        };
        // SEND EMAIL
        transporter.sendMail(emailData);
        return res.status(200).json({
          message:
            'Please check your email for the link to reset your password.'
        });
      });
    });
  });
};

// = = = = = = = = = = = = = = = = =
//- RESET PASSWORD ROUTE CONTROLLER
// = = = = = = = = = = = = = = = = =

exports.verifyToken = (req, res, next) => {
  User.findOne(
    {
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    },
    (err, resetUser) => {
      // IF A USER WASN'T FOUND, TOKEN IS EXPIRED OR INVALID, RETURN ERROR
      if (!resetUser) {
        res.status(422).json({
          error:
            'Your token has expired. Please try to reset your password again.'
        });
      }

      // SAVE NEW PASSWORD AND CLEAR RESET TOKEN IN DB
      resetUser.password = req.body.password;
      resetUser.resetPasswordToken = undefined;
      resetUser.resetPasswordExpires = undefined;

      resetUser.save(err => {
        if (err) return err;

        // IF PASSWORD RESET IS SUCCESSFUL, ALERT VIA EMAIL
        const transporter = nodemailer.createTransport(SMTP_URL);
        const emailData = {
          to: resetUser.email,
          from: FROM_EMAIL,
          subject:
            'Your Best Buy Manifest Tool Password Password Has Been Reset',
          text:
            'You are receiving this email because you changed your password. \n\n' +
            'If you did not request this change, please contact us immediately.'
        };
        transporter.sendMail(emailData);
        return res.status(200).json({
          message: 'Password changed successfully!'
        });
      });
    }
  );
};
