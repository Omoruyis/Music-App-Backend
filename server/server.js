require('./config/config')
require('./passport/passport')

const _ = require('lodash')
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const { ObjectID } = require('mongodb')
const passport = require('passport')

const { mongoose } = require('./db/mongoose')
const { User } = require('./models/user')
const { Track } = require('./models/track')
const { Album } = require('./models/album')
const { Playlist } = require('./models/playlist')
const { Like } = require('./models/like')
const { callAxios, callAxiosData } = require('./config/deezer')
const { authenticate } = require('./middleware/authenticate')

const port = process.env.PORT
const app = express()

app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(cors())

app.post('/googleLogin', async (req, res) => {
    try {
        const body = _.pick(req.body, ['id', 'email', 'displayName'])
        const user = await User.findExistingGoogleAccount(body.id)

        if (user) {
            const token = await user.generateAuthToken()
            let response = _.pick(user, ['method', 'google'])
            response.token = token
            return res.header('authorization', token).send(response)
        }

        const newUser = new User({
            method: 'google',
            google: {
                id: body.id,
                email: body.email,
                displayName: body.displayName
            }
        })
        const googleUser = await newUser.save()
        const token = await googleUser.generateAuthToken()
        let response = _.pick(googleUser, ['method', 'google'])
        response.token = token
        res.header('authorization', token).send(response)
    } catch (e) {
        res.status(400).send(e)
    }
})

/*** SignUp Route */
app.post('/signup', async (req, res) => {
    let body = _.pick(req.body, ['email', 'password', 'userName'])
    let action

    try {
        action = await User.findExistingEmail(body.email)
        if (action) {
            return res.send(action)
        }
    } catch (e) {
        res.status(400).send(e)
    }

    const user = new User({
        method: 'local',
        local: body
    })

    user.save().then(() => {
        let response = _.pick(user, ['method', 'local'])
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
            return user.generateAuthToken().then((token) => {
                let response = _.pick(user, ['method', 'local'])
                response.token = token
                res.header('authorization', token).send(response)
            })
        }
    }).catch(e => {
        res.status(400).send(`not here and error: ${e}`)
    })
})

// app.post('/login', passport.authenticate('local'), async (req, res) => {
//     try {
//         const token = req.user.token
//         res.header('authorization', token).send(req.user)
//     } catch (e) {
//         res.status(400).send(e)
//     }
// });

/*****Logout Route */
app.get('/logout', authenticate, async (req, res) => {
    try {
        await req.user.removeToken(req.token)
        res.status(200).send('successful')
    } catch (e) {
        console.log(e)
        res.status(400).send(e)
    }
});

/******Reset password Route*/
app.post('/reset', (req, res) => {
    const body = _.pick(req.body, ['email', 'password', 'newPassword'])

    User.findByCredentials(body.email, body.password).then(user => {
        if (!user._id) {
            return res.send(user)
        } else {
            user.local.password = body.newPassword
            user.save().then(() => {
                res.send('Your password has been changed successfully')
            }).catch(e => res.status(400).send(e))
        }
    }).catch(e => {
        res.status(400).send(`not here and error: ${e}`)
    })
})

/*******Public Search Route*/
app.post('/search', async (req, res) => {
    try {
        const body = _.pick(req.body, ['searchQuery'])
        let result = {}
        result.tracks = await callAxios('get', `/search/track?q=${body.searchQuery}`)
        result.albums = await callAxios('get', `/search/album?q=${body.searchQuery}`)
        result.artists = await callAxios('get', `/search/artist?q=${body.searchQuery}`)
        result.playlists = await callAxios('get', `/search/playlist?q=${body.searchQuery}`)
        let allResults = await callAxios('get', `/search?q=${body.searchQuery}`)
        result.topResults = {}
        if (allResults.length) {
            result.topResults.artist = allResults[0].artist
            result.topResults.album = allResults[0].album
            result.topResults.track = allResults[0]
        }
        res.send(result)
    } catch (e) {
        console.log(e)
        res.status(400).send(e)
    }
})

/*****Public search Route for specific type*/
app.post('/search/:type', async (req, res) => {
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
            result.typeDetails = await callAxiosData('get', `/${type}/${body.id}`)
            return res.send(result)
        } else if (type === 'track') {
            return res.send(`https://www.deezer.com/track/${body.id}`)
        }
        const typeDetails = await callAxiosData('get', `/${type}/${body.id}`)
        res.send(typeDetails)
    } catch (e) {
        res.status(400).send(e)
    }
})

