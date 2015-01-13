var db = require('../config');
var Promise = require('bluebird');
var bcrypt   = Promise.promisifyAll(require('bcrypt'));

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,

  initialize: function(){
    // this.on('creating', function(model, attrs, options){
    //   // var shasum = crypto.createHash('sha1');
    //   // shasum.update(model.get('url'));
    //   // model.set('code', shasum.digest('hex').slice(0, 5));

    // });
  },

  encryptPassword: function(user){
    console.log(user);
  }

}, {
  login: Promise.method(function(username, password) {
    if (!username || !password) throw new Error('username and password are both required');
    return new this({username: username.trim()}).fetch({require: true}).tap(function(user) {
      console.log('user found: ', user);
      return user.get('password') === password;
      // return bcrypt.compareAsync(user.get('password'), password);
    });
  })

  // login: function(username, password){
  //   return new Promise(function(resolve, reject){
  //     if(!username && !password) {
  //       console.log('You need a username and password');
  //       reject(new Error('You need a username and password'));
  //     } else {
  //       return new this({
  //         username: username,
  //         password: password
  //       }).fetch({
  //         require: true
  //       }).tap(function(user){
  //         resolve(user);
  //       });
  //     }
  //   });
  // }


});

module.exports = User;
