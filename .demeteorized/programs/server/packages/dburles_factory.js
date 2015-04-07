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

///////////////////////////////////////////////////////////////////////////////////
//                                                                               //
// packages/dburles:factory/lib/factory.js                                       //
//                                                                               //
///////////////////////////////////////////////////////////////////////////////////
                                                                                 //
var factories = {};                                                              // 1
                                                                                 // 2
Factory = function(name, collection, attributes) {                               // 3
  this.name = name;                                                              // 4
  this.collection = collection;                                                  // 5
  this.attributes = attributes;                                                  // 6
  this.afterHooks = [];                                                          // 7
  this.sequence = 0;                                                             // 8
};                                                                               // 9
                                                                                 // 10
Factory.define = function(name, collection, attributes) {                        // 11
  factories[name] = new Factory(name, collection, attributes);                   // 12
  return factories[name];                                                        // 13
};                                                                               // 14
                                                                                 // 15
Factory.get = function(name) {                                                   // 16
  var factory = factories[name];                                                 // 17
  if (! factory) throw new Error("Factory: There is no factory named " + name);  // 18
  return factory;                                                                // 19
};                                                                               // 20
                                                                                 // 21
Factory.build = function(name, attributes, options) {                            // 22
  var factory = Factory.get(name);                                               // 23
  var base = {};                                                                 // 24
  attributes = attributes || {};                                                 // 25
  options = options || {};                                                       // 26
                                                                                 // 27
  // "raw" attributes without functions evaluated, or dotted properties resolved // 28
  attributes = _.extend(base, factory.attributes, attributes);                   // 29
                                                                                 // 30
  var result = {};                                                               // 31
                                                                                 // 32
  // either create a new factory and return its _id                              // 33
  // or return a 'fake' _id (since we're not inserting anything)                 // 34
  var makeRelation = function(name) {                                            // 35
    if (options.insert)                                                          // 36
      return Factory.create(name)._id;                                           // 37
    else                                                                         // 38
      // fake an id on build                                                     // 39
      return Random.id();                                                        // 40
  };                                                                             // 41
                                                                                 // 42
  factory.sequence += 1;                                                         // 43
                                                                                 // 44
  var walk = function(record, object) {                                          // 45
    _.each(object, function(value, key) {                                        // 46
      // is this a Factory instance?                                             // 47
      if (value instanceof Factory) {                                            // 48
        value = makeRelation(value.name);                                        // 49
      } else if (_.isFunction(value)) {                                          // 50
        var fnRes = value.call(result, {                                         // 51
          sequence: function(fn) {                                               // 52
            return fn(factory.sequence);                                         // 53
          }                                                                      // 54
        });                                                                      // 55
        // does executing this function return a Factory instance?               // 56
        value = (fnRes instanceof Factory) ? makeRelation(fnRes.name) : fnRes;   // 57
      // if an object literal is passed in, traverse deeper into it              // 58
      } else if (Object.prototype.toString.call(value) === '[object Object]') {  // 59
        record[key] = record[key] || {};                                         // 60
        return walk(record[key], value);                                         // 61
      }                                                                          // 62
                                                                                 // 63
      var modifier = { $set: {} };                                               // 64
      modifier.$set[key] = value;                                                // 65
                                                                                 // 66
      LocalCollection._modify(record, modifier);                                 // 67
    });                                                                          // 68
  };                                                                             // 69
                                                                                 // 70
  walk(result, attributes);                                                      // 71
                                                                                 // 72
  result._id = Random.id();                                                      // 73
  return result;                                                                 // 74
};                                                                               // 75
                                                                                 // 76
Factory._create = function(name, doc) {                                          // 77
  var collection = Factory.get(name).collection;                                 // 78
  var insertId = collection.insert(doc);                                         // 79
  var record = collection.findOne(insertId);                                     // 80
  return record;                                                                 // 81
};                                                                               // 82
                                                                                 // 83
Factory.create = function(name, attributes) {                                    // 84
  attributes = attributes || {};                                                 // 85
  var doc = Factory.build(name, attributes, { insert: true });                   // 86
  var record = Factory._create(name, doc);                                       // 87
                                                                                 // 88
  _.each(Factory.get(name).afterHooks, function(cb) {                            // 89
    cb(record);                                                                  // 90
  });                                                                            // 91
                                                                                 // 92
  return record;                                                                 // 93
};                                                                               // 94
                                                                                 // 95
Factory.extend = function(name, attributes) {                                    // 96
  attributes = attributes || {};                                                 // 97
  return _.extend(_.clone(Factory.get(name).attributes), attributes);            // 98
};                                                                               // 99
                                                                                 // 100
Factory.prototype.after = function(fn) {                                         // 101
  this.afterHooks.push(fn);                                                      // 102
  return this;                                                                   // 103
};                                                                               // 104
                                                                                 // 105
///////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['dburles:factory'] = {
  Factory: Factory
};

})();

//# sourceMappingURL=dburles_factory.js.map
