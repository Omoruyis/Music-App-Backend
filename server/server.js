require('./config/config')

const _ = require('lodash')
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')

const { mongoose } = require('./db/mongoose')
const { User } = require('./models/user')
const { Track } = require('./models/track')
const { Album } = require('./models/album')
const { Playlist } = require('./models/playlist')
const { Artist } = require('./models/artist')
const { callAxios, callAxiosData } = require('./config/deezer')
const { authenticate } = require('./middleware/authenticate')

const port = process.env.PORT
const app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(cors())


/*** SignUp Route */
app.post('/signup', async (req, res) => {
    let body = _.pick(req.body, ['email', 'password', 'firstName', 'lastName', 'phoneNumber'])
    let action

    try {
        action = await User.findExistingEmail(body.email)
        if (action) {
            return res.send(action)
        }
    } catch (e) {
        res.status(400).send(e)
    }

    const user = new User(body)

    user.save().then(() => {
        return user.generateAuthToken()
    }).then(() => {
        let response = _.pick(user, ['email', 'firstName', 'lastName', 'phoneNumber', 'tokens'])
        res.send(response)
    }).catch(e => {
        res.status(404).send(`New error found ${e}`)
    })
})


/*****Login Route */
app.post('/login', (req, res) => {
    const body = _.pick(req.body, ['email', 'password'])

    User.findByCredentials(body.email, body.password).then(user => {
        if (!user._id) {
            return res.send(user)
        } else {
            return user.generateAuthToken().then(() => {
                let response = _.pick(user, ['email', 'firstName', 'lastName', 'phoneNumber', 'token'])
                res.send(response)
            })
        }
    }).catch(e => {
        res.status(400).send(`not here and error: ${e}`)
    })
})

/******Reset password */
app.post('/reset', (req, res) => {
    const body = _.pick(req.body, ['email', 'password', 'newPassword'])

    User.findByCredentials(body.email, body.password).then(user => {
        if (!user._id) {
            return res.send(user)
        } else {
            user.password = body.newPassword
            user.save().then(() => {
                res.send('Your password has been changed successfully')
            }).catch(e => res.status(400).send(e))
        }
    }).catch(e => {
        res.status(400).send(`not here and error: ${e}`)
    })
})

/*******Search */
app.get('/search', async (req, res) => {
    try {
        const body = _.pick(req.body, ['searchQuery'])
        let result = {}
        result.tracks = await callAxios('get', `/search/track?q=${body.searchQuery}`)
        result.albums = await callAxios('get', `/search/album?q=${body.searchQuery}`)
        result.artists = await callAxios('get', `/search/artist?q=${body.searchQuery}`)
        result.playlists = await callAxios('get', `/search/playlist?q=${body.searchQuery}`)
        let allResults = await callAxios('get', `/search?q=${body.searchQuery}`)
        result.topResults = {}
        result.topResults.artist = allResults[0].artist
        result.topResults.album = allResults[0].album
        result.topResults.track = allResults[0]
        res.send(result)
    } catch (e) {
        res.status(400).send(e)
    }
})


app.get('/search/:type', authenticate, async (req, res) => {
    try {
        const type = req.params.type
        const body = _.pick(req.body, ['id'])
        if (type === 'artist') {
            let result = {}
            result.mostPlayed = await callAxios('get', `/${type}/${body.id}/top`)
            result.tracklist = await callAxios('get', `/${type}/${body.id}/top?limit=50`)
            result.relatedArtists = await callAxios('get', `/${type}/${body.id}/related`)
            result.playlists = await callAxios('get', `/${type}/${body.id}/playlists`)
            result.albums = await callAxios('get', `/${type}/${body.id}/albums`)
            return res.send(result)
        } else if (type === 'track') {
            return res.send(`https://www.deezer.com/track/${body.id}`)
        }
        const tracks = await callAxios('get', `/${type}/${body.id}/tracks`)
        res.send(tracks)
    } catch (e) {
        res.status(400).send(e)
    }
})


/*********Explore for Home Page */
app.get('/explore', async (req, res) => {
    let result = {}
    result.chartAlbums = await callAxios('get', `/chart/0/albums`)
    // result.chartArtists = await callAxios('get', `/chart/0/artists`)
    result.tracks = await callAxios('get', `/chart/0/tracks`)
    // result.playlists = await callAxios('get', `/chart/0/playlists`)
    res.send(result)
})

