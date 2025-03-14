const express = require("express");
const env = require("dotenv").config();
const adminRouter =  require("./router/admin.js"); 
const userRouter  = require("./router/user.js");
const {connectDatabase }= require("./db/connectDB.js");
const session = require("express-session");
const flash = require('connect-flash');
const passport = require("./config/passport.js");
const nocache = require("nocache");
const path = require("path");

const app = express();


app.use(session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: { 
        httpOnly:true,
        secure:false,
        maxAge:72*60*60*1000
     } 
}));


// Passport middleware
app.use(passport.initialize());
app.use(passport.session());


app.use((req, res, next) => {
    if(req.session || req.session.adminId){
        res.setHeader('Cache-Control',' no-cache')
    }
    next();
})

// Set up flash
app.use(flash());

// Make flash messages available to all views
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.validationErrors = req.flash('validationErrors');
  next();
});


app.use((req, res, next) => {
    res.locals.isLoggedIn = !!req.session.user;
    next();
});

app.use(nocache());

app.use(express.json());
app.use(express.urlencoded({extended:true}));



app.use(express.static("public"))
app.set("view engine","ejs");
app.set(path.join(__dirname,"views"));



app.get("/",(req,res)=> {
    res.redirect("/user/home");
})


app.get("/admin",(req,res)=> {
    res.redirect("/admin/login");
})

// Router 
app.use("/user",userRouter);
app.use("/admin",adminRouter);


connectDatabase().then(()=>{
    app.listen(process.env.PORT,(err)=> console.log(`server is running at ${process.env.HOST}:${process.env.PORT}`))
})
