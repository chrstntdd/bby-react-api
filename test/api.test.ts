import { generateNewUser, generateTable, generateUser } from '../generateTestData.js';
import Api from '../src/Api';
import { closeServer, runServer } from '../src/index';
import User = require('../src/models/user');

require('dotenv').config();
const app = new Api().express;

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const morgan = require('morgan');
const should = chai.should();

/* this is fake array of 5 users with a full profile */
const testData = require('../testdata.json');

chai.use(chaiHttp);

mongoose.Promise = global.Promise;
process.env.NODE_ENV = 'test';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

const seedUsers = async testData => {
  try {
    await User.insertMany(testData);
  } catch (err) {
    console.error(err);
  }
};

const tearDownDb = async () => await mongoose.connection.dropDatabase();

describe('The API', () => {
  before(() => runServer(TEST_DATABASE_URL));
  beforeEach(() =>
    seedUsers(testData)
      .then(() => {
        return;
      })
      .catch(err => {
        console.log(err);
      })
  );
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
      return chai
        .request(app)
        .get('/api/v1/users')
        .then(res => {
          res.status.should.equal(200);
          res.should.be.json;
          res.body.should.be.an('array');
        });
    });
    it('should return user objects with the correct props', () => {
      return chai
        .request(app)
        .get('/api/v1/users')
        .then(res => {
          const user = res.body[1];
          const userKeys = Object.keys(user);
          expectedProps.forEach(key => {
            userKeys.should.include(key);
          });
        });
    });
    it("shouldn't return a user object with extra props", () => {
      return chai
        .request(app)
        .get('/api/v1/users')
        .then(res => {
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
      return User.findOne().then(userObject => {
        userId = userObject._id;
        return chai
          .request(app)
          .get(`/api/v1/users/${userId}`)
          .then(res => {
            res.status.should.equal(200);
            res.should.be.json;
            res.body.should.be.an('object');
            res.body.should.include.keys(expectedProps);
          });
      });
    });
    it('should 400 for a request containing a nonexistent id', async () => {
      const newId = mongoose.Types.ObjectId();
      try {
        let res;
        res = await chai.request(app).get(`/api/v1/users/${newId}`);
      } catch (err) {
        err.should.exist;
        err.status.should.equal(404);
        const errorMsg = JSON.parse(err.response.error.text);
        errorMsg.should.be.an('object');
        errorMsg.should.contain.keys('error');
      }
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

    it('should create a new user when all the required fields are submitted', async () => {
      const newUser = generateNewUser();
      let res;
      res = await chai
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
        });
      res.should.exist;
      res.should.be.json;
      res.status.should.equal(201);
      res.body.should.contain.keys('message');
      res.body.message.should.be.a('string');

      let createdUser;
      createdUser = await User.findOne({ email: newUser.email });
      createdUser.should.exist;
    });
    it('should 409 for a existing user trying to register with valid credentials', () => {
      return User.findOne().then(userObject => {
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
      return User.findOne().then(userObject => {
        return chai
          .request(app)
          .del(`/api/v1/users/${userObject.id}`)
          .then(res => {
            res.status.should.equal(202);
            res.should.be.json;
            res.body.should.contain.keys('message');
            return User.findById(userObject.id);
          })
          .then(_userObject => {
            should.not.exist(_userObject);
          });
      });
    });
    it("should return an error if the user with the requested id doesn't  exist", async () => {
      try {
        const newId = mongoose.Types.ObjectId();
        let res;
        res = await chai.request(app).del(`/api/v1/users/${newId}`);
      } catch (err) {
        err.should.exist;
        err.status.should.equal(404);
        const errorMsg = JSON.parse(err.response.error.text);
        errorMsg.should.be.an('object');
        errorMsg.should.contain.keys('error');
      }
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
      return User.findOne().then(userObject => {
        dataToUpdate.id = userObject.id;

        return chai
          .request(app)
          .put(`/api/v1/users/${userObject.id}`)
          .send(dataToUpdate)
          .then(res => {
            res.should.be.json;
            res.body.should.contain.keys('message');
            return User.findById(dataToUpdate.id);
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
    it("should return an error if the user with the requested id doesn't exist", async () => {
      try {
        const newId = mongoose.Types.ObjectId();
        const pathToNonExistentUser = `/api/v1/users/${newId}`;
        const dataToUpdate = {
          id: null,
          profile: {
            firstName: 'Clarice',
            lastName: 'Thompson'
          },
          storeNumber: 420,
          password: 'supersecret password'
        };

        let res;
        res = await chai
          .request(app)
          .put(pathToNonExistentUser)
          .send(dataToUpdate);
      } catch (err) {
        err.should.exist;
        err.status.should.equal(404);
        const errorMsg = JSON.parse(err.response.error.text);
        errorMsg.should.be.an('object');
        errorMsg.should.contain.keys('error');
      }
    });

    it('should reject updates to restricted props', () => {
      const dataToUpdate = {
        employeeNumber: '1075394',
        role: 'Admin',
        isVerified: true,
        id: null
      };
      return User.findOne().then(userObject => {
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

  /* User verify account */
  describe('POST /api/v1/users/verify-email/:token - verify users account to allow for use of the service', () => {
    it('should flip the isVerified prop on a users account', () => {
      return User.findOne().then(userObject => {
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
    it('should set a reset token on the users account', async () => {
      let existingUser;
      let res;
      let updatedUser;
      existingUser = await User.findOne();

      const { _id, employeeNumber, resetPasswordToken } = existingUser;

      res = await chai
        .request(app)
        .post('/api/v1/users/forgot-password')
        .send({ employeeNumber });
      res.should.exist;
      res.should.be.json;
      res.status.should.equal(200);
      res.body.should.contain.keys('message');

      updatedUser = await User.findById(_id);

      updatedUser.resetPasswordToken.should.not.equal(resetPasswordToken);
      updatedUser.resetPasswordToken.should.be.a('string');
    });
    it('should return an error message if the email is blank', () => {
      return chai
        .request(app)
        .post('/api/v1/users/forgot-password')
        .then(res => {
          res.status.should.equal(400);
        })
        .catch(err => {
          err.should.exist;
          err.status.should.equal(400);
          const validationMsg = JSON.parse(err.response.error.text);
          validationMsg.should.be.an('object');
          validationMsg.validationErrors.should.be.an('array');
          validationMsg.validationErrors.should.have.length.of.at.least(1);
        });
    });
    it('should return an error message if the employeeNumber is invalid', () => {
      const invalidEmployeeNumber = '.$*';
      return chai
        .request(app)
        .post('/api/v1/users/forgot-password')
        .send({ employeeNumber: invalidEmployeeNumber })
        .then(res => {
          res.status.should.equal(400);
        })
        .catch(err => {
          err.should.exist;
          err.status.should.equal(400);
          const validationMsg = JSON.parse(err.response.error.text);
          validationMsg.should.be.an('object');
          validationMsg.validationErrors.should.be.an('array');
          validationMsg.validationErrors.should.have.length.of.at.least(1);
          validationMsg.validationErrors[0].value.should.equal(
            invalidEmployeeNumber
          );
        });
    });
    it("should return an error message if the user can't be found with the supplied email", () => {
      return chai
        .request(app)
        .post('/api/v1/users/forgot-password')
        .send({ employeeNumber: 'a1075394' })
        .then(res => {
          res.should.exist;
          res.status.should.equal(404);
        })
        .catch(err => {
          err.should.exist;
          err.status.should.equal(404);
          const validationMsg = JSON.parse(err.response.error.text);
          validationMsg.should.be.an('object');
          validationMsg.error.should.be.a('string');
        });
    });
  });

  /* Reset password handler */
  describe('POST /api/v1/users/reset-password/:token - handle setting new password and resetting reset tokens', () => {
    it('should allow existing users to reset their password', async () => {
      let existingUser;

      existingUser = await User.findOne();
      const { employeeNumber } = existingUser;

      /* make request to reset password */
      const forgotPasswordRes = await chai
        .request(app)
        .post('/api/v1/users/forgot-password')
        .send({ employeeNumber });

      /* forgot password should succeed */
      forgotPasswordRes.should.exist;
      forgotPasswordRes.should.be.json;
      forgotPasswordRes.status.should.equal(200);
      const { resetToken } = forgotPasswordRes.body;

      const resetPasswordRes = await chai
        .request(app)
        .post(`/api/v1/users/reset-password/${resetToken}`)
        .send({ password: 'superSecretPassword' });

      resetPasswordRes.should.exist;
      resetPasswordRes.should.be.json;
      resetPasswordRes.status.should.equal(200);
    });
    it("should return an error if the token doesn't match an existing user", () => {
      return User.findOne().then(userObject => {
        const { employeeNumber } = userObject;
        return chai
          .request(app)
          .post('/api/v1/users/forgot-password')
          .send({ employeeNumber })
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
                res.status.should.equal(400);
              })
              .catch(err => {
                err.should.exist;
                err.status.should.equal(400);
                const errorMsg = JSON.parse(err.response.error.text);
                errorMsg.error.should.be.a('string');
              });
          });
      });
    });
  });
});

describe('Manipulating/viewing persisted table data', () => {
  let signedInUserJWT;
  let signedInUserEmail;
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
    signedInUserJWT = signInResponse.body.token;
  });
  afterEach(() => tearDownDb());
  after(() => closeServer());
  describe('GET /api/v1/users/:id/table', () => {
    it('should return a products array when requested with a valid JWT', async () => {
      const user = await User.findOne({ email: signedInUserEmail });
      const { id } = user;
      const res = await chai
        .request(app)
        .get(`/api/v1/users/${id}/table`)
        .set({ Authorization: signedInUserJWT });
      res.should.exist;
      res.should.be.json;
      res.status.should.equal(200);
      res.body.should.contain.key('products');
      res.body.products.should.be.an('array');
    });
    it('should return unauthorized when requested without a valid JWT', async () => {
      const user = await User.findOne({ email: signedInUserEmail });
      const { id } = user;
      try {
        const res = await chai.request(app).get(`/api/v1/users/${id}/table`);
      } catch (err) {
        err.should.exist;
        err.status.should.equal(401);
      }
    });
  });
  describe('PUT /api/v1/users/:id/table', () => {
    it("should update the user's products array  with a valid JWT", async () => {
      const table = generateTable();
      const user = await User.findOne({ email: signedInUserEmail });
      const { id } = user;
      const res = await chai
        .request(app)
        .put(`/api/v1/users/${id}/table`)
        .set({ Authorization: signedInUserJWT })
        .send({
          currentTableState: table.products
        });
      res.should.exist;
      res.should.be.json;
      res.status.should.equal(201);
    });
    it('should return unauthorized without a valid JWT', async () => {
      const table = generateTable();
      const user = await User.findOne({ email: signedInUserEmail });
      const { id } = user;
      try {
        const res = await chai
          .request(app)
          .put(`/api/v1/users/${id}/table`)
          .send({
            currentTableState: table.products
          });
      } catch (err) {
        err.should.exist;
        err.status.should.equal(401);
      }
    });
  });
});

/* User sign in */
describe('POST /api/v1/users/sign-in - allow user to authenticate and receive JWT ', () => {
  before(() => runServer(TEST_DATABASE_URL));
  afterEach(() => tearDownDb());
  after(() => closeServer());

  it('should allow a user to sign in and issue a valid JWT', async () => {
    /* We forgo the normal .insertMany() call here in favor of .create() 
     * .insertMany() wont let us .save() and generate the hashed password 
     * required for login. So we generate a random user, grab their auth 
     * credentials, then .create() them to hash their password in the db.
     * 
     * Next, we set their isVerified to true, then send in their original 
     * email and password with the POST request.
     */
    const user = generateUser();
    /* raw email and password. */
    const { email, password } = user;

    await User.create(user);
    const userObject = await User.findOne({ email });
    userObject.isVerified = true;
    await userObject.save();
    const requestBody = {
      email,
      password
    };
    const res = await chai
      .request(app)
      .post('/api/v1/users/sign-in')
      .send(requestBody);

    res.should.exist;
    res.should.be.json;
    res.status.should.equal(200);
    res.body.should.contain.keys('token', 'user');
  });
  it('passport should return a 400 if email is empty', () => {
    return chai
      .request(app)
      .post('/api/v1/users/sign-in')
      .send({ email: '', password: 'password' })
      .then(res => {
        res.status.should.equal(400);
      })
      .catch(err => {
        err.response.error.status.should.equal(400);
      });
  });
  it('should return validation errors if the email fails validation', () => {
    const invalidEmail = 'invalidemai1.com-';
    return chai
      .request(app)
      .post('/api/v1/users/sign-in')
      .send({ email: invalidEmail, password: 'password' })
      .then(res => {
        res.status.should.equal(400);
      })
      .catch(err => {
        const validationMsg = JSON.parse(err.response.error.text);
        err.should.exist;
        validationMsg.should.be.an('object');
        validationMsg.validationErrors.should.be.an('array');
        validationMsg.validationErrors.should.have.length.of.at.least(1);
        validationMsg.validationErrors[0].should.contain.keys(
          'param',
          'msg',
          'value'
        );
        err.response.error.status.should.equal(400);
      });
  });
});
