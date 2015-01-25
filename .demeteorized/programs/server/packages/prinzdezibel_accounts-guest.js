(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var Accounts = Package['accounts-base'].Accounts;

/* Package-scope variables */
var AccountsGuest;

(function () {

//////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                          //
// packages/prinzdezibel:accounts-guest/accounts-guest.js                                   //
//                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////
                                                                                            //
AccountsGuest = {};                                                                         // 1
if (typeof AccountsGuest.forced === "undefined") {                                          // 2
	AccountsGuest.forced = true; /*default to making loginVisitor automatic, and on logout*/   // 3
}                                                                                           // 4
if (typeof AccountsGuest.enabled === "undefined") {                                         // 5
	AccountsGuest.enabled = true; /* on 'false'  Meteor.loginVisitor() will fail */            // 6
}                                                                                           // 7
                                                                                            // 8
//////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                          //
// packages/prinzdezibel:accounts-guest/accounts-guest-server.js                            //
//                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////
                                                                                            //
Accounts.removeOldGuests = function (before) {                                              // 1
  if (typeof before === 'undefined') {                                                      // 2
    before = new Date();                                                                    // 3
    before.setHours(before.getHours() - 1);                                                 // 4
  }                                                                                         // 5
  var res = Meteor.users.remove({createdAt: {$lte: before}, 'profile.guest': 'guest'});     // 6
  return res;                                                                               // 7
};                                                                                          // 8
                                                                                            // 9
                                                                                            // 10
Meteor.methods({                                                                            // 11
  newGuestLoginToken: function (email) {                                                    // 12
    /* if explicitly disabled, happily do nothing */                                        // 13
    if (AccountsGuest.enabled === false) {                                                  // 14
      return null;                                                                          // 15
    }                                                                                       // 16
                                                                                            // 17
    var count = Meteor.users.find().count() + 1;                                            // 18
    var guestname = "guest-#" + count;                                                      // 19
    var userId = null;                                                                      // 20
    if ( email) {                                                                           // 21
      // Important: Only hand out guest accounts!!                                          // 22
      var guest = Meteor.users.findOne({ "emails.address": email, "profile.guest": true }); // 23
      if (guest) {                                                                          // 24
        userId = guest._id;                                                                 // 25
      }                                                                                     // 26
    }                                                                                       // 27
    if (! userId ) {                                                                        // 28
        // create new guest account                                                         // 29
        var guest = {                                                                       // 30
          username: guestname,                                                              // 31
          profile: { guest: true }                                                          // 32
        };                                                                                  // 33
        if ( email ) {                                                                      // 34
            guest.email = email;                                                            // 35
        }                                                                                   // 36
                                                                                            // 37
        userId = Accounts.createUser(guest);                                                // 38
    }                                                                                       // 39
                                                                                            // 40
    var newStampedToken = Accounts._generateStampedLoginToken();                            // 41
    newStampedToken.when = new Date;                                                        // 42
    Accounts._insertLoginToken(userId, newStampedToken);                                    // 43
    return newStampedToken.token;                                                           // 44
  }                                                                                         // 45
});                                                                                         // 46
                                                                                            // 47
//////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['prinzdezibel:accounts-guest'] = {
  AccountsGuest: AccountsGuest
};

})();

//# sourceMappingURL=prinzdezibel_accounts-guest.js.map
