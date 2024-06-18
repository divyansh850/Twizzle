var mongoose = require('mongoose');
var plm = require('passport-local-mongoose'); // iss passport-local-mongoose ka andhar
//serializeuser or deserializeuser hota hai isliye unko app.js use kar paya 
//isliye require kara hai

mongoose.connect('mongodb://127.0.0.1:27017/passn15');

var userSchema = mongoose.Schema({
  email:String,
  username: String,
  password: String,
  posts:[
     {type: mongoose.Schema.Types.ObjectId , ref: "post"}
  ],
  age: Number,
  profession:String,
  image:{
    type:String,
    default:'def.jpg'
  },
  key:String,
  expirykey:Date
})

userSchema.plugin(plm);  //iss folder nhi tha isilye plugin kar iss folder ma laya

module.exports = mongoose.model('user',userSchema);