app.get('/authenticate', (req, res) => {
    const token = req.header('authorization').split(' ')[1]

    User.findByToken(token).then(user => {
        if (!user) {
            return Promise.reject()
        }

        res.send('Welcome')
    }).catch(e => {
        res.status(401).send(e)
    })
})


/*********Explore for Home Page Route*/
app.get('/explore', async (req, res) => {
    try {
        let result = {}
        const first = await callAxiosData('get', `/chart`)
        result.chartAlbums = first.albums.data
        result.chartArtists = first.artists.data
        result.tracks = first.tracks.data
        // result.playlists = first.playlists.data
        res.send(result)
    } catch (e) {
        res.status(400).send(e)
    }
})

/***Find like */
app.post('/checklike', authenticate, async (req, res) => {
    try {
        const body = _.pick(req.body, ['id', 'type'])
        const result = await Like.findOne({ _creator: req.user._id, 'information.id': body.id, type: body.type })
        if (result) {
            return res.send(true)
        }
        res.send(false)
    } catch (e) {
        res.status(400).send(e)
    }
})

/*****Like without downloaded Route */
app.post('/likeUndownload', authenticate, async (req, res) => {
    try {
        const body = _.pick(req.body, ['type', 'data'])
        // const Type = body.type === 'track' ? Track : body.type === 'album' ? Album : Artist
        const result = await Like.findOne({ _creator: req.user._id, 'information.id': body.data.id, type: body.type })
        if (result) {
            return res.send('you already liked this')
        }
        const like = new Like({
            _creator: req.user._id,
            information: body.type === 'track' ? body.data : body.type === 'artist' ? { id: body.data.id, name: body.data.name, picture: body.data.picture_medium } : body.type === 'album' ? { id: body.data.id, title: body.data.title, picture: body.data.cover_medium } : { id: body.data.id, title: body.data.title, picture: body.data.picture },
            _id: new ObjectID(),
            createdAt: new Date().getTime(),
            type: body.type
        })

        const likeResult = await like.save()
        res.send(likeResult)
    } catch (e) {
        res.status(400).send(e)
    }
})

/*****unLike without downloaded Route */
app.post('/unlikeUndownload', authenticate, async (req, res) => {
    try {
        const body = _.pick(req.body, ['type', 'data'])
        const result = await Like.findOneAndRemove({ _creator: req.user._id, 'information.id': body.data.id, type: body.type })
        if (!result) {
            return res.send(`This ${body.type} doesn't exist in favourites`)
        }

        res.send(result)
    } catch (e) {
        res.status(400).send(e)
    }
})

/*****Like Route */
app.post('/like', authenticate, async (req, res) => {
    try {
        const body = _.pick(req.body, ['type', '_id', 'data'])
        const Type = body.type === 'track' ? Track : body.type === 'album' ? Album : Playlist

        if (!ObjectID.isValid(body._id)) {
            return res.status(404).send('This is not a valid ID')
        }
        const result = await Type.findOne({ _creator: req.user._id, _id: body._id })
        if (!result) {
            return res.send(`This ${body.type} doesn't exist`)
        }
        const found = await Like.findOne({ _creator: req.user._id, _id: body._id })
        if (found) {
            return res.send('You already liked it')
        }
        result.liked = true
        const response = await result.save()

        const like = new Like({
            _creator: req.user._id,
            _id: body._id,
            information: body.data,
            createdAt: new Date().getTime(),
            type: body.type
        })

        const likeResult = await like.save()
        res.send({
            response,
            likeResult
        })
    } catch (e) {
        console.log(e)
        res.status(400).send(e)
    }
})

