require('dotenv').config();
const passport = require('passport');
const User = require('../models/user');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const LocalStrategy = require('passport-local');
const JWT_SECRET = process.env.JWT_SECRET;
const localOptions = { usernameField: 'email' };
const localLogin = new LocalStrategy(localOptions, (employeeNumber, password, done) => {
    User.findOne({ email: employeeNumber }, (err, user) => {
        if (err) {
            return done(err);
        }
        if (!user) {
            return done(null, false, {
                message: "We can't seem to find an account registered with that id. Please try again"
            });
        }
        if (!user.isVerified) {
            return done(null, false, {
                message: 'Please verify your email before using this service.'
            });
        }
        user.comparePassword(password, (err, isMatch) => {
            if (err) {
                return done(err);
            }
            if (!isMatch) {
                return done(null, false, {
                    message: 'Your password looks a bit off. Please try again.'
                });
            }
            return done(null, user);
        });
    });
});
const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeader(),
    secretOrKey: JWT_SECRET
};
const jwtLogin = new JwtStrategy(jwtOptions, (payload, done) => {
    User.findById(payload._id, (err, user) => {
        if (err)
            return done(err, false);
        user ? done(null, user) : done(null, false);
    });
});
passport.use(jwtLogin);
passport.use(localLogin);
