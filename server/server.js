require('./config/config')

const _ = require('lodash')
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')

const { mongoose } = require('./db/mongoose')
const { User } = require('./models/user')

const port =  process.env.PORT
const app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(cors())

/*** SignUp Route */
app.post('/signup', (req, res) => {
    let body = _.pick(req.body, ['email', 'password', 'name', 'phone-number', 'address'])

    User.findExistingEmail(body.email).then(email => {
        if (email) {
            return res.send('User already exists')
        }
    })
    
    const user = new User(body)

    user.save().then(() => {
        return user.generateAuthToken()
    }).then(() => {
        res.send(user)
    }).catch(e => {
        console.log(e)
        res.status(404).send(`New error found ${e}`)
    })
})

app.post('/show', (req, res) => {
    let body = _.pick(req.body, ['email', 'password', 'name', 'phone-number', 'address'])

    res.send({
        thanks: 'that',
        email: body.email,
        password: body.password
    })
})

app.get('/get', (req, res) => {
    res.send('i am being sent')
})

/*****Login Route */
app.post('/login', (req, res) => {
    const body = _.pick(req.body, ['email', 'password'])

    User.findByCredentials(body.email, body.password).then(user => {
        if (!user._id) {
            return res.send(user)
        } else {
            return user.generateAuthToken().then(() => {
                res.send(user)
            })
        }
    }).catch(e => {
        res.status(400).send(`not here and error: ${e}`)
    })
})

/******Reset password */
app.post('/reset', (req, res) => {
    const body = _.pick(req.body, ['email', 'password', 'newpassword'])

    User.findByCredentials(body.email, body.password).then(user => {
        if (!user._id) {
            return res.send(user)
        } else {
            user.password = body.newpassword
            user.save().then(user => {
                res.send(user)
            }).catch(e => res.status(400).send(e))
        }
    }).catch(e => {
        res.status(400).send(`not here and error: ${e}`)
    })
})

app.listen(port, () => {
    console.log(`server listening on port ${port}`)
})