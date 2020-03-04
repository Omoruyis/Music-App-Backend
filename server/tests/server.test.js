const request = require('supertest')
const expect = require('expect')

const { ObjectID } = require('mongodb')

const { app } = require('../server')
const { User } = require('../models/user')
const { Album } = require('../models/album')
const { Artist } = require('../models/artist')
const { Like } = require('../models/like')
const { Playlist } = require('../models/playlist')
const { Track } = require('../models/track')
const { users, albums, tracks, playlists, likes, populateUsers, populateAlbums, populatePlaylists, populateTracks, populateLikes } = require('./seed/seed')

beforeEach(populateUsers)
beforeEach(populateAlbums)
beforeEach(populatePlaylists)
beforeEach(populateTracks)
beforeEach(populateLikes)

describe('POST /signup', () => {
    it('should create  a new user', (done) => {
        const email = 'omoruyi.faith@example.com'
        const password = 'omoruyi'
        const firstName = 'Faith'
        const lastName = 'Omoruyi'
        const phoneNumber = 9298839686575

        request(app)
            .post('/signup')
            .send({ email, password, firstName, lastName, phoneNumber })
            .expect(200)
            .expect((res) => {
                expect(res.body.email).toBe(email)
                expect(res.headers['authorization']).toBeTruthy()
            })
            .end((err, res) => {
                if (err) {
                    return done(err)
                }

                User.find({ email, firstName }).then(user => {
                    expect(user).toBeTruthy()
                    expect(user.password).not.toBe(password)
                    done()
                }).catch(e => done(e))
            })
    })

    it('should return validation errors if request is invalid', (done) => {
        const email = 'omoruyi.faithexample.com'
        const password = 'omoruyi'
        const firstName = 'Faith'
        const lastName = 'Omoruyi'
        const phoneNumber = 9298839686575

        request(app) 
            .post('/signup')
            .send({ email, password, firstName, lastName, phoneNumber })
            .expect(404)
            .end(done)
    })

    it('should not create user if email is in use', (done) => {
        const email = 'omoruyi.isaac@example.com'
        const password = 'omoruyi'
        const firstName = 'Faith'
        const lastName = 'Omoruyi'
        const phoneNumber = 9298839686575

        request(app) 
            .post('/signup')
            .send({ email, password, firstName, lastName, phoneNumber })
            .expect(200)
            .expect((res) => {
                expect(res.text).toBe('User already exists')
            })
            .end(done)
    })
})

describe('POST /login', () => {
    it('should login a valid user', (done) => {
        const email = 'omoruyi.isaac@example.com'
        const password = 'userOnePass'

        request(app)
            .post('/login')
            .send({ email, password })
            .expect(200)
            .expect((res) => {
                expect(res.body.email).toBe(email)
                expect(res.headers['authorization']).toBeTruthy()
            })
            .end((err, res) => {
                if (err) {
                    return done(err)
                }

                User.find({ email }).then(user => {
                    expect(user).toBeTruthy()
                    expect(user.password).not.toBe(password)
                    done()
                }).catch(e => done(e))
            })
    })

    it('should not allow a non-user login', (done) => {
        const email = 'omoruyi.isaac@example.com'
        const password = 'userOnePas'

        request(app) 
            .post('/login')
            .send({ email, password })
            .expect(200)
            .expect((res) => {
                expect(res.text).toBe('Wrong password')
            })
            .end(done)
    })
})

describe('POST /reset', () => {
    it('should change a users password', (done) => {
        const email = 'omoruyi.isaac@example.com'
        const password = 'userOnePass'
        const newPassword = 'omoruyi'

        request(app)
            .post('/reset')
            .send({ email, password, newPassword })
            .expect(200)
            .expect((res) => {
                expect(res.text).toBe('Your password has been changed successfully')
            })
            .end((err, res) => {
                if (err) {
                    return done(err)
                }

                User.find({ email }).then(user => {
                    expect(user).toBeTruthy()
                    done()
                }).catch(e => done(e))
            })
    })

    it('should not allow a non-user reset password', (done) => {
        const email = 'omoruyi.isaac@example.com'
        const password = 'userOnePas'
        const newPassword = 'omoruyi'

        request(app) 
            .post('/login')
            .send({ email, password, newPassword })
            .expect(200)
            .expect((res) => {
                expect(res.text).toBe('Wrong password')
            })
            .end(done)
    })
})

// describe('GET /search', () => {
//     it('should search for data', (done) => {
//         const searchQuery = 'eminem'

//         request(app)
//             .get('/search')
//             .send({ searchQuery })
//             .expect(200)
//             .expect((res) => {
//                 expect(res.body).toBeTruthy()
//             })
//             .end(done)
//     })
// })