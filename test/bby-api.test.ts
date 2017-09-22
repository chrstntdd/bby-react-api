import { generateUser } from '../generateTestData.js';
import Api from '../src/Api';
import { closeServer, runServer } from '../src/index';
import User = require('../src/models/user');

require('dotenv').config();
const app = new Api().express;

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const should = chai.should();
const faker = require('faker');

chai.use(chaiHttp);
process.env.NODE_ENV = 'test';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const upc: string = faker.random
  .number({
    min: 100000000000,
    max: 999999999999
  })
  .toString();

const tearDownDb = () => mongoose.connection.dropDatabase();

let signedInUserJWT;
let signedInUserEmail;

describe('The Best Buy API', () => {
  before(() => runServer(TEST_DATABASE_URL));
  beforeEach(async () => {
    const user = generateUser();
    /* Raw username and password */
    const { email, password } = user;
    signedInUserEmail = email;
    /* wait for the user to be created and saved */
    await User.create(user);
    /* get back the same user */
    const newUser = await User.findOne({ email });
    /* verify them */
    newUser.isVerified = true;
    await newUser.save();

    const requestBody = {
      email,
      password
    };
    /* sign them in */
    const signInResponse = await chai
      .request(app)
      .post('/api/v1/users/sign-in')
      .send(requestBody);
    /* retrieve a valid JWT for authorized requests */
    signedInUserJWT = signInResponse.body.token;
  });
  afterEach(() => tearDownDb());
  after(() => closeServer());
  describe('POST api/v1/best-buy/upc - POST upc from client and receive back product details', () => {
    it('should respond back when a used has a valid JWT', async () => {
      const user = generateUser();
      const res = await chai
        .request(app)
        .post('/api/v1/best-buy/upc')
        .set({ Authorization: signedInUserJWT })
        .send({ upc: '841163057032' });
      res.should.exist;
      res.should.be.json;
      res.status.should.equal(200);
      res.body.should.contain.keys(
        'name',
        'sku',
        'upc',
        'department',
        'departmentId',
        'modelNumber',
        'classId',
        'value',
        'totalValue',
        'quantity'
      );
    });
    it('should respond back with an error message if the JWT is invalid', async () => {
      try {
        const user = generateUser();
        await chai
          .request(app)
          .post('/api/v1/best-buy/upc')
          .send({ upc: '841163057032' });
      } catch (error) {
        error.should.exist;
        error.status.should.equal(401);
      }
    });
  });
});
