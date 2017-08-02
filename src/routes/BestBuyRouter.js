// @flow
import type { $Request, $Response, $NextFunction } from 'express';
import { Router } from 'express';

const bby = require('bestbuy')(process.env.BBY_API_KEY);

/* Passport middleware */
const passport = require('passport');
const passportService = require('../config/passport');

const requireAuth = passport.authenticate('jwt', { session: false });

export default class BestBuyRouter {
  router: Router;
  path: String | string;

  constructor(path: String | string = '/api/v1/best-buy') {
    this.router = Router();
    this.path = path;
    this.init();
  }

  /* Controllers for interfacing with the Best Buy API */
  /* ALL requests require a valid JWT */

  /* Get product details by UPC */
  getByUPC(req: $Request, res: $Response): void {
    /* Validation and sanitization 👏  */
    req.checkBody('upc', 'UPC must not be empty').notEmpty();
    req
      .checkBody(
        'upc',
        "Looks like you didn't scan the right bar code. Please make sure you scan the UPC label"
      )
      .isNumeric()
      .isInt({ allow_leading_zeros: true })
      .isLength({ min: 12, max: 12 });

    req.sanitizeBody('upc').trim();
    req.sanitizeBody('upc').escape();

    /* Assign validated and sanitized UPC to variable */
    const upc = req.body.upc;

    /* Accumulate validation errors onto object */
    const errors = { status: 406, messages: [] };
    req.getValidationResult().then(result => {
      if (!result.isEmpty()) {
        errors.messages = result.array();
      }
    });

    /* Instantiate best buy search instance */
    const search = bby.products(`upc=${upc}`);

    search.then(data => {
      if (errors.messages.length > 0) {
        res.status(errors.status).json({
          messages: errors.messages
        });
      } else if (!data.total) {
        /* no results returned back from the API */
        res.status(400).json({
          message: 'UPC not recognized. Please try your search again'
        });
      } else {
        /* Success */
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
        res.status(200).json(productDetails);
      }
    });
  }

  init(): void {
    this.router.post('/upc', this.getByUPC, requireAuth);
  }
}
