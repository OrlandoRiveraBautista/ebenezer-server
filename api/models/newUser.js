const mongoose = require('mongoose');

// Getting the Class of Schema 
const Schema = mongoose.Schema;

// Defining the assignments Schema
const AssignmentsSchema = new Schema({
    question: String,
    answer: String,
})

// Defining the User Schema
const UserSchema = new Schema({
    email: { type: String, unique: true },
    password: { type: String, select: false },
    fullName: String,
    role: String,
    assignments: [AssignmentsSchema],
    image: String,
    date: String
});

const User = mongoose.model('user', UserSchema);

// Exporting class
module.exports = User;