require('dotenv').config();
import Api from '../src/Api';

const app = new Api().express;

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const morgan = require('morgan');
const should = chai.should();

/* this is fake array of 5 users with a full profile */
const testData = require('../testdata.json');

chai.use(chaiHttp);

process.env.NODE_ENV = 'test';

import { generateNewUser } from '../generateTestData.js';
import { runServer, closeServer } from '../src/index';
import User = require('../src/models/user');
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
  const expectedProps = [
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

  /* Get all users */
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
        const extraProps = Object.keys(user).filter(key => {
          return !expectedProps.includes(key);
        });
        extraProps.length.should.equal(0);
      });
    });
  });
  /* Get user by id */
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

  /* Post new user */
  describe('POST /api/v1/users - create a new user', () => {
    const reqProps = [
      'email',
      'firstName',
      'lastName',
      'password',
      'confirmPassword',
      'employeeNumber',
      'storeNumber'
    ];

    it('should create a new user when all the required fields are submitted', () => {
      const newUser = generateNewUser();
      return chai
        .request(app)
        .post('/api/v1/users')
        .send({
          email: newUser.email,
          password: newUser.password,
          confirmPassword: newUser.password,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          employeeNumber: newUser.employeeNumber,
          storeNumber: newUser.storeNumber
        })
        .then(res => {
          const newUser = res.body.user;
          res.should.be.json;
          res.body.should.exist;
          res.body.should.be.an('object');
          res.body.should.contain.keys('message', 'user');
          return newUser;
        })
        .then(newUser => {
          /* check that user now exists in the DB with another get request */
          const { _id } = newUser;
          return chai.request(app).get(`/api/v1/users/${_id}`).then(res => {
            res.should.exist;
            res.should.be.json;
            res.body._id.should.equal(_id);
          });
        });
    });
    it('should 409 for a existing user trying to register with valid credentials', () => {
      return User.findOne().exec().then(userObject => {
        const { email, password, employeeNumber, storeNumber } = userObject;
        return chai
          .request(app)
          .post('/api/v1/users')
          .send({
            email,
            password,
            confirmPassword: password,
            firstName: userObject.profile.firstName,
            lastName: userObject.profile.lastName,
            employeeNumber,
            storeNumber
          })
          .then(res => {
            res.status.should.equal(409);
          })
          .catch(err => {
            err.response.error;
            err.response.error.status.should.equal(409);
            err.response.body.message.should.equal(
              'Sorry, it looks as if there is already an account associated with that employee number'
            );
          });
      });
    });
    it('should 406 if there are validation issue', () => {
      const invalidUser = generateNewUser();
      invalidUser.firstName = 42;
      invalidUser.lastName = 24;
      invalidUser.storeNumber = 'NotAValidInt';
      invalidUser.employeeNumber =
        '<script>let i = 0; while(true){i++}</script>';
      const {
        email,
        password,
        firstName,
        lastName,
        employeeNumber,
        storeNumber
      } = invalidUser;
      return chai
        .request(app)
        .post('/api/v1/users')
        .send({
          email,
          password,
          confirmPassword: password,
          firstName,
          lastName,
          employeeNumber,
          storeNumber
        })
        .then(res => {
          res.status.should.equal(406);
        })
        .catch(err => {
          err.response.error;
          err.response.error.status.should.equal(406);
        });
    });
  });

  /* Delete user by id */
  describe('DELETE /api/v1/users/:id - delete a user by id params', () => {
    it('should delete that the user with the requested id', () => {
      return User.findOne().exec().then(userObject => {
        return chai
          .request(app)
          .del(`/api/v1/users/${userObject.id}`)
          .then(res => {
            res.status.should.equal(202);
            res.should.be.json;
            res.body.should.contain.keys('message');
            return User.findById(userObject.id).exec();
          })
          .then(_userObject => {
            should.not.exist(_userObject);
          });
      });
    });
    it("should return an error if the user with the requested id doesn't  exist", () => {
      return User.findOne().exec().then(userObject => {
        const pathToNonExistentUser = '/api/v1/users/1337';
        return chai
          .request(app)
          .del(pathToNonExistentUser)
          .then(res => {
            res.status.should.equal(400);
          })
          .catch(err => {
            err.response.error.path.should.equal(pathToNonExistentUser);
            err.response.error.status.should.equal(400);
          });
      });
    });
  });

  /* Update user by id */
  describe("PUT /api/v1/users:id - update a user's information by id params", () => {
    it('should update the fields specified in the query', () => {
      const dataToUpdate = {
        id: '',
        profile: {
          firstName: 'Clarice',
          lastName: 'Thompson'
        },
        storeNumber: 420,
        password: 'supersecret password'
      };
      return User.findOne().exec().then(userObject => {
        dataToUpdate.id = userObject.id;

        return chai
          .request(app)
          .put(`/api/v1/users/${userObject.id}`)
          .send(dataToUpdate)
          .then(res => {
            res.should.be.json;
            res.body.should.contain.keys('message');
            return User.findById(dataToUpdate.id).exec();
          })
          .then(updatedUser => {
            updatedUser.profile.firstName.should.contain(
              dataToUpdate.profile.firstName
            );
            updatedUser.profile.lastName.should.contain(
              dataToUpdate.profile.lastName
            );
            updatedUser.storeNumber.should.equal(dataToUpdate.storeNumber);
            updatedUser.password.should.equal(dataToUpdate.password);
          });
      });
    });
    it("should return an error if the user with the requested id doesn't exist", () => {
      const pathToNonExistentUser = '/api/v1/users/1460';
      const dataToUpdate = {
        id: '',
        profile: {
          firstName: 'Clarice',
          lastName: 'Thompson'
        },
        storeNumber: 420,
        password: 'supersecret password'
      };
      return User.findOne().exec().then(userObject => {
        dataToUpdate.id = userObject.id;
        return chai
          .request(app)
          .put(pathToNonExistentUser)
          .send(dataToUpdate)
          .then(res => {
            res.status.should.equal(404);
          })
          .catch(err => {
            err.should.exist;
            err.response.error.path.should.equal(pathToNonExistentUser);
            err.response.error.status.should.equal(404);
          });
      });
    });
    it('should reject updates to restricted props', () => {
      const dataToUpdate = {
        employeeNumber: '1075394',
        role: 'Admin',
        isVerified: true,
        id: ''
      };
      return User.findOne().exec().then(userObject => {
        dataToUpdate.id = userObject.id;
        return chai
          .request(app)
          .put(`/api/v1/users/${userObject.id}`)
          .send(dataToUpdate)
          .then(res => {
            res.status.should.equal(401);
          })
          .catch(err => {
            err.should.exist;
            err.response.error.path.should.equal(
              `/api/v1/users/${userObject.id}`
            );
            err.response.error.status.should.equal(401);
          });
      });
    });
  });

  /* User sign in */
  describe('POST /api/v1/users/sign-in - allow user to authenticate and receive JWT ', () => {
    it('should allow a user to sign in and issue a valid JWT', () => {
      return User.findOne().exec().then(userObject => {
        const { email } = userObject;
        return chai
          .request(app)
          .post('/api/v1/users/sign-in')
          .send({ email })
          .then(res => {
            res.should.exist;
            res.should.be.json;
            res.status.should.equal(200);
            res.body.should.contain.keys('token', 'user');
          });
      });
    });
    it('should return validation errors if the email is empty', () => {
      return chai
        .request(app)
        .post('/api/v1/users/sign-in')
        .then(res => {
          res.status.should.equal(406);
        })
        .catch(err => {
          const validationMsg = JSON.parse(err.response.error.text);
          validationMsg.should.be.an('object');
          validationMsg.messages.should.be.an('array');
          validationMsg.messages.should.have.length.of.at.least(1);
          err.response.error.status.should.equal(406);
        });
    });
    it('should return validation errors if the email fails validation', () => {
      const invalidEmail = 'invalidemai1.com-';
      return chai
        .request(app)
        .post('/api/v1/users/sign-in')
        .send({ email: invalidEmail })
        .then(res => {
          res.status.should.equal(406);
        })
        .catch(err => {
          const validationMsg = JSON.parse(err.response.error.text);
          validationMsg.should.be.an('object');
          validationMsg.messages.should.be.an('array');
          validationMsg.messages[0].value.should.equal(invalidEmail);
          err.response.error.status.should.equal(406);
        });
    });
  });

  /* User verify account */
  describe('POST /api/v1/users/verify-email/:token - verify users account to allow for use of the service', () => {
    it('should flip the isVerified prop on a users account', () => {
      return User.findOne().exec().then(userObject => {
        const { confirmationEmailToken } = userObject;
        userObject.isVerified.should.equal(false);
        return chai
          .request(app)
          .post(`/api/v1/users/verify-email/${confirmationEmailToken}`)
          .then(res => {
            res.should.exist;
            res.should.be.json;
            res.status.should.equal(200);
            res.body.should.contain.keys('token', 'user');
            res.body.user.isVerified.should.equal(true);
          });
      });
    });
    it("should return an error message if the confirmation token isn't tied to an existing user's account", () => {
      return chai
        .request(app)
        .post(`/api/v1/users/verify-email/9bB9zLmc23G2EF5p`)
        .then(res => {
          res.status.should.equal(422);
        })
        .catch(err => {
          err.should.exist;
          err.response.body.should.contain.keys('message');
          err.status.should.equal(422);
        });
    });
  });

  /* Forgot password handler */
  describe('POST /api/v1/users/forgot-password - handle sending forgot password email', () => {
    it('should set a reset token on the users account', () => {
      return User.findOne().exec().then(userObject => {
        const initialToken = userObject.resetPasswordToken;
        const { email } = userObject;
        return chai
          .request(app)
          .post('/api/v1/users/forgot-password')
          .send({ email })
          .then(res => {
            const newToken = res.body.resetToken;
            res.should.exist;
            res.should.be.json;
            res.status.should.equal(200);
            res.body.should.contain.keys('resetToken', 'message');
            return newToken;
          })
          .then(newToken => {
            return chai
              .request(app)
              .get(`/api/v1/users/${userObject._id}`)
              .then(res => {
                res.body.resetPasswordToken.should.equal(newToken);
              });
          });
      });
    });
    it('should return an error message if the email is blank', () => {
      return chai
        .request(app)
        .post('/api/v1/users/forgot-password')
        .then(res => {
          res.status.should.equal(406);
        })
        .catch(err => {
          err.should.exist;
          err.status.should.equal(406);
          const validationMsg = JSON.parse(err.response.error.text);
          validationMsg.should.be.an('object');
          validationMsg.messages.should.be.an('array');
          validationMsg.messages.should.have.length.of.at.least(1);
        });
    });
    it('should return an error message if the email is invalid', () => {
      const invalidEmail = 'iinvaL!d3ma!L';
      return chai
        .request(app)
        .post('/api/v1/users/forgot-password')
        .send({ email: invalidEmail })
        .then(res => {
          res.status.should.equal(406);
        })
        .catch(err => {
          err.should.exist;
          err.status.should.equal(406);
          const validationMsg = JSON.parse(err.response.error.text);
          validationMsg.should.be.an('object');
          validationMsg.messages.should.be.an('array');
          validationMsg.messages.should.have.length.of.at.least(1);
          validationMsg.messages[0].value.should.equal(invalidEmail);
        });
    });
    it("should return an error message if the user can't be found with the supplied email", () => {
      return chai
        .request(app)
        .post('/api/v1/users/forgot-password')
        .send({ email: 'a1075394@bestbuy.com' })
        .then(res => {
          res.should.exist;
          res.status.should.equal(422);
        })
        .catch(err => {
          err.should.exist;
          err.status.should.equal(422);
          const validationMsg = JSON.parse(err.response.error.text);
          validationMsg.should.be.an('object');
          validationMsg.messages.should.be.a('string');
        });
    });
  });

  /* Reset password handler */
  describe('POST /api/v1/users/reset-password/:token - handle setting new password and resetting reset tokens', () => {
    it('should allow existing users to reset their password', () => {
      return User.findOne().exec().then(userObject => {
        const { email } = userObject;
        return chai
          .request(app)
          .post('/api/v1/users/forgot-password')
          .send({ email })
          .then(res => {
            res.should.exist;
            res.should.be.json;
            res.status.should.equal(200);
            const userResetToken = res.body.resetToken;
            return userResetToken;
          })
          .then(userResetToken => {
            return chai
              .request(app)
              .post(`/api/v1/users/reset-password/${userResetToken}`)
              .send({ password: 'superSecretNewPassword' })
              .then(res => {
                res.should.exist;
                res.should.be.json;
                res.status.should.equal(200);
              });
          });
      });
    });
    it("should return an error if the token doesn't match an existing user", () => {
      return User.findOne().exec().then(userObject => {
        const { email } = userObject;
        return chai
          .request(app)
          .post('/api/v1/users/forgot-password')
          .send({ email })
          .then(res => {
            res.should.exist;
            res.should.be.json;
            res.status.should.equal(200);
            const userResetToken = res.body.resetToken + 'asdjfks';
            return userResetToken;
          })
          .then(userResetToken => {
            return chai
              .request(app)
              .post(`/api/v1/users/reset-password/${userResetToken}`)
              .send({ password: 'altSecretPassword' })
              .then(res => {
                res.should.exist;
                res.status.should.equal(422);
              })
              .catch(err => {
                err.should.exist;
                err.status.should.equal(422);
                const errorMsg = JSON.parse(err.response.error.text);
                errorMsg.message.should.be.a('string');
              });
          });
      });
    });
  });
});

