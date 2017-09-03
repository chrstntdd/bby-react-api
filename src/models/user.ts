import * as mongoose from 'mongoose';
import { compare, hash, genSalt } from 'bcrypt-nodejs';
import { ProductSchema } from './product';
import { IUser } from '../interfaces';

interface IUserModel extends IUser, mongoose.Document {}

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      lowercase: true,
      unique: true,
      required: true
    },
    password: {
      type: String,
      required: true
    },
    profile: {
      firstName: {
        type: String
      },
      lastName: {
        type: String
      }
    },
    employeeNumber: {
      type: String
    },
    storeNumber: {
      type: Number
    },
    role: {
      type: String,
      enum: ['Member', 'Client', 'Owner', 'Admin'],
      default: 'Member'
    },
    resetPasswordToken: {
      type: String
    },
    resetPasswordExpires: {
      type: Date
    },
    confirmationEmailToken: {
      type: String
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    tableData: {
      tableMetadata: { type: String },
      products: [ProductSchema]
    }
  },
  {
    timestamps: true
  }
);

userSchema.virtual('fullName').get(function() {
  return `${this.profile.firstName} ${this.profile.lastName}`;
});

userSchema.virtual('url').get(function() {
  return `/api/v1/users/${this._id}`;
});

userSchema.pre('save', function(next) {
  const user = this;
  /* Yeah we bout that security */
  const SALT_FACTOR = 12;

  if (!user.isModified('password')) return next();

  /* Hash the user's password */
  genSalt(SALT_FACTOR, (err, salt) => {
    if (err) return next(err);
    hash(user.password, salt, null, (err, hash) => {
      if (err) return next(err);
      user.password = hash;
      next();
    });
  });
});

userSchema.methods.comparePassword = function(inputPassword, callback) {
  compare(inputPassword, this.password, (err, isMatch) => {
    err ? callback(err) : callback(null, isMatch);
  });
};

// tslint:disable-next-line:variable-name
const User = mongoose.model<IUserModel>('User', userSchema, 'User');

export = User;
