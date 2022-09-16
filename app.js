//jshint esversion:6
require('dotenv').config()
const express= require("express")
const bodyParser = require("body-parser")
const ejs = require("ejs")
const mongoose=require('mongoose')
// const encrypt = require('mongoose-encryption')
// const md5=require('md5')
// const bcrypt = require("bcrypt");
const session= require('express-session')
const passport = require('passport')
const passportLocalMongoose=require('passport-local-mongoose')
const GoogleStrategy=require('passport-google-oauth20').Strategy;
const FacebookStrategy=require('passport-facebook').Strategy;
const findOrCreate=require('mongoose-findorcreate');
const saltRounds=10;

const app=express();
app.use(express.static("public"));
app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
	secret:process.env.SECRET,
	resave:false,
	saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb+srv://PerciusT:test123@cluster0.idqnafo.mongodb.net/userDB",{useNewUrlParser:true});
// mongoose.set("userCreateIndex",true)


const secret=process.env.secret;

const userSchema= new mongoose.Schema({
	username:String,
	// email:String,
	secret:String,
	password:String,
	googleId:String,
	facebookId:String
});
// userSchema.plugin(encrypt, {secret:secret, encryptedFields: ['password']});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


const user= new mongoose.model("User",userSchema)
passport.use(user.createStrategy());
passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, { id: user.id, username: user.username });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
	// console.log(profile)
    user.findOrCreate({username:profile.emails[0].value, googleId: profile.id }, function (err, user) {
      
      return cb(err, user);

    });
  }
));
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
  	console.log(profile)
    user.findOrCreate({username:profile.id, facebookId: profile.id,  }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.route('/')
.get(function(req,res){
	res.render('home')
})

app.route('/login')
.get(function(req,res){
	res.render('login')
})
.post(function(req,res){
	// console.log(req.body)
	// user.findOne({email:req.body.username},function(err,ret){
	// 	if(!err){
	// 		bcrypt.compare(req.body.password,ret.password,function(err,hash){
	// 			if(hash)
	// 			{
	// 				console.log(ret)
	// 				res.render('secrets')
	// 			}
	// 			else
	// 			{
	// 				console.log(hash)
	// 				console.log(ret)
	// 				res.send('No such username')
	// 			}
	// 		})
			
	// 	}
	// })
	const loginUser = new user({
		username:req.body.username,
		password:req.body.password
	})
	req.login(loginUser,function(err){
		if(err){
			console.log(err)
			res.redirect('/login')
		}
		else{
			passport.authenticate("local")(req,res,function(){
				res.redirect("/secret")
			})
		}
	})
})

app.route('/register')
.get(function(req,res){
	res.render('register')
})
.post(function(req,res){
	// bcrypt.hash(req.body.password,saltRounds,function(err,hash){
	// 	const newUser= new user({
	// 	email:req.body.username,
	// 	password:hash
	// 	});
	// 	newUser.save(function(err){
	// 	if(err){
	// 		console.log(err)
	// 	}
	// 	else
	// 	{
	// 		res.render('secrets')
	// 	}
	// 	})
	
	// })
	user.register({username:req.body.username},req.body.password,function(err,ret){
		if(err)
		{
			console.log(err)
			res.redirect('/register')
		}
		else
		{
			passport.authenticate("local")(req,res,function(){
				res.redirect("/secret")
			})
		}
	})
})

app.route("/secret")
.get(function(req,res){
	user.find({"secrets":{$ne:null}},function(err,ret){
		if(err){
			console.log(err)
		}
		else{
			if(ret){
				res.render("secrets",{usersWithSecrets:ret})
			}
			else
			{
				res.render("secrets",{usersWithSecrets:ret})
			}
		}
	})
})

app.route("/logout")
.get(function(req,res){
	req.logout(function(err){
		if(err)
		{
			console.log(err)
		}
	});
	res.redirect('/');
})

app.route("/auth/google")
.get(passport.authenticate("google",{scope:['profile','email']}))

app.get('/auth/facebook', passport.authenticate('facebook', {
  scope: [ 'email' ]
}));

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secret');
  });
app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login', failureMessage: true }),
  function(req, res) {
    res.redirect('/secret');
  });

app.route('/submit')
.get(function(req,res){
	if(req.isAuthenticated()){
		res.render('submit')
	}
	else{
		res.redirect('/login')
	}
})
.post(function(req,res){
	console.log(req.user)
	user.findById(req.user.id,function(err,ret){
		if(err)
		{
			console.log(err)
			res.redirect("/login")
		}
		else{
			if(ret){
				ret.secret=req.body.secret;
				ret.save(function(){
					console.log("updated secrets")
					res.redirect("/secret")
				});
			}
		}
	})
})

app.listen(process.env.PORT||3000||80,function(){
	console.log("Listening on port 3000",app.get('env'))
})