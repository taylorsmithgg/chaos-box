(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;

/* Package-scope variables */
var GeoCoder;

(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                             //
// packages/aldeed:geocoder/geocoder.js                                                        //
//                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                               //
var geocoder = Npm.require('node-geocoder');                                                   // 1
                                                                                               // 2
// backwards compatibility                                                                     // 3
if (typeof Meteor.wrapAsync === "undefined") {                                                 // 4
  Meteor.wrapAsync = Meteor._wrapAsync;                                                        // 5
}                                                                                              // 6
                                                                                               // 7
GeoCoder = function geoCoderConstructor(options) {                                             // 8
  var self = this;                                                                             // 9
  self.options = _.extend({                                                                    // 10
    geocoderProvider: 'google',                                                                // 11
    httpAdapter: 'http'                                                                        // 12
  }, options || {});                                                                           // 13
};                                                                                             // 14
                                                                                               // 15
var gc = function (address, options, callback) {                                               // 16
  var g = geocoder.getGeocoder(options.geocoderProvider, options.httpAdapter, options);        // 17
  g.geocode(address, callback);                                                                // 18
};                                                                                             // 19
                                                                                               // 20
GeoCoder.prototype.geocode = function geoCoderGeocode(address, callback) {                     // 21
  if (callback) {                                                                              // 22
    callback = Meteor.bindEnvironment(callback, function (error) { if (error) throw error; }); // 23
    gc(address, this.options, callback);                                                       // 24
  } else {                                                                                     // 25
    return Meteor.wrapAsync(gc)(address, this.options);                                        // 26
  }                                                                                            // 27
};                                                                                             // 28
                                                                                               // 29
var rv = function (lat, lng, options, callback) {                                              // 30
  var g = geocoder.getGeocoder(options.geocoderProvider, options.httpAdapter, options);        // 31
  g.reverse(lat, lng, callback);                                                               // 32
};                                                                                             // 33
                                                                                               // 34
GeoCoder.prototype.reverse = function geoCoderReverse(lat, lng, callback) {                    // 35
  if (callback) {                                                                              // 36
    callback = Meteor.bindEnvironment(callback, function (error) { if (error) throw error; }); // 37
    rv(lat, lng, this.options, callback);                                                      // 38
  } else {                                                                                     // 39
    return Meteor.wrapAsync(rv)(lat, lng, this.options);                                       // 40
  }                                                                                            // 41
};                                                                                             // 42
/////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['aldeed:geocoder'] = {
  GeoCoder: GeoCoder
};

})();

//# sourceMappingURL=aldeed_geocoder.js.map
