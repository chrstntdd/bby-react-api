require('dotenv').config();

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const faker = require('faker');
const should = chai.should();
const { fiveUsers } = require('../generateTestData');
chai.use(chaiHttp);

process.env.NODE_ENV = 'test';

const { app, runServer, closeServer } = require('../src/index');
const { User } = require('../src/models/user');
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

const seedUsers = () => {
  const testUsers = fiveUsers();
  User.insertMany(testUsers);
};

const tearDownDb = () => mongoose.connection.dropDatabase();

describe('The API', () => {
  before(() => runServer(TEST_DATABASE_URL));
  beforeEach(() => seedUsers());
  afterEach(() => tearDownDb());
  after(() => closeServer());

  describe('', () => {
    it('', () => {
      /* SOMETHING GOES HERE */
    });
  });
});
