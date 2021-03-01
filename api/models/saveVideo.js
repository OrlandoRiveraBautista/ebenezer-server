const mongoose = require('mongoose');

// Getting the Class of Schema 
const Schema = mongoose.Schema;

// Defining the videoId Schema
const VideoIDSchema = new Schema({
    videoid: String,
    publishedData: String,
    title: String,
    description: String,
    saved: String
});

const saveVideo = mongoose.model('ytvideos', VideoIDSchema);

// Exporting class
module.exports = saveVideo;