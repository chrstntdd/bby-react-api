import 'babel-polyfill';
require('dotenv').config();
import Api from '../Api';

const app = new Api().express;

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const should = chai.should();

/* this is fake array of 5 users with a full profile */
const testData = require('../../testdata.json');

chai.use(chaiHttp);

process.env.NODE_ENV = 'test';

const { runServer, closeServer } = require('../altindex');
const { User } = require('../models/user');
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

const seedUsers = testData => {
  User.insertMany(testData);
};

const tearDownDb = () => mongoose.connection.dropDatabase();

describe('The API', () => {
  before(() => runServer(TEST_DATABASE_URL));
  beforeEach(() => seedUsers(testData));
  afterEach(() => tearDownDb());
  after(() => closeServer());
  let expectedProps = [
    '__v',
    'updatedAt',
    'createdAt',
    '_id',
    'email',
    'password',
    'profile',
    'employeeNumber',
    'storeNumber',
    'role',
    'resetPasswordToken',
    'resetPasswordExpires',
    'confirmationEmailToken',
    'isVerified',
    'tableData'
  ];

  describe('GET /api/v1/users - get all users', () => {
    it('should return a JSON array', () => {
      return chai.request(app).get('/api/v1/users').then(res => {
        res.status.should.equal(200);
        res.should.be.json;
        res.body.should.be.an('array');
      });
    });
    it('should return user objects with the correct props', () => {
      return chai.request(app).get('/api/v1/users').then(res => {
        const user = res.body[1];
        const userKeys = Object.keys(user);
        expectedProps.forEach(key => {
          userKeys.should.include(key);
        });
      });
    });
    it("shouldn't return a user object with extra props", () => {
      return chai.request(app).get('/api/v1/users').then(res => {
        const user = res.body[0];
        let extraProps = Object.keys(user).filter(key => {
          return !expectedProps.includes(key);
        });
        extraProps.length.should.equal(0);
      });
    });
  });

  describe('GET /api/v1/users/:id - get user by id', () => {
    it('should return the user with the requested ID', () => {
      let userId;
      return User.findOne().exec().then(userObject => {
        userId = userObject._id;
        return chai.request(app).get(`/api/v1/users/${userId}`).then(res => {
          res.status.should.equal(200);
          res.should.be.json;
          res.body.should.be.an('object');
          res.body.should.include.keys(expectedProps);
        });
      });
    });
    it('should 400 for a request containing a nonexistent id', () => {
      return chai
        .request(app)
        .get(`/api/v1/users/42`)
        .then(res => {
          res.status.should.equal(400);
        })
        .catch(err => {
          err.response.error;
          err.response.error.status.should.equal(400);
          err.response.body.message.should.equal(
            `No user found with the id: 42`
          );
        });
    });
  });
});
