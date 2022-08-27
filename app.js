//jshint esversion:6
require('dotenv').config()
const express= require("express")
const bodyParser = require("body-parser")
const ejs = require("ejs")
const mongoose=require('mongoose')
const encrypt = require('mongoose-encryption')

const app=express();

mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser:true});

app.use(express.static("public"));
app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({extended:true}));

const secret=process.env.secret;

const userSchema= new mongoose.Schema({
	email:String,
	password:String
});
userSchema.plugin(encrypt, {secret:secret, encryptedFields: ['password']});

const user= new mongoose.model("User",userSchema)

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
	user.findOne({email:req.body.username},function(err,ret){
		if(!err){
			if(ret.password==req.body.password)
			{
				console.log(ret)
				res.render('secrets')
			}
			else
			{
				console.log(ret)
				res.send('No such username')
			}
		}
	})
})

app.route('/register')
.get(function(req,res){
	res.render('register')
})
.post(function(req,res){
	const newUser= new user({
		email:req.body.username,
		password:req.body.password
	});
	newUser.save(function(err){
		if(err){
			console.log(err)
		}
		else
		{
			res.render('secrets')
		}
	})
})



app.listen(process.env.PORT||3000,function(){
	console.log("Listening on port 3000")
})