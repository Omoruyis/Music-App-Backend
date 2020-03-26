const mongoose = require('mongoose')

var PlaylistSchema = new mongoose.Schema({
    _creator: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    information: {
        type: Object,
        required: true,
        unique: true
    },
    personal: {
        type: Boolean,
        required: true, 
        default: false
    },
    createdAt: {
        type: Number,
        required: true
    }
})


PlaylistSchema.statics.findExistingInformation = function (_creator, information) {
    const Playlist = this

    return Playlist.findOne({ _creator, 'information.id': information }).then(info => {
        return new Promise((resolve, reject) => {
            if (info) {
                resolve('Information already exists')
            } else {
                resolve(null)
            }
        })
    })
}

const Playlist = mongoose.model('Playlist', PlaylistSchema);

module.exports = { Playlist };