const { User } = require('../models/user')

const authenticate = (req, res, next) => {
    if (req.params.type && req.params.type !== 'track') {
        return next()
    }
    const token = req.header('authorization').split(' ')[1]

    User.findByToken(token).then(user => {
        if (!user) {
            return Promise.reject()
        }

        req.user = user;
        req.token = token; 
        next()
    }).catch(e => {
        res.status(401).send(e)
    }) 
}

module.exports = {
    authenticate
}