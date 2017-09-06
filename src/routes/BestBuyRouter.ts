require('dotenv').config();
import { Request, Response, NextFunction, Router } from 'express';
import { verify } from 'jsonwebtoken';
import { IError, MappedError } from '../interfaces/index';
import { asyncMiddleware } from './UserRouter';

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
  public async getByUPC(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<any> {
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

    const validationResult = await req.getValidationResult();

    if (!validationResult.isEmpty()) {
      const validationErrors = [];
      validationResult.array().forEach(error => validationErrors.push(error));
      return res.status(400).json({ validationErrors });
    } else {
      /* Instantiate best buy search instance */
      const search = bby.products(`upc=${upc}`);

      /* await response from the best buy API */
      let productsApiResponse;
      productsApiResponse = await search;

      if (productsApiResponse.total < 1) {
        res.status(404).json({
          message: 'UPC not recognized. Please try your search again'
        });
      } else if (!productsApiResponse) {
        res.status(500).json({ error: 'There was an error' });
      } else {
        /* success */
        const product = productsApiResponse.products[0];
        const {
          name,
          sku,
          upc,
          department,
          departmentId,
          modelNumber,
          classId,
          salePrice
        } = product;

        res.status(200).json({
          name,
          sku,
          upc,
          department,
          departmentId,
          modelNumber,
          classId,
          value: salePrice,
          totalValue: salePrice,
          quantity: 1
        });
      }
    }
  }

  init(): void {
    this.router.post('/upc', requireAuth, asyncMiddleware(this.getByUPC));
  }
}
