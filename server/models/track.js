const mongoose = require('mongoose')


var TrackSchema = new mongoose.Schema({
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


TrackSchema.statics.findExistingInformation = function (_creator, information) {
    const Track = this

    return Track.findOne({ _creator, 'information.id': information }).then(info => {
        return new Promise((resolve, reject) => {
            if (info) {
                resolve('Information already exists')
            } else {
                resolve(null)
            }
        })
    })
}

const Track = mongoose.model('Track', TrackSchema);

module.exports = { Track };