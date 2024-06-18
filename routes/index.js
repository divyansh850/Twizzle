var express = require('express');
var router = express.Router();
const postModel=require('./posts')
const userModel=require('./users')
const passport=require('passport');
const multer= require('multer');
const path=require('path');
const fs=require('fs');
const crypto=require('crypto');
const mailer=require("../nodemailer");

const localStrategy=require('passport-local');
passport.use(new localStrategy(userModel.authenticate()));

//disk storage multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/images/uploads')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9) 
    +path.extname(file.originalname)
    cb(null,uniqueSuffix)
  }
})

const upload = multer({ storage: storage })

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});

router.get('/forgot', function(req, res, next) {
  res.render('forgot');
});

router.post('/forgot', async function (req, res, next) {
  var user = await userModel.findOne({email: req.body.email});
  if(!user){
    res.send("we've sent a mail, if email exists.");
  }
  else{
    // user ke liye ek key banao
    crypto.randomBytes(80, async function(err, buff){
      let key = buff.toString("hex");
      mailer(req.body.email, user._id, key)
      .then(async function(){
        user.key = key;
        user.expirykey=Date.now()+24*60*60;
        await user.save();
        res.send('mail sent');  
      })
    })
  }
});

router.post('/resetpass/:userid',async function(req,res,next){
  let user=await userModel.findOne({_id:req.params.userid})
  user.setPassword(req.body.password,async function(){
    user.key="";
    await user.save();
    req.login(user, function() {
       res.redirect('/profile');
    })
  })
})

router.get('/forgot/:userid/:key',async function(req,res,next){
  let user=await userModel.findOne({_id:req.params.userid})
  if(user.key===req.params.key && Date.now()<user.expirykey){
    res.render("reset",{user});
  }
  else{
    res.send("tez hmmm");
  }
})

//upload
router.post('/upload',isLoggedIn,upload.single('image'),function(req, res, next) {
  // upload ho chuki hai data req.file mein hai
   userModel
  .findOne({username:req.session.passport.user})
  .then(function(foundUser){
    if(foundUser.image !== 'def.jpg'){
      fs.unlinkSync(`./public/images/uploads/${foundUser.image}`)
    }
    foundUser.image=req.file.filename;
    foundUser.save()
    .then(function(){
      res.redirect('back');
      })
  })
});

// {username: req.session.passport.user}
router.get('/profile', isLoggedIn , function(req, res, next) {
  userModel.findOne({username: req.session.passport.user})
  .populate("posts")
  .then(function(foundUser){
    res.render('profile',{foundUser});
  })
});

router.get('/edit', function(req, res, next) {
  userModel.findOne({username:req.session.passport.user})
  .then(function(foundUser){
    res.render('edit',{foundUser});
  })
});

router.get('/check/:username', function(req, res, next) {
  userModel.findOne({username:req.params.username})
  .then(function(foundUser){
    if(foundUser){
      res.json(true)
    }
    else{
      res.json(false)
    }
  })
});

router.post('/update', isLoggedIn , function(req, res, next) {
  userModel.findOneAndUpdate({username:req.session.passport.user},
    {
      username:req.body.username,
      age:req.body.age,
      profession:req.body.profession
    },
    {new:true})
  .then(function(isLoggedInUser){
    req.login(isLoggedInUser, function(err) {
      if (err) { return next(err); }
      return res.redirect('/profile');
    })
  })
});

router.get('/delete/:postid',isLoggedIn,function(req,res,next){
  userModel.findOne({username:req.session.passport.user})
  .then(function(foundUser){
    postModel.findOneAndDelete({_id:req.params.postid})
  .then(function(deletedUser){
    foundUser.posts.splice(foundUser.posts.indexOf(req.params.postid),1);
    foundUser.save()
    .then(function(){
      res.redirect('back');
    })
   })
  })
})

router.post('/comment/:postid',isLoggedIn,function(req,res,next){
  userModel.findOne({username:req.session.passport.user})
  .then(function(foundUser){  
    postModel.findOne({_id:req.params.postid})
    .then(function(post){
     post.comment.push({
      username:foundUser.username,
      msg:req.body.comment,
      userid:foundUser._id
     })
     post.save()
     .then(function(){
      res.redirect('back');
     })
    })
  })
})

router.get('/like/:postid', isLoggedIn , function(req, res, next) {
  userModel.findOne({username: req.session.passport.user})
  .then(function(user){
    postModel
    .findOne({_id: req.params.postid})
    .then(function(post){
      if(post.likes.indexOf(user._id) === -1){
        post.likes.push(user._id);
      }
      else{
        post.likes.splice(post.likes.indexOf(user._id),1);
      }
      post.save()
      .then(function(){
        res.redirect("back");
      })
    })
  })
});

router.post('/post', isLoggedIn , function(req, res, next) {
  userModel
  .findOne({username: req.session.passport.user})
  .then(function(user){
    postModel.create({
      userid: user._id,
      data: req.body.post
    })
    .then(function(post){
      user.posts.push(post._id);
      user.save()
      .then(function(){
        res.redirect("back");
      })
    })
  })
});

router.get('/feed', isLoggedIn , function(req, res, next) {
  userModel.findOne({username:req.session.passport.user})
  .then(function(user){
   postModel
  .find()
  .populate("userid") 
  .then(function(allposts){
    res.render('feed',{allposts,user});
  })
  })

});

// code for Registering User
router.post('/register',function(req,res,next){
  userModel.findOne({username:req.body.username})
  .then(function(foundUser){
    if(foundUser){
      // will run if some user exist
      res.send("username already exist");
    }
    else{
      // this is run when there is no user with same username
      var newUser = new userModel({
      email:req.body.email,
      username: req.body.username,
      age:req.body.age,
      profession:req.body.profession,
      image:req.body.image
    })
  userModel.register(newUser,req.body.password)
  .then(function(newUser){
    passport.authenticate('local')(req,res,function(){
      res.redirect('/profile')
     })
    })

   }
 })
});

router.get('/login', function(req, res, next) {
  res.render('login');
});

// code for LogIn*
router.post('/login',passport.authenticate('local',
{    successRedirect : '/profile',
     failureRedirect : '/login'
}),function(req,res,next){ });

// code for Logout
router.get('/logout', function(req, res, next) {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

// IsLoggedIn Middleware
function isLoggedIn(req,res,next){
  if(req.isAuthenticated()){
    return next();
  }
  else{
    res.redirect('/login');
  }
}
  
module.exports = router;
