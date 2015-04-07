(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;

/* Package-scope variables */
var logger;

(function () {

///////////////////////////////////////////////////////////////////////
//                                                                   //
// packages/ongoworks:bunyan-logger/bunyan.js                        //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
logger = {};                                                         // 1
logger.bunyan = Npm.require('bunyan');                               // 2
logger.bunyanPretty = Npm.require('bunyan-pretty');                  // 3
                                                                     // 4
///////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['ongoworks:bunyan-logger'] = {
  logger: logger
};

})();

//# sourceMappingURL=ongoworks_bunyan-logger.js.map
