const mongoose = require('mongoose')

var AlbumSchema = new mongoose.Schema({
    _creator: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    liked: {
        type: Boolean,
        default: false
    },
    information: {
        type: Object,
        required: true,
        unique: true
    },
    createdAt: {
        type: Number,
        required: true
    }
})


AlbumSchema.statics.findExistingInformation = function (_creator, information) {
    const Album = this

    return Album.findOne({ _creator, 'information.id': information }).then(info => {
        return new Promise((resolve, reject) => {
            if (info) {
                resolve('Information already exists')
            } else {
                resolve(null)
            }
        })
    })
}

const Album = mongoose.model('Album', AlbumSchema);

module.exports = { Album };