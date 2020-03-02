const mongoose = require('mongoose')


var ArtistSchema = new mongoose.Schema({
    _creator: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    name: {
        type: String,
        required: true,
    },
    id: {
        type: Number,
        required: true
    },
    picture: {
        type: String,
        required: true
    },
    createdAt: {
        type: Number,
        required: true
    }
})


ArtistSchema.statics.findExistingInformation = function (_creator, information) {
    const Artist = this

    return Artist.findOne({ _creator, id: information }).then(info => {
        return new Promise((resolve, reject) => {
            if (info) {
                resolve('Information already exists')
            } else {
                resolve(null)
            }
        })
    })
}

const Artist = mongoose.model('Artist', ArtistSchema);

module.exports = { Artist };