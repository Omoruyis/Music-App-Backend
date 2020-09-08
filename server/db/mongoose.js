const mongoose = require('mongoose')

// const url = process.env.MONGODB_URI

mongoose.Promise = global.Promise
// mongoose.connect(url, {useNewUrlParser: true})
mongoose.connect('mongodb+srv://Omoruyi:9wNtETe9km8o8Y5N@cluster0.f26bi.mongodb.net/Omoruyi?retryWrites=true&w=majority', {useNewUrlParser: true})
mongoose.set('useCreateIndex', true);




module.exports = {
    mongoose, 
}