/*****Unlike Route */
app.post('/unlike', authenticate, async (req, res) => {
    try {
        const body = _.pick(req.body, ['type', '_id'])
        const Type = body.type === 'track' ? Track : body.type === 'album' ? Album : Playlist

        if (!ObjectID.isValid(body._id)) {
            return res.status(404).send('This is not a valid ID')
        }

        const result = await Type.findOne({ _creator: req.user._id, _id: body._id })
        if (!result) {
            return res.send(`This ${body.type} doesn't exist`)
        }
        result.liked = false
        const response = await result.save()

        const remove = await Like.findOneAndRemove({ _creator: req.user._id, _id: body._id, type: body.type })
        if (!remove) {
            return res.send(`This ${body.type} doesn't exist in favourites`)
        }

        res.send({
            response,
            remove
        })
    } catch (e) {
        console.log(e)
        res.status(400).send(e)
    }
})

/*****Get Likes Route */
app.get('/getlikes', authenticate, async (req, res) => {
    try {
        const albumLikes = await Like.find({ _creator: req.user._id, type: 'album' })
        const trackLikes = await Like.find({ _creator: req.user._id, type: 'track' })
        const artistLikes = await Like.find({ _creator: req.user._id, type: 'artist' })
        const playlistLikes = await Like.find({ _creator: req.user._id, type: 'playlist' })
        res.send({
            albumLikes,
            trackLikes,
            artistLikes,
            playlistLikes
        })
    } catch (e) {
        res.status(400).send(e)
    }
})

/*****Delete Route */
app.post('/delete', authenticate, async (req, res) => {
    try {
        const body = _.pick(req.body, ['type', 'id'])
        const Type = body.type === 'track' ? Track : body.type === 'album' ? Album : Playlist

        // if (!ObjectID.isValid(body._id)) {
        //     return res.status(404).send('This is not a valid ID')
        // }
        const response = await Type.findOneAndRemove({ _creator: req.user._id, 'information.id': body.id })
        if (!response) {
            return res.send(`This ${body.type} does not exist`)
        }
        res.send(response)
    } catch (e) {
        console.log(e)
        res.status(400).send(e)
    }
})

/**********Add music */
app.post('/add', authenticate, async (req, res) => {
    try {
        const body = _.pick(req.body, ['type', 'id'])
        let add = await callAxiosData('get', `/${body.type}/${body.id}`)
        add.tracks.data.forEach((cur, index) => {cur.number = index + 1})

        // const Type = body.type === 'track' ? Track : body.type === 'album' ? Album : Playlist
        let response = await Playlist.findOne({ _creator: req.user._id, 'information.id': body.id })

        if (response) {
            const compare = response.information.tracks.data.map(cur => cur.id)
            let newOne = add.tracks.data.filter(cur => !compare.includes(cur.id))
            newOne.forEach(cur => {cur.createdAt = new Date().getTime()})
            response.information = { ...response.information, tracks: { ...response.information.tracks, data: [...response.information.tracks.data, ...newOne] } }
            const result = await response.save()
            return res.send(result)
        }
        const data = new Playlist({
            _creator: req.user._id,
            information: add,
            createdAt: new Date().getTime()
        })

        const result = await data.save()
        res.send(result)
    } catch (e) {
        console.log(e)
        res.status(400).send(e)
    }
})

/*****Add track to album */
app.post('/addAlbPlayTrack', authenticate, async (req, res) => {
    try {
        const body = _.pick(req.body, ['type', 'id', 'index', 'trackId'])
        console.log(body)
        let add = await callAxiosData('get', `/album/${body.id}`)
        let storedIndex

        if (body.type === 'album') {
            storedIndex = body.index + 1
        } else {
            const isIndex = (element) => element.id === body.trackId;
            const newIndex = add.tracks.data.findIndex(isIndex);
            storedIndex = newIndex + 1
        }

        const track = add.tracks.data.filter((cur, index) => index === (storedIndex - 1))
        track[0].number = storedIndex
        track[0].createdAt = new Date().getTime()
        add.tracks.data = track
        // const Type = body.type === 'album' ? Album : Playlist
        const response = await Album.findOne({ _creator: req.user._id, 'information.id': body.id })
        if (!response) {
            const data = new Album({
                _creator: req.user._id,
                information: add,
                createdAt: new Date().getTime()
            })
            const result = await data.save()
            return res.send(result)
        }

        function checkId(element) {
            return element.id === track[0].id;
        }
        const present = response.information.tracks.data.some(checkId)
        if (present) {
            return res.send('this particular one is already there')
        }

        const finalResult = response.information.tracks.data.concat(track)
        response.information = { ...response.information, tracks: { ...response.information.tracks, data: finalResult } }

        // response.information.tracks.data = finalResult
        const result = await response.save()
        res.send(result)
    } catch (e) {
        console.log(e)
        res.status(400).send(e)
    }
})

