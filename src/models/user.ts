import { compare, genSalt, hash } from 'bcrypt';
import * as mongoose from 'mongoose';

import { IUser } from '../interfaces';
import { ProductSchema } from './product';

const SALT_FACTOR = 12;

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

const hashPassword = async (password: string): Promise<string> => {
  try {
    if (!password) {
      return null;
    }
    const hashedPassword = await hash(password, SALT_FACTOR);
    return hashedPassword;
  } catch (err) {
    console.log(err);
  }
};

userSchema.methods.comparePassword = async function(
  password: string
): Promise<Boolean> {
  try {
    return await compare(password, this.password);
  } catch (err) {
    console.log(err);
  }
};

userSchema.pre('save', async function(next) {
  try {
    /* this is the user object */
    !this.isModified('password') && next();
    const hashedPassword = await hash(this.password, SALT_FACTOR);
    this.password = hashedPassword;
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.pre('findOneAndUpdate', async function(next) {
  const password = await hashPassword(this.getUpdate().$set.password);

  !password && next();

  this.findOneAndUpdate({}, { password });
});

// tslint:disable-next-line:variable-name
const User = mongoose.model<IUserModel>('User', userSchema, 'User');

export = User;
