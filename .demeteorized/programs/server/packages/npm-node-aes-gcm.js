(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;

/* Package-scope variables */
var NpmModuleNodeAesGcm;

(function () {

///////////////////////////////////////////////////////////////////////
//                                                                   //
// packages/npm-node-aes-gcm/wrapper.js                              //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
NpmModuleNodeAesGcm = Npm.require('node-aes-gcm');                   // 1
                                                                     // 2
///////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['npm-node-aes-gcm'] = {
  NpmModuleNodeAesGcm: NpmModuleNodeAesGcm
};

})();

//# sourceMappingURL=npm-node-aes-gcm.js.map
