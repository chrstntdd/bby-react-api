const faker = require('faker');
const crypto = require('crypto');
const fs = require('fs');

const generateUser = () => ({
  _id: faker.random.uuid(),
  email: faker.internet.email(),
  password: faker.internet.password(),
  profile: {
    firstName: faker.name.firstName(),
    lastName: faker.name.lastName()
  },
  employeeNum: generateEmployeeNumber(),
  storeNum: faker.random.number({
    min: 1,
    max: 2000
  }),
  role: faker.random.arrayElement(['Member', 'Client', 'Owner', 'Admin']),
  resetPasswordToken: generateRandomBytes(),
  resetPasswordExpires: faker.date.future(0.1), //IN YEARS
  confirmationEmailToken: generateRandomBytes(),
  isVerified: faker.random.boolean(),
  created: faker.date.past(0.1), //IN YEARS
  tableData: {
    tableMetadata: '',
    tables: generateArrOfTables()
  }
});

const generateEmployeeNumber = () => {
  let letters = [
    'a',
    'b',
    'c',
    'd',
    'e',
    'f',
    'g',
    'h',
    'i',
    'j',
    'k',
    'l',
    'm',
    'n',
    'o',
    'p',
    'q',
    'r',
    's',
    't',
    'u',
    'v',
    'w',
    'x',
    'y',
    'z'
  ];
  let nums = faker.random.number({
    min: 1,
    max: 2000000
  });
  let randomNum = Math.round(Math.random() * letters.length);
  return `${letters[randomNum]}${nums}`;
};

const generateRandomBytes = () => {
  let token = crypto.randomBytes(24);
  return token.toString('hex');
};

const generateArrOfTables = () => {
  let tables = [];
  for (let i = 0; i < 5; i++) {
    tables.push(generateTable());
  }
  return tables;
};

const generateTable = () => {
  /* generate a single table instance */
  let table = {
    id: faker.random.uuid(),
    createdOn: faker.date.recent(0.1), // IN YEARS
    products: []
  };
  for (let i = 0; i < 20; i++) {
    table.products.push(randomProductData());
  }
  return table;
};

/* generate a random product with data */
const randomProductData = () =>
  ({
    name: faker.commerce.product(),
    sku: faker.random.number({
      min: 1000000,
      max: 9999999
    }),
    upc: faker.random
      .number({
        min: 100000000000,
        max: 999999999999
      })
      .toString(),
    department: faker.commerce.department(),
    departmentId: faker.random.number(),
    modelNumber: faker.lorem.word(),
    classId: faker.random.number(),
    value: faker.finance.amount(),
    quantity: faker.random.number({ min: 0, max: 20 }),
    init: function() {
      this.totalValue = Math.floor(this.value * this.quantity);
      return this;
    }
  }.init());

/* main output function */
const fiveUsers = () => {
  let users = [];
  /* generate five users */
  for (let i = 0; i < 5; i++) {
    users.push(generateUser());
  }
  return users;
};

const output = JSON.stringify(fiveUsers());

fs.writeFile('./testdata.json', output, 'utf8', err => {
  if (err) return console.error(err);
  console.log('THE FILE WAS SAVED. THANK JESUS');
});
