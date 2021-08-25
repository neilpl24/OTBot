const mongoose = require('mongoose');
// Basically a constructor with default values for future user profiles

// Creates the user profile setup

const profileSchema = new mongoose.Schema({
    userID: { type: String, require: true, unique: true },
    points: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    streak: { type: Number, default: 0 }
});

const model = mongoose.model('ProfileModels', profileSchema);

module.exports = model;