/**********Add music */
app.post('/add', authenticate, async (req, res) => {
    try {
        const body = _.pick(req.body, ['type', 'id'])
        const add = await callAxiosData('get', `/${body.type}/${body.id}`)

        const Type = body.type === 'track' ? Track : body.type === 'album' ? Album : Playlist

        const action = await Type.findExistingInformation(req.user._id, add.id)
        if (action) {
            return res.send(action)
        }

        if (body.type !== 'playlist') {
            const existingArtist = await Artist.findExistingInformation(req.user._id, add.artist.id)

            if (!existingArtist) {
                const artist = new Artist({
                    _creator: req.user._id,
                    name: add.artist.name,
                    id: add.artist.id,
                    picture: add.artist.picture,
                    createdAt: new Date().getTime()
                })

                await artist.save()
            }
        }

        const data = new Type({
            _creator: req.user._id,
            information: add,
            createdAt: new Date().getTime()
        })

        const result = await data.save()
        res.send(result)
    } catch (e) {
        res.status(400).send(e)
    }
})

app.post('/createplaylist', authenticate, async (req, res) => {
    try {
        const body = _.pick(req.body, ['title'])

        const data = new Type({
            _creator: req.user._id,
            information: { title: body.title },
            createdAt: new Date().getTime()
        })


    } catch (e) {
        res.status(400).send(e)
    }
})

app.get('/alltracks', authenticate, async (req, res) => {
    try {
        const tracks = await Track.aggregate([{ $match: { _creator: req.user._id } }, { $sort: { 'information.title': 1 } }, { $project: { track: '$information', cover: '$information.album.cover', type: '$information.type' } }])
        let album = await Album.aggregate([{ $match: { _creator: req.user._id } }, { $sort: { 'information.title': 1 } }, { $project: { track: '$information.tracks.data', cover: '$information.cover', type: '$information.type' } }, { $unwind: { path: '$track' } }])
        result = tracks.concat(album).sort((a, b) => a.track.title < b.track.title ? -1 : a.track.title > b.track.title ? 1 : 0)
        res.send(result)
    } catch (e) {
        res.status(400).send(e)
    }
})

app.get('/allalbums', authenticate, async (req, res) => {
    try {
        const albums = await Album.aggregate([{ $match: { _creator: req.user._id } }, { $sort: { 'information.title': 1 } }])
        res.send(albums)
    } catch (e) {
        res.status(400).send(e)
    }
})

app.get('/allplaylists', authenticate, async (req, res) => {
    try {
        const playlists = await Playlist.aggregate([{ $match: { _creator: req.user._id } }, { $sort: { 'information.title': 1 } }])
        res.send(playlists)
    } catch (e) {
        res.status(400).send(e)
    }
})

app.get('/allartists', authenticate, async (req, res) => {
    try {
        const album = await Album.aggregate([{ $match: { _creator: req.user._id } }, { $group: { _id: { id: '$information.artist.id', name: '$information.artist.name', picture: '$information.artist.picture' } } }, { $sort: { 'information.title': 1 } }, { $project: { id: '$_id.id', name: '$_id.name', picture: '$_id.picture', _id: 0 } }])

        const tracks = await Track.aggregate([{ $match: { _creator: req.user._id } }, { $group: { _id: { id: '$information.artist.id', name: '$information.artist.name', picture: '$information.artist.picture' } } }, { $sort: { 'information.title': 1 } }, { $project: { id: '$_id.id', name: '$_id.name', picture: '$_id.picture', _id: 0 } }])

        let result = [].concat(album).concat(tracks)
        result = result.reduce((obj, cur) => {
            if (!obj[cur.id]) obj[cur.name] = { name: cur.name, id: cur.id, picture: cur.picture }
            return obj
        }, {})
        let keys = Object.keys(result)
        keys = keys.map(key => {
            return {
                name: result[key].name,
                id: result[key].id,
                picture: result[key].picture
            }
        })
        res.send(keys)
    } catch (e) {
        res.status(400).send(e)
    }
})

app.get('/artist/music', authenticate, async (req, res) => {
    try {
        const body = _.pick(req.body, ['id'])
        const tracks = await Track.find({ _creator: req.user._id, 'information.artist.id': body.id })
        const albums = await Album.aggregate([{ $match: { _creator: req.user._id, 'information.artist.id': body.id } }])
        const music = tracks.concat(albums).sort((a, b) => a.information.title < b.information.title ? -1 : a.information.title > b.information.title ? 1 : 0)
        res.send(music)
    } catch (e) {
        res.status(400).send(e)
    }
})

app.get('/recentlyAdded', authenticate, async (req, res) => {
    try {
        const playlists = await Playlist.aggregate([{ $sort: { 'information.createdAt': 1 } }])
        const tracks = await Track.aggregate([{ $sort: { 'information.createdAt': 1 } }])
        const albums = await Album.aggregate([{ $sort: { 'information.createdAt': 1 } }])
        const result = playlists.concat(tracks).concat(albums).sort((a, b) => a['createdAt'] - b['createdAt']).map(cur => cur.createdAt).slice(0, 20)
        res.send(result)
    } catch (e) {
        res.status(400).send(e)
    }
})


app.listen(port, () => {
    console.log(`server listening on port ${port}`)
})