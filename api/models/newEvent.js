const mongoose = require('mongoose');

// Getting the Class of Schema 
const Schema = mongoose.Schema;

// Defining the videoId Schema
const EventSchema = new Schema({
    title: String,
    description: String,
    date: [
        {
            start: String,
            end: String
        }
    ],
    madedate: String
});

const Event = mongoose.model('events', EventSchema);

// Exporting class
module.exports = Event;