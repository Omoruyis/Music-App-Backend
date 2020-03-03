const { ObjectID } = require('mongodb')
const jwt = require('jsonwebtoken')

const { User } = require('../../models/user')
const { Album } = require('../../models/Album')
const { Artist } = require('../../models/artist')
const { Like } = require('../../models/like')
const { Playlist } = require('../../models/playlist')
const { Track } = require('../../models/track')
const { album1, album2, track1, track2, playlist1, likes1, 
likes2 } = require('./data')


const userOneId = new ObjectID()
const userTwoId = new ObjectID()
const users = [
    {
        _id: userOneId,
        email: 'omoruyi.isaac@example.com',
        password: 'userOnePass',
        firstName: 'Isaac',
        lastName: 'Omoruyi',
        phoneNumber: 9298839,
        tokens: [{
            access: 'auth',
            token: jwt.sign({_id: userOneId, access: 'auth'}, process.env.JWT_SECRET).toString()
        }]
    }, 
    {
        _id: userTwoId,
        email: 'jen@example.com',
        password: 'userTwoPass',
        firstName: 'Joshua',
        lastName: 'Omoruyi',
        phoneNumber: 8373732,
        tokens: [{
            access: 'auth',
            token: jwt.sign({_id: userTwoId, access: 'auth'}, process.env.JWT_SECRET).toString()
        }]
    }
]

const albums = [
    {
        _creator: userOneId,
        information: album1,
        createdAt: new Date().getTime()
    },
    {
        _creator: userTwoId,
        information: album2,
        createdAt: new Date().getTime()
    }
]

const tracks = [
    {
        _creator: userOneId,
        information: track1,
        createdAt: new Date().getTime()
    },
    {
        _creator: userTwoId,
        information: track2,
        createdAt: new Date().getTime()
    }
]

const playlists = [
    {
        _creator: userOneId,
        information: playlist1,
        createdAt: new Date().getTime()
    }
]

const likes = [{
    
}]