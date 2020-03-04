const { ObjectID } = require('mongodb')
const jwt = require('jsonwebtoken')

const { User } = require('../../models/user')
const { Album } = require('../../models/album')
const { Like } = require('../../models/like')
const { Playlist } = require('../../models/playlist')
const { Track } = require('../../models/track')
const { album1, album2, track1, track2, playlist1, likes1,
    likes2 } = require('./data')


const userOneId = new ObjectID()
const userTwoId = new ObjectID()
const AlbumOneId = new ObjectID()
const AlbumTwoId = new ObjectID()
const TrackOneId = new ObjectID()
const TrackTwoId = new ObjectID()
const PlaylistId = new ObjectID()

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
            token: jwt.sign({ _id: userOneId, access: 'auth' }, process.env.JWT_SECRET).toString()
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
            token: jwt.sign({ _id: userTwoId, access: 'auth' }, process.env.JWT_SECRET).toString()
        }]
    }
]

const albums = [
    {
        _id: AlbumOneId,
        _creator: userOneId,
        information: album1,
        createdAt: new Date().getTime()
    },
    {
        _id: AlbumTwoId,
        _creator: userTwoId,
        information: album2,
        createdAt: new Date().getTime()
    }
]

const tracks = [
    {
        _id: TrackOneId,
        _creator: userOneId,
        information: track1,
        createdAt: new Date().getTime()
    },
    {
        _id: TrackTwoId,
        _creator: userTwoId,
        information: track2,
        createdAt: new Date().getTime()
    }
]

const playlists = [
    {
        _id: PlaylistId,
        _creator: userOneId,
        information: playlist1,
        createdAt: new Date().getTime()
    }
]

const likes = [
    {
        _id: TrackOneId,
        _creator: userOneId,
        information: track1,
        createdAt: new Date().getTime(),
        type: 'track'
    },
    {
        _id: AlbumOneId,
        _creator: userOneId,
        information: album1,
        createdAt: new Date().getTime(),
        type: 'track'
    }
]

const populateUsers = (done) => {
    User.deleteMany({}).then(() => {
        const user1 = new User(users[0]).save()
        const user2 = new User(users[1]).save()

        return Promise.all([user1, user2])
    }).then(() => done())
}

const populateAlbums = (done) => {
    Album.deleteMany({}).then(() => {
        return Album.insertMany(albums);
    }).then(() => done())
}

const populateTracks = (done) => {
    Track.deleteMany({}).then(() => {
        return Track.insertMany(tracks);
    }).then(() => done())
}


const populatePlaylists = (done) => {
    Playlist.deleteMany({}).then(() => {
        return Playlist.insertMany(playlists);
    }).then(() => done())
}

const populateLikes = (done) => {
    Like.deleteMany({}).then(() => {
        return Like.insertMany(likes);
    }).then(() => done())
}

module.exports = { 
    users, 
    albums, 
    tracks, 
    playlists, 
    likes,
    populateUsers,
    populateAlbums,
    populatePlaylists,
    populateTracks,
    populateLikes
}