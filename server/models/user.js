const mongoose = require('mongoose')
const validator = require('validator')
const jwt = require('jsonwebtoken')
const _ = require('lodash')
const bcrypt = require('bcryptjs')

var UserSchema = new mongoose.Schema({
    method: {
        type: String,
        enum: ['local', 'google']
    },
    local: {
        email: {
            type: String,
            minlength: 1,
            trim: true,
            validate: {
                validator: validator.isEmail,
                message: '{VALUE} is not a valid email'
            },
        }, 
        password: {
            type: String,
            minlength: 6
        }, 
        userName: {
            type: String,
            trim: true
        }, 
    },
    google: {
        id: {
            type: String
        },
        email: {
            type: String,
            lowercase: true
        },
        displayName: {
            type: String, 
        }
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

UserSchema.methods.removeToken = function (token) {
    const user = this

    return  user.update({
        $pull: {
            tokens: {
                token
            }
        }
    })
}


/******MongooseSchema statics */
UserSchema.statics.findByCredentials = function (_id, password) {
    const User = this;

    return User.findOne({ _id }).then(user => {

        return new Promise((resolve, reject) => {
            if (!user) {
                resolve(`User doesn't exist`)
            }

            bcrypt.compare(password, user.local.password, (err, res) => {
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

UserSchema.statics.findExistingGoogleAccount = function (id) {
    const User = this 

    return User.findOne({ 'google.id': id})

}

UserSchema.statics.findByToken = function (token) {
    const User = this

    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch(e) {
        return Promise.reject()
    }

    return User.findOne({
        '_id': decoded._id,
        'tokens.token': token,
        'tokens.access': 'auth'
    })
}

UserSchema.statics.findExistingEmail = function (email) {
    const User = this

    return User.findOne({ 'local.email': email }).then(user => {
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

    if (user.method !== 'local') {
        next()
    }

    if (!user.isModified('local.password')) next()

    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(user.local.password, salt, (err, hash) => {
            user.local.password = hash
            next()
        })
    });
})

const User = mongoose.model('User', UserSchema);

module.exports = { User };