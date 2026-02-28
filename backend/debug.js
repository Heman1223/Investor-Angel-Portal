const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { Investor } = require('./dist/models/Investor');

async function debug() {
    try {
        console.log("Connecting to DB...");
        await mongoose.connect('mongodb://localhost:27017/portfolioos');
        console.log("Connected to DB");

        const email = 'investor@portfolioos.com';
        console.log("Finding user with email:", email);
        const investor = await Investor.findOne({ email: email.toLowerCase() });
        if (!investor) {
            console.error("User not found");
            process.exit(1);
        }

        console.log("Found user, checking password...");
        const isValid = await bcrypt.compare('Demo@2024', investor.passwordHash);
        if (!isValid) {
            console.error("Invalid password!");
            process.exit(1);
        }

        console.log("Password valid. Success!");

        console.log("Saving investor...");
        investor.lastLoginAt = new Date();
        await investor.save();
        console.log("Investor saved.");

        console.log("Signing JWT");
        const jwt = require('jsonwebtoken');
        jwt.sign({ id: investor._id.toString() }, process.env.JWT_SECRET || 'secret');
        console.log("JWT signed.");

        mongoose.disconnect();
    } catch (e) {
        console.error("Caught error:");
        console.error(e);
        process.exit(1);
    }
}

debug();
