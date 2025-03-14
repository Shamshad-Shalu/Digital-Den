const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../model/userSchema.js");
const env = require("dotenv").config();


passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL 
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // find user by googleId
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
            // If no user found with googleId, check email
            user = await User.findOne({ email: profile.emails[0].value });
            
            if (user) {
                // If user exists with email but no googleId, update their googleId
                user.googleId = profile.id;
                await user.save();
                return done(null, user);
            }
            
            // create new one if no user exists
            user = new User({
                username: profile.displayName,
                email: profile.emails[0].value,
                googleId: profile.id,
                isVerified: true
            });
            await user.save();
        }
        
        return done(null, user);
    } catch (error) {
        console.log("Google Auth Error:", error);
        return done(error, null);
    }
}));


// Serialization and deserialization
passport.serializeUser((user, done) => {
    if (user && user.id) {
        done(null, user.id);
    } else {
        done(new Error("User object is invalid"), null);
    }
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

module.exports = passport;

