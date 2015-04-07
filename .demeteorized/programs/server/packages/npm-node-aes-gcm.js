(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;

/* Package-scope variables */
var NpmModuleNodeAesGcm;

(function () {

///////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                           //
// packages/npm-node-aes-gcm/wrapper.js                                                      //
//                                                                                           //
///////////////////////////////////////////////////////////////////////////////////////////////
                                                                                             //
try {                                                                                        // 1
  NpmModuleNodeAesGcm = Npm.require('node-aes-gcm');                                         // 2
} catch (err) {                                                                              // 3
  if (process.platform === "win32" &&                                                        // 4
    err.message.match(/specified module could not be found/)) {                              // 5
    // the user probably doesn't have OpenSSL installed.                                     // 6
    throw new Error(                                                                         // 7
"Couldn't load the package 'npm-node-aes-gcm'. This is probably because you " +              // 8
"don't have OpenSSL installed. See the README for details and directions: " +                // 9
"https://github.com/meteor/meteor/blob/devel/packages/non-core/npm-node-aes-gcm/README.md"); // 10
  } else {                                                                                   // 11
    throw err;                                                                               // 12
  }                                                                                          // 13
}                                                                                            // 14
///////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['npm-node-aes-gcm'] = {
  NpmModuleNodeAesGcm: NpmModuleNodeAesGcm
};

})();

//# sourceMappingURL=npm-node-aes-gcm.js.map