/*****Remove track from album */
app.post('/removeAlbPlayTrack', authenticate, async (req, res) => {
    try {
        const body = _.pick(req.body, ['id', 'trackId'])

        const response = await Album.findOne({ _creator: req.user._id, 'information.id': body.id, 'information.tracks.data.id': body.trackId })

        if (!response) {
            return res.send(`this track doesn't exist`)
        }

        if (response.information.tracks.data.length === 1) {
            const remove = await Album.findOneAndRemove({ _creator: req.user._id, 'information.id': body.id, 'information.tracks.data.id': body.trackId })
            return res.send(remove)
        }

        const tracks = response.information.tracks.data.filter(cur => cur.id !== body.trackId)
        response.information = { ...response.information, tracks: { ...response.information.tracks, data: tracks } }
        const result = await response.save()

        res.send(result)
    } catch (e) {
        console.log(e)
        res.status(400).send(e)
    }
})

/*****Create Playlist Route */
app.post('/createplaylist', authenticate, async (req, res) => {
    try {
        const body = _.pick(req.body, ['title', 'description'])
        const exists = await Playlist.findOne({ _creator: req.user._id, 'information.title': body.title })
        if (exists) {
            return res.send('This playlist already exists')
        }

        const data = new Playlist({
            _creator: req.user._id,
            information: {
                title: body.title, 
                description: body.description ? body.description : '',
                tracks: {
                    data: []
                }
            },
            personal: true,
            createdAt: new Date().getTime()
        })

        const result = await data.save()
        res.send(result)
    } catch (e) {
        res.status(400).send(e)
    }
})

app.post('/deleteplaylist', authenticate, async (req, res) => {
    try {
        const body = _.pick(req.body, ['_id'])

        if (!ObjectID.isValid(body._id)) {
            return res.status(404).send('This is not a valid ID')
        }
        let response = await Playlist.findOneAndRemove({ _creator: req.user._id, '_id': body._id })
        if (!response) {
            res.send(`This ${body.type} does not exist`)
        }
        res.send(response)
    } catch (e) {
        console.log(e)
        res.status(400).send(e)
    }
})

app.patch('/editplaylist', authenticate, async (req, res) => {
    try {
        const body = _.pick(req.body, ['_id', 'title', 'description'])

        if (!ObjectID.isValid(body._id)) {
            return res.status(404).send('This is not a valid ID')
        }
        let response = await Playlist.findOne({ _creator: req.user._id, '_id': body._id })
        if (!response) {
            res.send(`This ${body.type} does not exist`)
        }
        response.information = { ...response.information, title: body.title, description: body.description }
        const result = await response.save()
        res.send(result)
    } catch (e) {
        console.log(e)
        res.status(400).send(e)
    }
})

/*****Add to playlist Route */
app.patch('/addtoplaylist', authenticate, async (req, res) => {
    try {
        const body = _.pick(req.body, ['data', 'title'])
        let playlist = await Playlist.findOne({ _creator: req.user._id, 'information.title': body.title })
        if (!playlist) {
            return res.send(`Playlist doesn't exist`)
        }
        let existed
        playlist.information.tracks.data.forEach(cur => {
            if (cur.id === body.data.id && cur.type === body.data.type) {
                existed = 'This song is already in this playlist'
            }
        })
        if (existed) {
            return res.send(existed)
        }
        playlist.information = { ...playlist.information, tracks: { ...playlist.information.tracks, data: [...playlist.information.tracks.data, body.data] } }
        const result = await playlist.save()
        res.send(result)
    } catch (e) {
        res.status(400).send(e)
    }
})

/*****Delete from playlist Route */
app.post('/deletefromplaylist', authenticate, async (req, res) => {
    try {
        const body = _.pick(req.body, ['id', 'title'])
        let playlist = await Playlist.findOne({ _creator: req.user._id, 'information.title': body.title })
        if (!playlist) {
            return res.send('Playlist does not exist')
        }
        const arr = playlist.information.tracks.data.filter(cur => body.id !== cur.id)
        playlist.information = { ...playlist.information, tracks: { ...playlist.information.tracks, data: arr } }
        const result = await playlist.save()
        res.send(result)
    } catch (e) {
        res.status(400).send(e)
    }
})

