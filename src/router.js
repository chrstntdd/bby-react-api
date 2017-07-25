const AuthenticationController = require('./controllers/authentication');
const express = require('express');
const passportService = require('./config/passport');
const passport = require('passport');
const bby = require('bestbuy')(process.env.BBY_API_KEY);

// MIDDLEWARE  TO REQUIRE LOGIN/AUTH
const requireAuth = passport.authenticate('jwt', { session: false });
const requireLogin = passport.authenticate('local', { session: false });

module.exports = app => {
  const apiRoutes = express.Router();
  const authRoutes = express.Router();

  // SET AUTH ROUTES AS A SUB-ROUTE TO apiRoutes
  apiRoutes.use('/auth', authRoutes);
  // REGISTRATION ROUTE
  authRoutes.post('/register', AuthenticationController.register);
  // LOGIN ROUTE
  authRoutes.post('/login', requireLogin, AuthenticationController.login);
  // PASSWORD RESET ROUTE(GEN/SEND TOKEN)
  authRoutes.post('/forgot-password', AuthenticationController.forgotPassword);
  // PASSWORD RESET ROUTE(CHANGE PASSWORD WITH TOKEN)
  authRoutes.post(
    '/reset-password/:token',
    AuthenticationController.verifyToken
  );
  // EMAIL CONFIRMATION ROUTE
  authRoutes.post(
    '/confirm-email/:token',
    AuthenticationController.verifyEmail
  );

  // = = = = = = = = = = = = = =
  // BEST BUY API UPC CALL
  // = = = = = = = = = = = = = =
  apiRoutes.post('/protected/bby-api', requireAuth, (req, res) => {
    // SANITIZE INPUTS
    req.sanitizeBody('upc').trim();
    req.sanitizeBody('upc').escape();

    // VALIDATE INPUTS
    req.checkBody('upc', 'UPC is not valid.').notEmpty();
    req
      .checkBody(
        'upc',
        "Looks like you didn't scan the right bar code. Please scan the UPC code."
      )
      .isNumeric()
      .isInt({ allow_leading_zeroes: true })
      .isLength({ min: 12, max: 12 });

    // ASSIGN SANITIZED VALUE TO VARIABLE
    let upc = req.body.upc;

    // ASSIGN ALL ERRORS
    let errors = req.validationErrors();

    // INSTANTIATE BBY SEARCH
    const search = bby.products(`upc=${upc}`);

    search.then(data => {
      if (errors) {
        // ON VALIDATION ERRORS
        res.json({ message: errors[0].msg });
      } else if (!data.total) {
        // ON NO RESULTS BACK FROM THE API
        res.json({
          message: 'UPC not recognized. Please try your search again.'
        });
      } else {
        // ON SUCCESS
        let product = data.products[0];

        let productDetails = {
          name: product.name,
          sku: product.sku,
          upc: product.upc,
          department: product.department,
          departmentId: product.departmentId,
          modelNumber: product.modelNumber,
          classId: product.classId,
          value: product.salePrice,
          totalValue: product.salePrice,
          quantity: 1
        };
        // RETURN JSON RESPONSE
        res.json(productDetails);
      }
    });
  });
  // SET URL FOR API GROUP ROUTES
  app.use('/api', apiRoutes);
};
