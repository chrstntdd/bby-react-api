import * as mocha from 'mocha';
import * as chai from 'chai';
import chaiHttp = require('chai-http');

import app from '../src/App';

chai.use(chaiHttp);
const expect = chai.expect;

describe('GET api/v1/users', () => {
  it('should respond with a JSON array', () => {
    return chai.request(app).get('/api/v1/users').then(res => {
      expect(res.status).to.equal(200);
      expect(res).to.be.json;
      expect(res.body).to.be.an('array');
      expect(res.body).to.have.length(5);
    });
  });
});
