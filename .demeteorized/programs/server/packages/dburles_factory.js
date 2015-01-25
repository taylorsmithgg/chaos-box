(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var LocalCollection = Package.minimongo.LocalCollection;
var Minimongo = Package.minimongo.Minimongo;
var _ = Package.underscore._;
var EJSON = Package.ejson.EJSON;

/* Package-scope variables */
var Factory;

(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                 //
// packages/dburles:factory/lib/factory.js                                                         //
//                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                   //
var factories = {};                                                                                // 1
                                                                                                   // 2
Factory = function(name, collection, attributes) {                                                 // 3
  this.name = name;                                                                                // 4
  this.collection = collection;                                                                    // 5
  this.attributes = attributes;                                                                    // 6
  this.afterHooks = [];                                                                            // 7
};                                                                                                 // 8
                                                                                                   // 9
Factory.define = function(name, collection, attributes) {                                          // 10
  factories[name] = new Factory(name, collection, attributes);                                     // 11
  return factories[name];                                                                          // 12
};                                                                                                 // 13
                                                                                                   // 14
Factory.get = function(name) {                                                                     // 15
  var factory = factories[name];                                                                   // 16
  if (! factory) throw new Error("Factory: There is no factory named " + name);                    // 17
  return factory;                                                                                  // 18
};                                                                                                 // 19
                                                                                                   // 20
Factory.build = function(name, attributes, options) {                                              // 21
  var factory = Factory.get(name);                                                                 // 22
  var base = {};                                                                                   // 23
  attributes = attributes || {};                                                                   // 24
  options = options || {};                                                                         // 25
                                                                                                   // 26
  // tie ins for collection init method                                                            // 27
  if (_.has(factory.collection, 'init'))                                                           // 28
    base = factory.collection.init();                                                              // 29
                                                                                                   // 30
  // "raw" attributes without functions evaluated, or dotted properties resolved                   // 31
  attributes = _.extend(base, factory.attributes, attributes);                                     // 32
                                                                                                   // 33
  var result = {};                                                                                 // 34
                                                                                                   // 35
  // either create a new factory and return its _id                                                // 36
  // or return a 'fake' _id (since we're not inserting anything)                                   // 37
  var makeRelation = function(name) {                                                              // 38
    if (options.insert)                                                                            // 39
      return Factory.create(name)._id;                                                             // 40
    else                                                                                           // 41
      // fake an id on build                                                                       // 42
      return Random.id();                                                                          // 43
  };                                                                                               // 44
                                                                                                   // 45
  var walk = function(record, object) {                                                            // 46
    _.each(object, function(value, key) {                                                          // 47
      // is this a Factory instance?                                                               // 48
      if (value instanceof Factory) {                                                              // 49
        value = makeRelation(value.name);                                                          // 50
      } else if (_.isFunction(value)) {                                                            // 51
        // does executing this function return a Factory instance?                                 // 52
        var fnRes = value.call(result);                                                            // 53
        value = (fnRes instanceof Factory) ? makeRelation(fnRes.name) : fnRes;                     // 54
      // if an object literal is passed in, traverse deeper into it                                // 55
      } else if (Object.prototype.toString.call(value) === '[object Object]') {                    // 56
        record[key] = record[key] || {};                                                           // 57
        return walk(record[key], value);                                                           // 58
      }                                                                                            // 59
                                                                                                   // 60
      var modifier = { $set: {} };                                                                 // 61
      modifier.$set[key] = value;                                                                  // 62
                                                                                                   // 63
      LocalCollection._modify(record, modifier);                                                   // 64
    });                                                                                            // 65
  };                                                                                               // 66
                                                                                                   // 67
  walk(result, attributes);                                                                        // 68
                                                                                                   // 69
  // tie ins for validation                                                                        // 70
  if (_.has(factory.collection, 'isValid') && ! factory.collection.isValid(result)) {              // 71
    throw new Error('Factory: Invalid Document (' + factory.collection._name + ') ' +              // 72
      EJSON.stringify(result) + ' Errors: ' + EJSON.stringify(factory.collection.errors(result))); // 73
  }                                                                                                // 74
                                                                                                   // 75
  result._id = Random.id();                                                                        // 76
  return result;                                                                                   // 77
};                                                                                                 // 78
                                                                                                   // 79
Factory._create = function(name, doc) {                                                            // 80
  var collection = Factory.get(name).collection;                                                   // 81
  var insertId = collection.insert(doc);                                                           // 82
  var record = collection.findOne(insertId);                                                       // 83
  return record;                                                                                   // 84
};                                                                                                 // 85
                                                                                                   // 86
Factory.create = function(name, attributes) {                                                      // 87
  attributes = attributes || {};                                                                   // 88
  var doc = Factory.build(name, attributes, { insert: true });                                     // 89
  var record = Factory._create(name, doc);                                                         // 90
                                                                                                   // 91
  _.each(Factory.get(name).afterHooks, function(cb) {                                              // 92
    cb(record);                                                                                    // 93
  });                                                                                              // 94
                                                                                                   // 95
  return record;                                                                                   // 96
};                                                                                                 // 97
                                                                                                   // 98
Factory.extend = function(name, attributes) {                                                      // 99
  attributes = attributes || {};                                                                   // 100
  return _.extend(_.clone(Factory.get(name).attributes), attributes);                              // 101
};                                                                                                 // 102
                                                                                                   // 103
Factory.prototype.after = function(fn) {                                                           // 104
  this.afterHooks.push(fn);                                                                        // 105
  return this;                                                                                     // 106
};                                                                                                 // 107
                                                                                                   // 108
/////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['dburles:factory'] = {
  Factory: Factory
};

})();

//# sourceMappingURL=dburles_factory.js.map
