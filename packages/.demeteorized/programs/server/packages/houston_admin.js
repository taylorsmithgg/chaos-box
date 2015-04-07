(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var Accounts = Package['accounts-base'].Accounts;

/* Package-scope variables */
var __coffeescriptShare;

(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                             //
// packages/houston:admin/lib/collections.coffee.js                                                            //
//                                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                               //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var root;

root = typeof exports !== "undefined" && exports !== null ? exports : this;

if (root.Houston == null) {
  root.Houston = {};
}

if (Houston._collections == null) {
  Houston._collections = {};
}

Houston._collections.collections = new Meteor.Collection('houston_collections');

Houston._admins = new Meteor.Collection('houston_admins');

Houston._user_is_admin = function(id) {
  return (id != null) && Houston._admins.findOne({
    user_id: id
  });
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                             //
// packages/houston:admin/lib/shared.coffee.js                                                                 //
//                                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                               //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var root;

root = typeof exports !== "undefined" && exports !== null ? exports : this;

if (root.Houston == null) {
  root.Houston = {};
}

Houston._houstonize = function(name) {
  return "_houston_" + name;
};

Houston._custom_method_name = function(collection_name, method_name) {
  return Houston._houstonize("" + collection_name + "/" + method_name);
};

Houston._MAX_DOCS_TO_EXPLORE = 100;

Houston._get_fields_from_collection = function(collection) {
  return Houston._get_fields(collection.find().fetch());
};

Houston._get_fields = function(documents, options) {
  var document, find_fields, key, key_to_type, value, _i, _len, _ref, _results;
  if (options == null) {
    options = {};
  }
  key_to_type = options.exclude_id != null ? {} : {
    _id: 'ObjectId'
  };
  find_fields = function(document, prefix) {
    var full_path_key, key, value, _ref, _results;
    if (prefix == null) {
      prefix = '';
    }
    _ref = _.omit(document, '_id');
    _results = [];
    for (key in _ref) {
      value = _ref[key];
      if (typeof value === 'object') {
        if (value instanceof Date) {
          full_path_key = "" + prefix + key;
          _results.push(key_to_type[full_path_key] = "Date");
        } else {
          _results.push(find_fields(value, "" + prefix + key + "."));
        }
      } else if (typeof value !== 'function') {
        full_path_key = "" + prefix + key;
        _results.push(key_to_type[full_path_key] = typeof value);
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  };
  _ref = documents.slice(0, +Houston._MAX_DOCS_TO_EXPLORE + 1 || 9e9);
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    document = _ref[_i];
    find_fields(document);
  }
  _results = [];
  for (key in key_to_type) {
    value = key_to_type[key];
    _results.push({
      name: key,
      type: value
    });
  }
  return _results;
};

Houston._get_field_names = function(documents) {
  return _.pluck(Houston._get_fields(documents), 'name');
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                             //
// packages/houston:admin/lib/menu.coffee.js                                                                   //
//                                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                               //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var root;

root = typeof exports !== "undefined" && exports !== null ? exports : this;

if (root.Houston == null) {
  root.Houston = {};
}

Houston.menu = function() {
  var item, _i, _len;
  for (_i = 0, _len = arguments.length; _i < _len; _i++) {
    item = arguments[_i];
    this.menu._add_menu_item(item);
  }
};

Houston.menu.dependency = new Deps.Dependency;

Houston.menu._menu_items = [];

Houston.menu._process_item = function(item) {
  if (item.type !== 'link' && item.type !== 'template') {
    throw new Meteor.Error(400, 'Can\'t recognize type: ' + item);
  }
  if (item.type === 'link') {
    item.path = item.use;
  } else if (item.type === 'template') {
    item.path = "" + Houston._ROOT_ROUTE + "/actions/" + item.use;
  }
  return item;
};

Houston.menu._get_menu_items = function() {
  var item, _i, _len, _ref, _results;
  this.dependency.depend();
  _ref = this._menu_items;
  _results = [];
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    item = _ref[_i];
    _results.push(this._process_item(item));
  }
  return _results;
};

Houston.menu._add_menu_item = function(item) {
  this._menu_items.push(item);
  return this.dependency.changed();
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                             //
// packages/houston:admin/server/publications.coffee.js                                                        //
//                                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                               //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var ADDED_COLLECTIONS, root, sync_collections;

root = typeof exports !== "undefined" && exports !== null ? exports : this;

Houston._HIDDEN_COLLECTIONS = {
  'users': Meteor.users,
  'meteor_accounts_loginServiceConfiguration': void 0
};

ADDED_COLLECTIONS = {};

Houston._publish = function(name, func) {
  return Meteor.publish(Houston._houstonize(name), func);
};

Houston._setup_collection = function(collection) {
  var c, count, fields, name;
  name = collection._name;
  if (name in ADDED_COLLECTIONS) {
    return;
  }
  Houston._setup_collection_methods(collection);
  Houston._publish(name, function(sort, filter, limit, unknown_arg) {
    var e;
    check(sort, Match.Optional(Object));
    check(filter, Match.Optional(Object));
    check(limit, Match.Optional(Number));
    check(unknown_arg, Match.Any);
    if (!Houston._user_is_admin(this.userId)) {
      this.ready();
      return;
    }
    try {
      return collection.find(filter, {
        sort: sort,
        limit: limit
      });
    } catch (_error) {
      e = _error;
      return console.log(e);
    }
  });
  collection.find().observe({
    _suppress_initial: true,
    added: function(document) {
      return Houston._collections.collections.update({
        name: name
      }, {
        $inc: {
          count: 1
        },
        $addToSet: {
          fields: {
            $each: Houston._get_fields([document])
          }
        }
      });
    },
    changed: function(document) {
      return Houston._collections.collections.update({
        name: name
      }, {
        $addToSet: {
          fields: {
            $each: Houston._get_fields([document])
          }
        }
      });
    },
    removed: function(document) {
      return Houston._collections.collections.update({
        name: name
      }, {
        $inc: {
          count: -1
        }
      });
    }
  });
  fields = Houston._get_fields_from_collection(collection);
  c = Houston._collections.collections.findOne({
    name: name
  });
  count = collection.find().count();
  if (c) {
    Houston._collections.collections.update(c._id, {
      $set: {
        count: count,
        fields: fields
      }
    });
  } else {
    Houston._collections.collections.insert({
      name: name,
      count: count,
      fields: fields
    });
  }
  return ADDED_COLLECTIONS[name] = collection;
};

sync_collections = function() {
  var bound_sync_collections, collection, collections, mongo_driver, _i, _len, _ref, _ref1, _sync_collections;
  Houston._admins.findOne();
  collections = {};
  _ref1 = (_ref = Mongo.Collection.getAll()) != null ? _ref : [];
  for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
    collection = _ref1[_i];
    collections[collection.name] = collection.instance;
  }
  _sync_collections = function(meh, collections_db) {
    var col, collection_names;
    collection_names = (function() {
      var _j, _len1, _results;
      _results = [];
      for (_j = 0, _len1 = collections_db.length; _j < _len1; _j++) {
        col = collections_db[_j];
        if ((col.collectionName.indexOf("system.")) !== 0 && (col.collectionName.indexOf("houston_")) !== 0) {
          _results.push(col.collectionName);
        }
      }
      return _results;
    })();
    return collection_names.forEach(function(name) {
      if (!(name in ADDED_COLLECTIONS || name in Houston._HIDDEN_COLLECTIONS)) {
        if (collections[name] != null) {
          return Houston._setup_collection(collections[name]);
        }
      }
    });
  };
  bound_sync_collections = Meteor.bindEnvironment(_sync_collections, function(e) {
    return console.log("Failed while syncing collections for reason: " + e);
  });
  mongo_driver = (typeof MongoInternals !== "undefined" && MongoInternals !== null ? MongoInternals.defaultRemoteCollectionDriver() : void 0) || Meteor._RemoteCollectionDriver;
  return mongo_driver.mongo.db.collections(bound_sync_collections);
};

Meteor.methods({
  _houston_make_admin: function(user_id) {
    check(user_id, String);
    if (Houston._admins.findOne({
      'user_id': {
        $exists: true
      }
    })) {
      return;
    }
    Houston._admins.insert({
      user_id: user_id
    });
    sync_collections();
    return true;
  }
});

Houston._publish('collections', function() {
  if (!Houston._user_is_admin(this.userId)) {
    this.ready();
    return;
  }
  return Houston._collections.collections.find();
});

Houston._publish('admin_user', function() {
  return Houston._admins.find({});
});

Meteor.startup(function() {
  return sync_collections();
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                             //
// packages/houston:admin/server/exports.coffee.js                                                             //
//                                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                               //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var root;

root = typeof exports !== "undefined" && exports !== null ? exports : this;

Houston.add_collection = function(collection) {
  return Houston._setup_collection(collection);
};

Houston.hide_collection = function(collection) {
  var col;
  Houston._HIDDEN_COLLECTIONS[collection._name] = collection;
  col = Houston._collections.collections.findOne({
    name: collection._name
  });
  if (col != null) {
    return Houston._collections.collections.remove(col);
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                             //
// packages/houston:admin/server/methods.coffee.js                                                             //
//                                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                               //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var require_admin;

require_admin = function(func) {
  return function() {
    if (Houston._user_is_admin(this.userId)) {
      return func.apply(this, arguments);
    }
  };
};

Houston.methods = function(collection, raw_methods) {
  var collection_name, func, func_name, method_names, methods;
  collection_name = collection.name || collection._name || collection;
  method_names = _(raw_methods).keys();
  Houston._collections.collections.update({
    name: collection_name
  }, {
    $set: {
      method_names: method_names
    }
  });
  methods = {};
  for (func_name in raw_methods) {
    func = raw_methods[func_name];
    methods[Houston._custom_method_name(collection_name, func_name)] = require_admin(func);
  }
  return Meteor.methods(methods);
};

Houston._setup_collection_methods = function(collection) {
  var methods, name;
  name = collection._name;
  methods = {};
  methods[Houston._houstonize("" + name + "_insert")] = require_admin(function(doc) {
    check(doc, Object);
    return collection.insert(doc);
  });
  methods[Houston._houstonize("" + name + "_update")] = require_admin(function(id, update_dict) {
    check(id, Match.Any);
    check(update_dict, Object);
    if (collection.findOne(id)) {
      collection.update(id, update_dict);
    } else {
      id = collection.findOne(new Meteor.Collection.ObjectID(id));
      collection.update(id, update_dict);
    }
    return "" + collection._name + " " + id + " saved successfully";
  });
  methods[Houston._houstonize("" + name + "_delete")] = require_admin(function(id) {
    check(id, Match.Any);
    if (collection.findOne(id)) {
      return collection.remove(id);
    } else {
      id = collection.findOne(new Meteor.Collection.ObjectID(id));
      return collection.remove(id);
    }
  });
  return Meteor.methods(methods);
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['houston:admin'] = {};

})();

//# sourceMappingURL=houston_admin.js.map
