import { Router } from 'express';
import { celebrate } from 'celebrate';
import * as boom from 'boom';
import { asyncMiddleware } from '../util';
import { getByUPC } from '../config/validationSchemas';

require('dotenv').config();
const bby = require('bestbuy')(process.env.BBY_API_KEY);
const JWT_SECRET = process.env.JWT_SECRET;

/* Passport middleware */
const passport = require('passport');
const passportService = require('../config/passport');

const requireAuth = passport.authenticate('jwt', { session: false });

export default class BestBuyRouter {
  router: Router;
  path: string;

  constructor(path: any = '/api/v1/best-buy') {
    this.router = Router();
    this.path = path;
    this.init();
  }

  /* Controllers for interfacing with the Best Buy API */
  /* ALL requests require a valid JWT */

  /* Get product details by UPC */
  public async getByUPC(req, res, next): Promise<any> {
    const { upc } = req.body;

    /* Instantiate best buy search instance */
    const search = bby.products(`upc=${upc}`);

    /* await response from the best buy API */
    const productsApiResponse = await search;

    if (productsApiResponse.total < 1) {
      throw boom.notFound('UPC not recognized. Please try your search again');
    } else if (!productsApiResponse) {
      throw boom.serverUnavailable('There was an error with the Best Buy API');
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

  init(): void {
    this.router.post(
      '/upc',
      requireAuth,
      celebrate(getByUPC),
      asyncMiddleware(this.getByUPC)
    );
  }
}