/*****All tracks Route */
app.get('/alltracks', authenticate, async (req, res) => {
    try {
        const tracks = await Track.aggregate([{ $match: { _creator: req.user._id } }, { $sort: { 'information.title': 1 } }, { $project: { track: '$information', cover: '$information.album.cover', type: '$information.type' } }])
        let album = await Album.aggregate([{ $match: { _creator: req.user._id } }, { $sort: { 'information.title': 1 } }, { $project: { albumTitle: '$information.title', information: '$information.tracks.data', albumId: '$information.id', cover: '$information.cover', createdAt:'$createdAt', type: '$information.type' } }, { $unwind: { path: '$information' } }])
        result = tracks.concat(album).sort((a, b) => a.information.title < b.information.title ? -1 : a.information.title > b.information.title ? 1 : 0)
        res.send(result)
    } catch (e) {
        res.status(400).send(e)
    }
})

/*****All Albums Route */
app.get('/allalbums', authenticate, async (req, res) => {
    try {
        const albums = await Album.aggregate([{ $match: { _creator: req.user._id } }, { $sort: { 'information.title': 1 } }])
        res.send(albums)
    } catch (e) {
        res.status(400).send(e)
    }
})

/****Check playlist availability */
app.post('/checkavailable', authenticate, async (req, res) => {
    try {
        const body = _.pick(req.body, ['id', 'type'])
        const Type = body.type === 'track' ? Track : body.type === 'album' ? Album : Playlist
        const result = await Type.findOne({ _creator: req.user._id, 'information.id': body.id })
        if (result) {
            if (body.type !== 'track') {
                if (result.information.tracks.data.length !== result.information.nb_tracks) {
                    return res.send({ status: false, _id: null })
                }
            }
            return res.send({ _id: result._id, status: true })
        }
        res.send({ status: false, _id: null })
    } catch (e) {
        res.status(400).send(e)
    }
})

/***Check if track is in album */
app.post('/checkTrackInAlbum', authenticate, async (req, res) => {
    try {
        const body = _.pick(req.body, ['id', 'trackId'])
        const result = await Album.findOne({ _creator: req.user._id, 'information.id': body.id })
        if (result) {
            const isIndex = (element) => element.id === body.trackId;
            const newIndex = result.information.tracks.data.findIndex(isIndex);

            if (newIndex !== -1) {
                return res.send(true)
            } else {
                return res.send(false)
            }
        }
        res.send(false)
    } catch (e) {
        console.log(e)
        res.status(400).send(e)
    }
})


/*****All Playlists Route */
app.get('/allplaylists', authenticate, async (req, res) => {
    try {
        const playlists = await Playlist.aggregate([{ $match: { _creator: req.user._id } }, { $sort: { 'information.title': 1 } }])
        res.send(playlists)
    } catch (e) {
        res.status(400).send(e)
    }
})

/*****All Artists Route */
app.get('/allartists', authenticate, async (req, res) => {
    try {
        const artists = await Album.aggregate([{ $match: { _creator: req.user._id } }, { $group: { _id: { id: '$information.artist.id', name: '$information.artist.name', picture: '$information.artist.picture_medium' } } }, { $sort: { '_id.name': 1 } }, { $project: { id: '$_id.id', name: '$_id.name', picture: '$_id.picture', _id: 0 } }])
        res.send(artists)
    } catch (e) {
        res.status(400).send(e)
    }
})

/*****Music for an Artist Route */
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

/*****Recently Added Route */
app.get('/recentlyAdded', authenticate, async (req, res) => {
    try {
        const playlists = await Playlist.aggregate([{ $match: {  _creator: req.user._id, personal: false } }, { $sort: { 'information.createdAt': -1 } }])
        const albums = await Album.aggregate([{ $match: {  _creator: req.user._id } }, { $sort: { 'information.createdAt': -1 } }])
        const result = playlists.concat(albums).sort((a, b) => b['createdAt'] - a['createdAt']).slice(0, 20)
        res.send(result)
    } catch (e) {
        res.status(400).send(e)
    }
})


app.listen(port, () => {
    console.log(`server listening on port ${port}`)
})

module.exports = { app }