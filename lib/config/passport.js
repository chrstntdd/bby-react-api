require('dotenv').config();
const passport = require('passport');
const User = require('../models/user');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const LocalStrategy = require('passport-local');
const JWT_SECRET = process.env.JWT_SECRET;
const localOptions = {
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true
};
const localLogin = new LocalStrategy(localOptions, (req, employeeNumber, password, done) => {
    req.sanitizeBody('email').normalizeEmail({
        all_lowercase: true
    });
    req.sanitizeBody('email').escape();
    req.sanitizeBody('email').trim();
    req.sanitizeBody('password').escape();
    req.sanitizeBody('password').trim();
    req.checkBody('email', 'Please enter a valid email address').isEmail();
    req.checkBody('email', 'Please enter an email').notEmpty();
    req.checkBody('password', 'Please enter a password.').notEmpty();
    req.checkBody('password', 'Please enter a valid password').isAlpha();
    const cleanEmail = req.body.email;
    const cleanPassword = req.body.password;
    req
        .getValidationResult()
        .then(() => {
        User.findOne({ email: cleanEmail }, (err, user) => {
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
    })
        .catch(errors => {
        if (errors) {
            const messages = [];
            errors.forEach(error => messages.push(error));
            return done(null, false, {});
        }
        return done();
    });
});
const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeader(),
    secretOrKey: JWT_SECRET
};
const jwtLogin = new JwtStrategy(jwtOptions, (payload, done) => {
    User.findById(payload.id, (err, user) => {
        user ? done(null, user) : done(null, false);
    });
});
passport.use(jwtLogin);
passport.use(localLogin);
