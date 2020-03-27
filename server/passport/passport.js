const _ = require('lodash')
const passport = require('passport')
const { Strategy } = require('passport-local')

const { User } = require('../models/user')

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});

passport.use(new Strategy({
    usernameField: 'email'
}, async (email, password, done) => {
        try {
            let user = await User.findByCredentials(email, password)

            if (!user._id) {
                return done(null, false)
            } 
            
            const token = await user.generateAuthToken()
            user = _.pick(user, ['method', '_id', 'local'])
            user.token = token
            done(null, user)
        } catch (e) {
            done(e, false, e.message)
        }
    }
))


// passport.use('googleToken', new GooglePlusTokenStrategy({
//     clientID: '271277109562-8tt8jqb5m0cg2b5pgph5ig419irp4ir2.apps.googleusercontent.com',
//     clientSecret: 'bqAahMarf6IE8V1WZKM1Lfnm'
// }, async (accessToken, refreshToken, profile, done) => {
//     try {
//         const user = await User.findExistingGoogleAccount(profile.id)

//         if (user) {
//             return done(null, user)
//         }
//         const newUser = new User({
//             method: 'google',
//             google: {
//                 id: profile.id,
//                 email: profile.emails[0].value,
//                 displayName: profile.displayName
//             }
//         })

//         await newUser.save()
//         done(null, newUser)
//     } catch (e) {
//         done(e, false, e.message)
//     }   
// }))