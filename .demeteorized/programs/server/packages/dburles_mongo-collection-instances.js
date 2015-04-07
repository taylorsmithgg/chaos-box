(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;
var _ = Package.underscore._;

(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                            //
// packages/dburles:mongo-collection-instances/mongo-instances.js                                             //
//                                                                                                            //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                              //
var instances = [];                                                                                           // 1
var orig = Mongo.Collection;                                                                                  // 2
                                                                                                              // 3
Mongo.Collection = function(name, options) {                                                                  // 4
  orig.call(this, name, options);  // inherit orig                                                            // 5
                                                                                                              // 6
  instances.push({                                                                                            // 7
    name: name,                                                                                               // 8
    instance: this,                                                                                           // 9
    options: options                                                                                          // 10
  });                                                                                                         // 11
};                                                                                                            // 12
                                                                                                              // 13
Mongo.Collection.prototype = Object.create(orig.prototype);                                                   // 14
Mongo.Collection.prototype.constructor = Mongo.Collection;                                                    // 15
                                                                                                              // 16
_.extend(Mongo.Collection, orig);                                                                             // 17
                                                                                                              // 18
Mongo.Collection.get = function(name, options) {                                                              // 19
  options = options || {};                                                                                    // 20
  var collection = _.find(instances, function(instance) {                                                     // 21
    if (options.connection)                                                                                   // 22
      return instance.name === name &&                                                                        // 23
        instance.options && instance.options.connection._lastSessionId === options.connection._lastSessionId; // 24
    return instance.name === name;                                                                            // 25
  });                                                                                                         // 26
                                                                                                              // 27
  if (! collection)                                                                                           // 28
    throw new Meteor.Error("Collection not found");                                                           // 29
                                                                                                              // 30
  return collection.instance;                                                                                 // 31
};                                                                                                            // 32
                                                                                                              // 33
Mongo.Collection.getAll = function() {                                                                        // 34
  return instances;                                                                                           // 35
};                                                                                                            // 36
                                                                                                              // 37
// Meteor.Collection will lack ownProperties that are added back to Mongo.Collection                          // 38
Meteor.Collection = Mongo.Collection;                                                                         // 39
                                                                                                              // 40
if (Meteor.users) {                                                                                           // 41
  instances.push({                                                                                            // 42
    name: 'users',                                                                                            // 43
    instance: Meteor.users,                                                                                   // 44
    options: undefined                                                                                        // 45
  });                                                                                                         // 46
}                                                                                                             // 47
                                                                                                              // 48
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['dburles:mongo-collection-instances'] = {};

})();

//# sourceMappingURL=dburles_mongo-collection-instances.js.map
