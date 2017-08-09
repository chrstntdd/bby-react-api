import { Request, Response, NextFunction, Router } from 'express';
import { verify } from 'jsonwebtoken';
import { IError, MappedError } from '../interfaces/index';

const bby = require('bestbuy')(process.env.BBY_API_KEY);
const JWT_SECRET = process.env.JWT_SECRET;

/* Passport middleware */
const passport = require('passport');
const passportService = require('../config/passport');

const requireAuth = passport.authenticate('jwt', { session: false });

export default class BestBuyRouter {
  router: Router;
  path: any;

  constructor(path: any = '/api/v1/best-buy') {
    this.router = Router();
    this.path = path;
    this.init();
  }

  /* Controllers for interfacing with the Best Buy API */
  /* ALL requests require a valid JWT */

  /* Get product details by UPC */
  public getByUPC(req: Request, res: Response, next?: NextFunction): void {
    /* TODO. CHECK THAT THE REQUESTS ARE AUTHORIZED WITH A VALID JWT BEFORE ALLOWING USE OF THE ENDPOINT */
    // const token = req.headers.authorization;

    // if (token) {
    //   verify(token, JWT_SECRET, (err, decoded) => {
    //     if (err) {
    //       res.status(420).json('unauthorized');
    //     } else {
    //       next();
    //     }
    //   });
    // }

    /* Validation and sanitization 👏  */
    req.checkBody('upc', 'UPC must not be empty').notEmpty();
    req
      .checkBody(
        'upc',
        "Looks like you didn't scan the right bar code. Please make sure you scan the UPC label"
      )
      .isNumeric()
      .isInt({ allow_leading_zeroes: true })
      .isLength({ min: 12, max: 12 });

    req.sanitizeBody('upc').trim();
    req.sanitizeBody('upc').escape();

    /* Assign validated and sanitized UPC to variable */
    const upc: string = req.body.upc;

    /* Accumulate validation errors onto object */
    const errors: IError = { status: 406, messages: [] };

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
        const product = data.products[0];

        const productDetails = {
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
