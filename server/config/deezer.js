const axios = require('axios')

const url = 'https://api.deezer.com'
const config = {
    url,
    headers: {
        'Content-Type': 'application/json',
        "x-rapidapi-host": "deezerdevs-deezer.p.rapidapi.com",
        "x-rapidapi-key": "255599120fmsh606f799885edf3ep10397ejsna3e57a9fd1a3",
        Accept: 'application/json'
    }
}

const callAxios = async (method, route) => {
    const res = await axios[method](`${config.url}/${route}`, config.headers)
    return res.data.data
}

const callAxiosData = async (method, route) => {
    const res = await axios[method](`${config.url}/${route}`, config.headers)
    return res.data
}


module.exports = {
    callAxios,
    callAxiosData
}

