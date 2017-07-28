const User = require('../models/user');

exports.userGetAll = (req, res, next) => {
  res.send('SOMETHING');
};

exports.userGetById = (req, res, next) => {
  res.send('SOMETHING ELSE');
};

exports.userUpdateById = (req, res, next) => {
  res.send('UPDATE BY ID');
};

exports.userCreate = (req, res, next) => {
  res.send('CREATE NEW USER');
};

exports.userDeleteById = (req, res, next) => {
  res.send('DELETE USER');
};
