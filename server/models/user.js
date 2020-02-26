const mongoose = require('mongoose')
const validator = require('validator')
const jwt = require('jsonwebtoken')
const _ = require('lodash')
const bcrypt = require('bcryptjs')

var UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        minlength: 1,
        trim: true,
        unique: true,
        validate: {
            validator: validator.isEmail,
            message: '{VALUE} is not a valid email'
        },
    }, 
    password: {
        type: String,
        required: true,
        minlength: 6
    }, 
    firstName: {
        type: String,
        required: true,
        trim: true
    }, 
    lasName: {
        type: String,
        required: true,
        trim: true
    }, 
    phoneNumber: {
        type: Number,
        required: true,
        trim: true,
    }, 
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
})   

/****MongooseSchema methods */
UserSchema.methods.generateAuthToken = function () {
    let user = this
    const access = 'auth'
    const token = jwt.sign({_id: user._id.toHexString(), access}, process.env.JWT_SECRET).toString()

    user.tokens = user.tokens.concat([{access, token}]) 

    return user.save().then(() => {
        return token
    })  
}



/******MongooseSchema statics */
UserSchema.statics.findByCredentials = function (email, password) {
    const User = this;

    return User.findOne({ email }).then(user => {

        return new Promise((resolve, reject) => {
            if (!user) {
                resolve('Wrong email address')
            }

            bcrypt.compare(password, user.password, (err, res) => {
                if (res) {
                    resolve(user)
                }
                else {
                    resolve('Wrong password')
                }
            })
        })
    })
}

UserSchema.statics.findExistingEmail = function (email) {
    const User = this

    return User.findOne({ email }).then(user => {
        return new Promise((resolve, reject) => {
            if (user) {
                resolve('User already exists')
            } else {
                resolve(null)
            }
        })
    })
}

UserSchema.pre('save', function (next) {
    const user = this;

    if (!user.isModified('password')) next()

    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(user.password, salt, (err, hash) => {
            user.password = hash
            next()
        })
    });
})

const User = mongoose.model('User', UserSchema);

module.exports = { User };