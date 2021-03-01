const mongoose = require('mongoose');

// Getting the Class of Schema 
const Schema = mongoose.Schema;

// Defining the videoId Schema
const NewPostSchema = new Schema({
    title: String,
    body: String,
    image: String,
    date: String
});

const Posts = mongoose.model('posts', NewPostSchema);

// Exporting class
module.exports = Posts;