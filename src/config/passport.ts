require('dotenv').config();

const passport = require('passport');
const User = require('../models/user');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const LocalStrategy = require('passport-local');

const JWT_SECRET = process.env.JWT_SECRET;

const localOptions = { usernameField: 'email' };

/* 
* LOCAL LOGIN STRATEGY
* Takes in form props dispatched from the loginUser action on the front end.
* employeeNumber is already in the from EMPLOYEENUMBER@bestbuy.com
*/
const localLogin = new LocalStrategy(
  localOptions,
  (employeeNumber, password, done) => {
    User.findOne({ email: employeeNumber }, (err, user) => {
      /* if there was an error */
      if (err) {
        return done(err);
      }
      /* if the supplied params dont return an account */
      if (!user) {
        return done(null, false, {
          message:
            "We can't seem to find an account registered with that id. Please try again"
        });
      }
      /* if the user has an account, but has yet to verify their email */
      if (!user.isVerified) {
        return done(null, false, {
          message: 'Please verify your email before using this service.'
        });
      }

      user.comparePassword(password, (err, isMatch) => {
        /* if there was an error */
        if (err) {
          return done(err);
        }
        /* if the supplied password param doesn't match the db password */
        if (!isMatch) {
          return done(null, false, {
            message: 'Your password looks a bit off. Please try again.'
          });
        }

        /* return the user successfully */
        return done(null, user);
      });
    });
  }
);

const jwtOptions = {
  // Telling Passport to check authorization headers for JWT
  jwtFromRequest: ExtractJwt.fromAuthHeader(),
  // Telling Passport where to find the secret
  secretOrKey: JWT_SECRET
};

// Setting up JWT login strategy
const jwtLogin = new JwtStrategy(jwtOptions, (payload, done) => {
  User.findById(payload.id, (err, user) => {
    user ? done(null, user) : done(null, false);
  });
});

passport.use(jwtLogin);
passport.use(localLogin);
