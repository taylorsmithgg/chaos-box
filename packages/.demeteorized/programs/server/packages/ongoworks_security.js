(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;
var _ = Package.underscore._;

/* Package-scope variables */
var Security, rulesByCollection, addFuncForAll, ensureCreated, ensureDefaultAllow, ensureSecureDeny;

(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/ongoworks:security/security-util.js                                                            //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
rulesByCollection = {};                                                                                    // 1
                                                                                                           // 2
addFuncForAll = function addFuncForAll(collections, allowOrDeny, types, fetch, func) {                     // 3
  var rules = {};                                                                                          // 4
  if (_.isArray(fetch)) {                                                                                  // 5
    rules.fetch = fetch;                                                                                   // 6
  }                                                                                                        // 7
  _.each(types, function (t) {                                                                             // 8
    rules[t] = func;                                                                                       // 9
  });                                                                                                      // 10
  _.each(collections, function (c) {                                                                       // 11
    c[allowOrDeny](rules);                                                                                 // 12
  });                                                                                                      // 13
};                                                                                                         // 14
                                                                                                           // 15
var created = {                                                                                            // 16
  allow: {                                                                                                 // 17
    insert: {},                                                                                            // 18
    update: {},                                                                                            // 19
    remove: {}                                                                                             // 20
  },                                                                                                       // 21
  deny: {                                                                                                  // 22
    insert: {},                                                                                            // 23
    update: {},                                                                                            // 24
    remove: {}                                                                                             // 25
  }                                                                                                        // 26
};                                                                                                         // 27
ensureCreated = function ensureCreated(allowOrDeny, collections, types, func) {                            // 28
  _.each(types, function (t) {                                                                             // 29
    collections = _.reject(collections, function (c) {                                                     // 30
      return _.has(created[allowOrDeny][t], c._name);                                                      // 31
    });                                                                                                    // 32
    addFuncForAll(collections, allowOrDeny, [t], null, func);                                              // 33
    // mark that we've defined function for collection-type combo                                          // 34
    _.each(collections, function (c) {                                                                     // 35
      created[allowOrDeny][t][c._name] = true;                                                             // 36
    });                                                                                                    // 37
  });                                                                                                      // 38
};                                                                                                         // 39
                                                                                                           // 40
ensureDefaultAllow = function ensureDefaultAllow(collections, types) {                                     // 41
  ensureCreated("allow", collections, types, function () {                                                 // 42
    return true;                                                                                           // 43
  });                                                                                                      // 44
};                                                                                                         // 45
                                                                                                           // 46
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/ongoworks:security/security-deny.js                                                            //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
/*                                                                                                         // 1
 * A single deny function runs all the deny functions registered by this package, allowing us to have      // 2
 * an OR relationship among multiple security rule chains.                                                 // 3
 */                                                                                                        // 4
                                                                                                           // 5
ensureSecureDeny = function ensureSecureDeny(collections, types) {                                         // 6
  _.each(types, function (t) {                                                                             // 7
    _.each(collections, function (collection) {                                                            // 8
      var collectionName = collection._name;                                                               // 9
      ensureCreated("deny", [collection], [t], function () {                                               // 10
        var args = _.toArray(arguments);                                                                   // 11
        var rules = rulesByCollection[collectionName] || [];                                               // 12
                                                                                                           // 13
        // select only those rules that apply to this operation type                                       // 14
        rules = _.select(rules, function (rule) {                                                          // 15
          return _.contains(rule._types, t);                                                               // 16
        });                                                                                                // 17
                                                                                                           // 18
        // Loop through all defined rules for this collection. There is an OR relationship among           // 19
        // all rules for the collection, so if any do NOT return true, we allow.                           // 20
        return _.every(rules, function (rule) {                                                            // 21
          return rule.deny(t, args);                                                                       // 22
        });                                                                                                // 23
      });                                                                                                  // 24
    });                                                                                                    // 25
  });                                                                                                      // 26
};                                                                                                         // 27
                                                                                                           // 28
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/ongoworks:security/security-api.js                                                             //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
// The `Security` object is exported and provides the package API                                          // 1
Security = {                                                                                               // 2
  Rule: function SecurityRuleConstructor(types) {                                                          // 3
    var self = this;                                                                                       // 4
                                                                                                           // 5
    if (!_.isArray(types)) {                                                                               // 6
      types = [types];                                                                                     // 7
    }                                                                                                      // 8
    self._types = types;                                                                                   // 9
    self._restrictions = [];                                                                               // 10
  },                                                                                                       // 11
  // the starting point of the chain                                                                       // 12
  permit: function permit(types) {                                                                         // 13
    return new Security.Rule(types);                                                                       // 14
  },                                                                                                       // 15
  defineMethod: function Security_defineMethod(name, definition) {                                         // 16
    // Check whether a rule with the given name already exists; can't overwrite                            // 17
    if (Security.Rule.prototype[name]) {                                                                   // 18
      throw new Error('A security method with the name "' + name + '" has already been defined');          // 19
    }                                                                                                      // 20
    // Make sure the definition argument is an object that has a `deny` property                           // 21
    if (!definition || !definition.deny) {                                                                 // 22
      throw new Error('Security.defineMethod requires a "deny" function');                                 // 23
    }                                                                                                      // 24
    Security.Rule.prototype[name] = function (arg) {                                                       // 25
      var self = this;                                                                                     // 26
      self._restrictions.push({                                                                            // 27
        definition: definition,                                                                            // 28
        arg: arg                                                                                           // 29
      });                                                                                                  // 30
      return self;                                                                                         // 31
    };                                                                                                     // 32
  }                                                                                                        // 33
};                                                                                                         // 34
                                                                                                           // 35
// Security.Rule prototypes                                                                                // 36
Security.Rule.prototype.collections = function (collections) {                                             // 37
  var self = this;                                                                                         // 38
  // Make sure the `collections` argument is either a `Mongo.Collection` instance or                       // 39
  // an array of them. If it's a single collection, convert it to a one-item array.                        // 40
  if (!_.isArray(collections)) {                                                                           // 41
    if (collections instanceof Mongo.Collection) {                                                         // 42
      collections = [collections];                                                                         // 43
    } else {                                                                                               // 44
      throw new Error("The collections argument must be a Mongo.Collection instance or an array of them"); // 45
    }                                                                                                      // 46
  }                                                                                                        // 47
                                                                                                           // 48
  self._collections = collections;                                                                         // 49
                                                                                                           // 50
  // Keep list keyed by collection name                                                                    // 51
  _.each(collections, function (collection) {                                                              // 52
    var n = collection._name;                                                                              // 53
    rulesByCollection[n] = rulesByCollection[n] || [];                                                     // 54
    rulesByCollection[n].push(self);                                                                       // 55
  });                                                                                                      // 56
                                                                                                           // 57
  return self;                                                                                             // 58
};                                                                                                         // 59
                                                                                                           // 60
Security.Rule.prototype.apply = function () {                                                              // 61
  var self = this;                                                                                         // 62
                                                                                                           // 63
  if (!self._collections || !self._types) {                                                                // 64
    throw new Error("At a minimum, you must call permit and collections methods for a security rule.");    // 65
  }                                                                                                        // 66
                                                                                                           // 67
  // If we haven't yet done so, set up a default, permissive `allow` function for all of                   // 68
  // the given collections and types. We control all security through `deny` functions only, but           // 69
  // there must first be at least one `allow` function for each collection or all writes                   // 70
  // will be denied.                                                                                       // 71
  ensureDefaultAllow(self._collections, self._types);                                                      // 72
                                                                                                           // 73
  // We need a combined `fetch` array. The `fetch` is optional and can be either an array                  // 74
  // or a function that takes the argument passed to the restriction method and returns an array.          // 75
  // TODO for now we can't set fetch accurately; maybe need to adjust API so that we "apply" only          // 76
  // after we've defined all rules                                                                         // 77
  //var fetch = [];                                                                                        // 78
  //_.each(self._restrictions, function (restriction) {                                                    // 79
  //  if (_.isArray(restriction.definition.fetch)) {                                                       // 80
  //    fetch = fetch.concat(restriction.definition.fetch);                                                // 81
  //  } else if (typeof restriction.definition.fetch === "function") {                                     // 82
  //    fetch = fetch.concat(restriction.definition.fetch(restriction.arg));                               // 83
  //  }                                                                                                    // 84
  //});                                                                                                    // 85
                                                                                                           // 86
  ensureSecureDeny(self._collections, self._types);                                                        // 87
                                                                                                           // 88
};                                                                                                         // 89
                                                                                                           // 90
Security.Rule.prototype.deny = function (type, args) {                                                     // 91
  var self = this;                                                                                         // 92
  // Loop through all defined restrictions. Restrictions are additive for this chained                     // 93
  // rule, so if any deny function returns true, this function should return true.                         // 94
  return _.any(self._restrictions, function (restriction) {                                                // 95
    return restriction.definition.deny.apply(this, [type, restriction.arg].concat(args));                  // 96
  });                                                                                                      // 97
};                                                                                                         // 98
                                                                                                           // 99
Mongo.Collection.prototype.permit = function (types) {                                                     // 100
  return Security.permit(types).collections(this);                                                         // 101
};                                                                                                         // 102
                                                                                                           // 103
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/ongoworks:security/security-rules.js                                                           //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
/*                                                                                                         // 1
 * This file defines built-in restriction methods                                                          // 2
 */                                                                                                        // 3
                                                                                                           // 4
/*                                                                                                         // 5
 * No one                                                                                                  // 6
 */                                                                                                        // 7
                                                                                                           // 8
Security.defineMethod("never", {                                                                           // 9
  fetch: [],                                                                                               // 10
  deny: function (type, arg) {                                                                             // 11
    return true;                                                                                           // 12
  }                                                                                                        // 13
});                                                                                                        // 14
                                                                                                           // 15
/*                                                                                                         // 16
 * Logged In                                                                                               // 17
 */                                                                                                        // 18
                                                                                                           // 19
Security.defineMethod("ifLoggedIn", {                                                                      // 20
  fetch: [],                                                                                               // 21
  deny: function (type, arg, userId) {                                                                     // 22
    return !userId;                                                                                        // 23
  }                                                                                                        // 24
});                                                                                                        // 25
                                                                                                           // 26
/*                                                                                                         // 27
 * Specific User ID                                                                                        // 28
 */                                                                                                        // 29
                                                                                                           // 30
Security.defineMethod("ifHasUserId", {                                                                     // 31
  fetch: [],                                                                                               // 32
  deny: function (type, arg, userId) {                                                                     // 33
    return userId !== arg;                                                                                 // 34
  }                                                                                                        // 35
});                                                                                                        // 36
                                                                                                           // 37
/*                                                                                                         // 38
 * Specific Roles                                                                                          // 39
 */                                                                                                        // 40
                                                                                                           // 41
if (Package && Package["alanning:roles"]) {                                                                // 42
                                                                                                           // 43
  var Roles = Package["alanning:roles"].Roles;                                                             // 44
                                                                                                           // 45
  Security.defineMethod("ifHasRole", {                                                                     // 46
    fetch: [],                                                                                             // 47
    deny: function (type, arg, userId) {                                                                   // 48
      return !Roles.userIsInRole(userId, arg);                                                             // 49
    }                                                                                                      // 50
  });                                                                                                      // 51
                                                                                                           // 52
}                                                                                                          // 53
                                                                                                           // 54
/*                                                                                                         // 55
 * Specific Properties                                                                                     // 56
 */                                                                                                        // 57
                                                                                                           // 58
Security.defineMethod("onlyProps", {                                                                       // 59
  fetch: [],                                                                                               // 60
  deny: function (type, arg, userId, doc, fieldNames) {                                                    // 61
    if (!_.isArray(arg)) {                                                                                 // 62
      arg = [arg];                                                                                         // 63
    }                                                                                                      // 64
                                                                                                           // 65
    fieldNames = fieldNames || _.keys(doc);                                                                // 66
                                                                                                           // 67
    return !_.every(fieldNames, function (fieldName) {                                                     // 68
      return _.contains(arg, fieldName);                                                                   // 69
    });                                                                                                    // 70
  }                                                                                                        // 71
});                                                                                                        // 72
                                                                                                           // 73
Security.defineMethod("exceptProps", {                                                                     // 74
  fetch: [],                                                                                               // 75
  deny: function (type, arg, userId, doc, fieldNames) {                                                    // 76
    if (!_.isArray(arg)) {                                                                                 // 77
      arg = [arg];                                                                                         // 78
    }                                                                                                      // 79
                                                                                                           // 80
    fieldNames = fieldNames || _.keys(doc);                                                                // 81
                                                                                                           // 82
    return _.any(fieldNames, function (fieldName) {                                                        // 83
      return _.contains(arg, fieldName);                                                                   // 84
    });                                                                                                    // 85
  }                                                                                                        // 86
});                                                                                                        // 87
                                                                                                           // 88
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['ongoworks:security'] = {
  Security: Security
};

})();

//# sourceMappingURL=ongoworks_security.js.map
