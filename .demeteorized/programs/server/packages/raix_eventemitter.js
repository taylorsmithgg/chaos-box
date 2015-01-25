(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var _ = Package.underscore._;

/* Package-scope variables */
var EventEmitter;

(function () {

///////////////////////////////////////////////////////////////////////
//                                                                   //
// packages/raix:eventemitter/eventemitter.server.js                 //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
EventEmitter = Npm.require('events').EventEmitter;                   // 1
///////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['raix:eventemitter'] = {
  EventEmitter: EventEmitter
};

})();

//# sourceMappingURL=raix_eventemitter.js.map
