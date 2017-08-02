import 'babel-polyfill';
require('dotenv').config();
import Api from '../Api';

const app = new Api().express;

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const should = chai.should();

chai.use(chaiHttp);
process.env.NODE_ENV = 'test';

const { runServer, closeServer } = require('../index');
const { Table } = require('../models/table');
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

const tearDownDb = () => mongoose.connection.dropDatabase();

describe('The Best Buy API', () => {
  before(() => runServer(TEST_DATABASE_URL));
  beforeEach(() => /* seed data into DB */);
  afterEach(() => tearDownDb());
  after(() => closeServer());
  describe('POST api/v1/best-buy/upc - POST upc from client and receive back product details', () => {
    it('should work', () => {
      /* Start your testing */
    });
  });
});
