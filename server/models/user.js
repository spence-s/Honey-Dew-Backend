import mongoose, { Schema } from 'mongoose';
import { isEmail } from 'validator';
import jsonwebtoken from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import _ from 'lodash';
const jwt = jsonwebtoken;

var UserSchema = new mongoose.Schema({
  email: {
    address: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      unique: true,
      validate: {
        validator: isEmail,
        message: '{VALUE} is not a valid email'
      },
    isVerified: Boolean
    }
  },
  first_name: {
    type: String,
    trim: true
  },
  last_name: {
    type: String,
    trim: true
  },
  user_name: {
    type:String,
    trim: true
  },
  image: {
    url: {
      type: String,
      trim: true
    },
    file:{
      type: String,
      data: Buffer
    }
  },
  phone: {
    type: Number,
    trim: true
  },
  password: {
    type: String,
    minlength: 6
  },
  accounts: [{
    facebook: {
      name: String,
      email: String,
      uid: String,
      token: [{
          token: String,
          expiresIn: Number
      }]
    },
  }],
  tokens: [{
    access: {
      type: String,
      required: true
    },
    token: {
      type: String,
      required: true
    }
  }]
});

UserSchema.methods.toJSON = function () {
  var user = this;
  var userObject = user.toObject();
  return _.pick(userObject, ['_id', 'email']);
};

UserSchema.methods.generateAuthToken = function () {
  var user = this;
  var access = 'auth';
  var token = jwt.sign({_id: user._id.toHexString(), access}, process.env.JWT_SECRET || 'coolcat').toString();

  user.tokens.push({access, token});

  return user.save().then(() => {
    return token;
  });
};

UserSchema.methods.removeToken = function (token) {
  var user = this;

  return user.update({
    $pull: {
      tokens: {token}
    }
  });
};

UserSchema.statics.findByToken = function (token) {
  var User = this;
  var decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'coolcat');
  } catch (e) {
    return Promise.reject();
  }

  return User.findOne({
    '_id': decoded._id,
    'tokens.token': token,
    'tokens.access': 'auth'
  });
};

UserSchema.statics.findByCredentials = function (email, password) {
  var User = this;

  return User.findOne({email}).then((user) => {
    if (!user) {
      return Promise.reject();
    }

    return new Promise((resolve, reject) => {
      // Use bcrypt.compare to compare password and user.password
      bcrypt.compare(password, user.password, (err, res) => {
        if (res) {
          resolve(user);
        } else {
          reject();
        }
      });
    });
  });
};

UserSchema.pre('save', function (next) {
  var user = this;

  if (user.isModified('password')) {
    bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(user.password, salt, (err, hash) => {
        user.password = hash;
        next();
      });
    });
  } else {
    next();
  }
});

var User = mongoose.model('User', UserSchema);

export default User;
