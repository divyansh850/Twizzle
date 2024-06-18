var mongoose = require('mongoose');

var postSchema = mongoose.Schema({
  userid: {
    type:mongoose.Schema.Types.ObjectId,
    ref: "user"
  },
  data: String,
  likes:[
    {type: mongoose.Schema.Types.ObjectId , ref:"user"}
  ],
  comment:[
    {
      userid:{type:mongoose.Schema.Types.ObjectId,
        ref: "user"},
        msg:String,
        username:String
    }
  ],
  date:{
    type:Date,
    default:Date.now()
  }
})
  
module.exports = mongoose.model('post',postSchema);
