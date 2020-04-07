const mongoose = require('mongoose')


var LikeSchema = new mongoose.Schema({
    _creator: {
        type: mongoose.Schema.Types.ObjectId,
        // required: true
    },
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    information: {
        type: Object,
        required: true,
    },
    createdAt: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        required: true
    }
})


const Like = mongoose.model('Like', LikeSchema);

module.exports = { Like };