describe('Fetching tables', () => {
  before(() => runServer(TEST_DATABASE_URL));
  beforeEach(() => seedUsers(testData));
  afterEach(() => tearDownDb());
  after(() => closeServer());

  /* get all tables for a user */
  describe('GET /api/v1/tables/:userId - get all tables for the user supplied in the req params', () => {
    it('should return back all tables for an existing user', () => {
      let userId;
      return User.findOne().exec().then(user => {
        userId = user.id;
        return chai.request(app).get(`/api/v1/tables/${userId}`).then(res => {
          res.should.exist;
          res.should.be.json;
          res.status.should.equal(200);
          res.body.should.be.an('array');
          res.body.should.have.length.above(0);
        });
      });
    });
  });
  describe('GET /api/v1/tables/:userId/:tableId - return a table for the user specified by the req params', () => {
    it('should return back a single table that matches the url params', () => {
      let userId;
      let tableId;
      return User.findOne().exec().then(userObject => {
        console.log(`here in the tests ${userObject}`);
        userId = userObject.id;
        tableId = userObject.tableData.tables[0].id;
        return chai
          .request(app)
          .get(`/api/v1/tables/${userId}/${tableId}`)
          .then(res => {
            // console.log(`HEre in the test ${res.body}`);
            res.should.exist;
            res.should.be.json;
            res.status.should.equal(200);
          });
      });
    });
  });
});
