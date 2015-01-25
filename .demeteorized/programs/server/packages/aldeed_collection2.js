(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var SimpleSchema = Package['aldeed:simple-schema'].SimpleSchema;
var MongoObject = Package['aldeed:simple-schema'].MongoObject;
var _ = Package.underscore._;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var check = Package.check.check;
var Match = Package.check.Match;
var EJSON = Package.ejson.EJSON;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;

/* Package-scope variables */
var Mongo;

(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/aldeed:collection2/collection2.js                                                                         //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
// Extend the schema options allowed by SimpleSchema                                                                  // 1
SimpleSchema.extendOptions({                                                                                          // 2
  index: Match.Optional(Match.OneOf(Number, String, Boolean)),                                                        // 3
  unique: Match.Optional(Boolean),                                                                                    // 4
  denyInsert: Match.Optional(Boolean),                                                                                // 5
  denyUpdate: Match.Optional(Boolean)                                                                                 // 6
});                                                                                                                   // 7
                                                                                                                      // 8
// Define some extra validation error messages                                                                        // 9
SimpleSchema.messages({                                                                                               // 10
  notUnique: "[label] must be unique",                                                                                // 11
  insertNotAllowed: "[label] cannot be set during an insert",                                                         // 12
  updateNotAllowed: "[label] cannot be set during an update"                                                          // 13
});                                                                                                                   // 14
                                                                                                                      // 15
/*                                                                                                                    // 16
 * Public API                                                                                                         // 17
 */                                                                                                                   // 18
                                                                                                                      // 19
// backwards compatibility                                                                                            // 20
if (typeof Mongo === "undefined") {                                                                                   // 21
  Mongo = {};                                                                                                         // 22
  Mongo.Collection = Meteor.Collection;                                                                               // 23
}                                                                                                                     // 24
                                                                                                                      // 25
/**                                                                                                                   // 26
 * Mongo.Collection.prototype.attachSchema                                                                            // 27
 * @param {SimpleSchema|Object} ss - SimpleSchema instance or a schema definition object from which to create a new SimpleSchema instance
 * @param {Object} [options]                                                                                          // 29
 * @param {Boolean} [options.transform=false] Set to `true` if your document must be passed through the collection's transform to properly validate.
 * @param {Boolean} [options.replace=false] Set to `true` to replace any existing schema instead of combining         // 31
 * @return {undefined}                                                                                                // 32
 *                                                                                                                    // 33
 * Use this method to attach a schema to a collection created by another package,                                     // 34
 * such as Meteor.users. It is most likely unsafe to call this method more than                                       // 35
 * once for a single collection, or to call this for a collection that had a                                          // 36
 * schema object passed to its constructor.                                                                           // 37
 */                                                                                                                   // 38
Mongo.Collection.prototype.attachSchema = function c2AttachSchema(ss, options) {                                      // 39
  var self = this;                                                                                                    // 40
  options = options || {};                                                                                            // 41
                                                                                                                      // 42
  if (!(ss instanceof SimpleSchema)) {                                                                                // 43
    ss = new SimpleSchema(ss);                                                                                        // 44
  }                                                                                                                   // 45
                                                                                                                      // 46
  self._c2 = self._c2 || {};                                                                                          // 47
                                                                                                                      // 48
  // If we've already attached one schema, we combine both into a new schema unless options.replace is `true`         // 49
  if (self._c2._simpleSchema && options.replace !== true) {                                                           // 50
    ss = new SimpleSchema([self._c2._simpleSchema, ss]);                                                              // 51
  }                                                                                                                   // 52
                                                                                                                      // 53
  // Track the schema in the collection                                                                               // 54
  self._c2._simpleSchema = ss;                                                                                        // 55
                                                                                                                      // 56
  // Loop over fields definitions and ensure collection indexes (server side only)                                    // 57
  _.each(ss.schema(), function(definition, fieldName) {                                                               // 58
    if (Meteor.isServer && ('index' in definition || definition.unique === true)) {                                   // 59
                                                                                                                      // 60
      function setUpIndex() {                                                                                         // 61
        var index = {}, indexValue;                                                                                   // 62
        // If they specified `unique: true` but not `index`, we assume `index: 1` to set up the unique index in mongo // 63
        if ('index' in definition) {                                                                                  // 64
          indexValue = definition['index'];                                                                           // 65
          if (indexValue === true) {                                                                                  // 66
            indexValue = 1;                                                                                           // 67
          }                                                                                                           // 68
        } else {                                                                                                      // 69
          indexValue = 1;                                                                                             // 70
        }                                                                                                             // 71
        var indexName = 'c2_' + fieldName;                                                                            // 72
        // In the index object, we want object array keys without the ".$" piece                                      // 73
        var idxFieldName = fieldName.replace(/\.\$\./g, ".");                                                         // 74
        index[idxFieldName] = indexValue;                                                                             // 75
        var unique = !!definition.unique && (indexValue === 1 || indexValue === -1);                                  // 76
        var sparse = !!definition.optional && unique;                                                                 // 77
        if (indexValue !== false) {                                                                                   // 78
          self._collection._ensureIndex(index, {                                                                      // 79
            background: true,                                                                                         // 80
            name: indexName,                                                                                          // 81
            unique: unique,                                                                                           // 82
            sparse: sparse                                                                                            // 83
          });                                                                                                         // 84
        } else {                                                                                                      // 85
          try {                                                                                                       // 86
            self._collection._dropIndex(indexName);                                                                   // 87
          } catch (err) {                                                                                             // 88
            // no index with that name, which is what we want                                                         // 89
          }                                                                                                           // 90
        }                                                                                                             // 91
      }                                                                                                               // 92
                                                                                                                      // 93
      Meteor.startup(setUpIndex);                                                                                     // 94
    }                                                                                                                 // 95
  });                                                                                                                 // 96
                                                                                                                      // 97
  // Set up additional checks                                                                                         // 98
  ss.validator(function() {                                                                                           // 99
    var test, totalUsing, totalWillUse, sel;                                                                          // 100
    var def = this.definition;                                                                                        // 101
    var val = this.value;                                                                                             // 102
    var op = this.operator;                                                                                           // 103
    var key = this.key;                                                                                               // 104
                                                                                                                      // 105
    if (def.denyInsert && val !== void 0 && !op) {                                                                    // 106
      // This is an insert of a defined value into a field where denyInsert=true                                      // 107
      return "insertNotAllowed";                                                                                      // 108
    }                                                                                                                 // 109
                                                                                                                      // 110
    if (def.denyUpdate && op) {                                                                                       // 111
      // This is an insert of a defined value into a field where denyUpdate=true                                      // 112
      if (op !== "$set" || (op === "$set" && val !== void 0)) {                                                       // 113
        return "updateNotAllowed";                                                                                    // 114
      }                                                                                                               // 115
    }                                                                                                                 // 116
                                                                                                                      // 117
    return true;                                                                                                      // 118
  });                                                                                                                 // 119
                                                                                                                      // 120
  defineDeny(self, options);                                                                                          // 121
  keepInsecure(self);                                                                                                 // 122
};                                                                                                                    // 123
                                                                                                                      // 124
Mongo.Collection.prototype.simpleSchema = function c2SS() {                                                           // 125
  var self = this;                                                                                                    // 126
  return self._c2 ? self._c2._simpleSchema : null;                                                                    // 127
};                                                                                                                    // 128
                                                                                                                      // 129
// Wrap DB write operation methods                                                                                    // 130
_.each(['insert', 'update', 'upsert'], function(methodName) {                                                         // 131
  var _super = Mongo.Collection.prototype[methodName];                                                                // 132
  Mongo.Collection.prototype[methodName] = function () {                                                              // 133
    var self = this, args = _.toArray(arguments);                                                                     // 134
    if (self._c2) {                                                                                                   // 135
      args = doValidate.call(self, methodName, args, false,                                                           // 136
        (Meteor.isClient && Meteor.userId && Meteor.userId()) || null, Meteor.isServer);                              // 137
      if (!args) {                                                                                                    // 138
        // doValidate already called the callback or threw the error                                                  // 139
        if (methodName === "insert") {                                                                                // 140
          // insert should always return an ID to match core behavior                                                 // 141
          return self._makeNewID();                                                                                   // 142
        } else {                                                                                                      // 143
          return;                                                                                                     // 144
        }                                                                                                             // 145
      }                                                                                                               // 146
    }                                                                                                                 // 147
    return _super.apply(self, args);                                                                                  // 148
  };                                                                                                                  // 149
});                                                                                                                   // 150
                                                                                                                      // 151
/*                                                                                                                    // 152
 * Private                                                                                                            // 153
 */                                                                                                                   // 154
                                                                                                                      // 155
function doValidate(type, args, skipAutoValue, userId, isFromTrustedCode) {                                           // 156
  var self = this, schema = self._c2._simpleSchema,                                                                   // 157
      doc, callback, error, options, isUpsert, selector,                                                              // 158
      isLocalCollection = self._connection === null;                                                                  // 159
                                                                                                                      // 160
  if (!args.length) {                                                                                                 // 161
    throw new Error(type + " requires an argument");                                                                  // 162
  }                                                                                                                   // 163
                                                                                                                      // 164
  // Gather arguments and cache the selector                                                                          // 165
  if (type === "insert") {                                                                                            // 166
    doc = args[0];                                                                                                    // 167
    options = args[1];                                                                                                // 168
    callback = args[2];                                                                                               // 169
                                                                                                                      // 170
    // The real insert doesn't take options                                                                           // 171
    if (typeof options === "function") {                                                                              // 172
      args = [doc, options];                                                                                          // 173
    } else if (typeof callback === "function") {                                                                      // 174
      args = [doc, callback];                                                                                         // 175
    } else {                                                                                                          // 176
      args = [doc];                                                                                                   // 177
    }                                                                                                                 // 178
                                                                                                                      // 179
  } else if (type === "update" || type === "upsert") {                                                                // 180
    selector = args[0];                                                                                               // 181
    doc = args[1];                                                                                                    // 182
    options = args[2];                                                                                                // 183
    callback = args[3];                                                                                               // 184
  } else {                                                                                                            // 185
    throw new Error("invalid type argument");                                                                         // 186
  }                                                                                                                   // 187
                                                                                                                      // 188
  // Support missing options arg                                                                                      // 189
  if (!callback && typeof options === "function") {                                                                   // 190
    callback = options;                                                                                               // 191
    options = {};                                                                                                     // 192
  }                                                                                                                   // 193
  options = options || {};                                                                                            // 194
                                                                                                                      // 195
  // If update was called with upsert:true or upsert was called, flag as an upsert                                    // 196
  isUpsert = (type === "upsert" || (type === "update" && options.upsert === true));                                   // 197
                                                                                                                      // 198
  // Add a default callback function if we're on the client and no callback was given                                 // 199
  if (Meteor.isClient && !callback) {                                                                                 // 200
    // Client can't block, so it can't report errors by exception,                                                    // 201
    // only by callback. If they forget the callback, give them a                                                     // 202
    // default one that logs the error, so they aren't totally                                                        // 203
    // baffled if their writes don't work because their database is                                                   // 204
    // down.                                                                                                          // 205
    callback = function(err) {                                                                                        // 206
      if (err)                                                                                                        // 207
        Meteor._debug(type + " failed: " + (err.reason || err.stack));                                                // 208
    };                                                                                                                // 209
  }                                                                                                                   // 210
                                                                                                                      // 211
  // If client validation is fine or is skipped but then something                                                    // 212
  // is found to be invalid on the server, we get that error back                                                     // 213
  // as a special Meteor.Error that we need to parse.                                                                 // 214
  if (Meteor.isClient) {                                                                                              // 215
    var last = args.length - 1;                                                                                       // 216
    if (typeof args[last] === 'function') {                                                                           // 217
      callback = args[last] = wrapCallbackForParsingServerErrors(self, options.validationContext, callback);          // 218
    }                                                                                                                 // 219
  }                                                                                                                   // 220
                                                                                                                      // 221
  // If _id has already been added, remove it temporarily if it's                                                     // 222
  // not explicitly defined in the schema.                                                                            // 223
  var id;                                                                                                             // 224
  if (Meteor.isServer && doc._id && !schema.allowsKey("_id")) {                                                       // 225
    id = doc._id;                                                                                                     // 226
    delete doc._id;                                                                                                   // 227
  }                                                                                                                   // 228
                                                                                                                      // 229
  function doClean(docToClean, getAutoValues, filter, autoConvert, removeEmptyStrings, trimStrings) {                 // 230
    // Clean the doc/modifier in place                                                                                // 231
    schema.clean(docToClean, {                                                                                        // 232
      filter: filter,                                                                                                 // 233
      autoConvert: autoConvert,                                                                                       // 234
      getAutoValues: getAutoValues,                                                                                   // 235
      isModifier: (type !== "insert"),                                                                                // 236
      removeEmptyStrings: removeEmptyStrings,                                                                         // 237
      trimStrings: trimStrings,                                                                                       // 238
      extendAutoValueContext: {                                                                                       // 239
        isInsert: (type === "insert"),                                                                                // 240
        isUpdate: (type === "update" && options.upsert !== true),                                                     // 241
        isUpsert: isUpsert,                                                                                           // 242
        userId: userId,                                                                                               // 243
        isFromTrustedCode: isFromTrustedCode,                                                                         // 244
        docId: ((type === "update" || type === "upsert") && selector && selector._id) ? selector._id : void 0,        // 245
        isLocalCollection: isLocalCollection                                                                          // 246
      }                                                                                                               // 247
    });                                                                                                               // 248
  }                                                                                                                   // 249
                                                                                                                      // 250
  // On the server and for local collections, we allow passing `getAutoValues: false` to disable autoValue functions  // 251
  if ((Meteor.isServer || isLocalCollection) && options.getAutoValues === false) {                                    // 252
    skipAutoValue = true;                                                                                             // 253
  }                                                                                                                   // 254
                                                                                                                      // 255
  // Preliminary cleaning on both client and server. On the server and for local                                      // 256
  // collections, automatic values will also be set at this point.                                                    // 257
  doClean(doc, ((Meteor.isServer || isLocalCollection) && !skipAutoValue), options.filter !== false, options.autoConvert !== false, options.removeEmptyStrings !== false, options.trimStrings !== false);
                                                                                                                      // 259
  // We clone before validating because in some cases we need to adjust the                                           // 260
  // object a bit before validating it. If we adjusted `doc` itself, our                                              // 261
  // changes would persist into the database.                                                                         // 262
  var docToValidate = {};                                                                                             // 263
  for (var prop in doc) {                                                                                             // 264
    // We omit prototype properties when cloning because they will not be valid                                       // 265
    // and mongo omits them when saving to the database anyway.                                                       // 266
    if (doc.hasOwnProperty(prop)) {                                                                                   // 267
      docToValidate[prop] = doc[prop];                                                                                // 268
    }                                                                                                                 // 269
  }                                                                                                                   // 270
                                                                                                                      // 271
  // On the server, upserts are possible; SimpleSchema handles upserts pretty                                         // 272
  // well by default, but it will not know about the fields in the selector,                                          // 273
  // which are also stored in the database if an insert is performed. So we                                           // 274
  // will allow these fields to be considered for validation by adding them                                           // 275
  // to the $set in the modifier. This is no doubt prone to errors, but there                                         // 276
  // probably isn't any better way right now.                                                                         // 277
  if (Meteor.isServer && isUpsert && _.isObject(selector)) {                                                          // 278
    var set = docToValidate.$set || {};                                                                               // 279
    docToValidate.$set = _.clone(selector);                                                                           // 280
    _.extend(docToValidate.$set, set);                                                                                // 281
  }                                                                                                                   // 282
                                                                                                                      // 283
  // Set automatic values for validation on the client.                                                               // 284
  // On the server, we already updated doc with auto values, but on the client,                                       // 285
  // we will add them to docToValidate for validation purposes only.                                                  // 286
  // This is because we want all actual values generated on the server.                                               // 287
  if (Meteor.isClient && !isLocalCollection) {                                                                        // 288
    doClean(docToValidate, true, false, false, false, false);                                                         // 289
  }                                                                                                                   // 290
                                                                                                                      // 291
  // Validate doc                                                                                                     // 292
  var ctx = schema.namedContext(options.validationContext);                                                           // 293
  var isValid;                                                                                                        // 294
  if (options.validate === false) {                                                                                   // 295
    isValid = true;                                                                                                   // 296
  } else {                                                                                                            // 297
    isValid = ctx.validate(docToValidate, {                                                                           // 298
      modifier: (type === "update" || type === "upsert"),                                                             // 299
      upsert: isUpsert,                                                                                               // 300
      extendedCustomContext: {                                                                                        // 301
        isInsert: (type === "insert"),                                                                                // 302
        isUpdate: (type === "update" && options.upsert !== true),                                                     // 303
        isUpsert: isUpsert,                                                                                           // 304
        userId: userId,                                                                                               // 305
        isFromTrustedCode: isFromTrustedCode,                                                                         // 306
        docId: ((type === "update" || type === "upsert") && selector && selector._id) ? selector._id : void 0,        // 307
        isLocalCollection: isLocalCollection                                                                          // 308
      }                                                                                                               // 309
    });                                                                                                               // 310
  }                                                                                                                   // 311
                                                                                                                      // 312
  if (isValid) {                                                                                                      // 313
    // Add the ID back                                                                                                // 314
    if (id) {                                                                                                         // 315
      doc._id = id;                                                                                                   // 316
    }                                                                                                                 // 317
    // Update the args to reflect the cleaned doc                                                                     // 318
    if (type === "insert") {                                                                                          // 319
      args[0] = doc;                                                                                                  // 320
    } else {                                                                                                          // 321
      args[1] = doc;                                                                                                  // 322
    }                                                                                                                 // 323
                                                                                                                      // 324
    // If callback, set invalidKey when we get a mongo unique error                                                   // 325
    if (Meteor.isServer) {                                                                                            // 326
      var last = args.length - 1;                                                                                     // 327
      if (typeof args[last] === 'function') {                                                                         // 328
        args[last] = wrapCallbackForParsingMongoValidationErrors(self, doc, options.validationContext, args[last]);   // 329
      }                                                                                                               // 330
    }                                                                                                                 // 331
    return args;                                                                                                      // 332
  } else {                                                                                                            // 333
    error = getErrorObject(ctx);                                                                                      // 334
    if (callback) {                                                                                                   // 335
      // insert/update/upsert pass `false` when there's an error, so we do that                                       // 336
      callback(error, false);                                                                                         // 337
    } else {                                                                                                          // 338
      throw error;                                                                                                    // 339
    }                                                                                                                 // 340
  }                                                                                                                   // 341
}                                                                                                                     // 342
                                                                                                                      // 343
function getErrorObject(context) {                                                                                    // 344
  var message, invalidKeys = context.invalidKeys();                                                                   // 345
  if (invalidKeys.length) {                                                                                           // 346
    message = context.keyErrorMessage(invalidKeys[0].name);                                                           // 347
  } else {                                                                                                            // 348
    message = "Failed validation";                                                                                    // 349
  }                                                                                                                   // 350
  var error = new Error(message);                                                                                     // 351
  error.invalidKeys = invalidKeys;                                                                                    // 352
  // If on the server, we add a sanitized error, too, in case we're                                                   // 353
  // called from a method.                                                                                            // 354
  if (Meteor.isServer) {                                                                                              // 355
    error.sanitizedError = new Meteor.Error(400, message);                                                            // 356
  }                                                                                                                   // 357
  return error;                                                                                                       // 358
}                                                                                                                     // 359
                                                                                                                      // 360
function addUniqueError(context, errorMessage) {                                                                      // 361
  var name = errorMessage.split('c2_')[1].split(' ')[0];                                                              // 362
  var val = errorMessage.split('dup key:')[1].split('"')[1];                                                          // 363
  context.addInvalidKeys([{                                                                                           // 364
    name: name,                                                                                                       // 365
    type: 'notUnique',                                                                                                // 366
    value: val                                                                                                        // 367
  }]);                                                                                                                // 368
}                                                                                                                     // 369
                                                                                                                      // 370
function wrapCallbackForParsingMongoValidationErrors(col, doc, vCtx, cb) {                                            // 371
  return function wrappedCallbackForParsingMongoValidationErrors(error) {                                             // 372
    if (error && ((error.name === "MongoError" && error.code === 11001) || error.message.indexOf('MongoError: E11000' !== -1)) && error.message.indexOf('c2_') !== -1) {
      var context = col.simpleSchema().namedContext(vCtx);                                                            // 374
      addUniqueError(context, error.message);                                                                         // 375
      arguments[0] = getErrorObject(context);                                                                         // 376
    }                                                                                                                 // 377
    return cb.apply(this, arguments);                                                                                 // 378
  };                                                                                                                  // 379
}                                                                                                                     // 380
                                                                                                                      // 381
function wrapCallbackForParsingServerErrors(col, vCtx, cb) {                                                          // 382
  return function wrappedCallbackForParsingServerErrors(error) {                                                      // 383
    // Handle our own validation errors                                                                               // 384
    var context = col.simpleSchema().namedContext(vCtx);                                                              // 385
    if (error instanceof Meteor.Error && error.error === 400 && error.reason === "INVALID" && typeof error.details === "string") {
      var invalidKeysFromServer = EJSON.parse(error.details);                                                         // 387
      context.addInvalidKeys(invalidKeysFromServer);                                                                  // 388
      arguments[0] = getErrorObject(context);                                                                         // 389
    }                                                                                                                 // 390
    // Handle Mongo unique index errors, which are forwarded to the client as 409 errors                              // 391
    else if (error instanceof Meteor.Error && error.error === 409 && error.reason && error.reason.indexOf('E11000') !== -1 && error.reason.indexOf('c2_') !== -1) {
      addUniqueError(context, error.reason);                                                                          // 393
      arguments[0] = getErrorObject(context);                                                                         // 394
    }                                                                                                                 // 395
    return cb.apply(this, arguments);                                                                                 // 396
  };                                                                                                                  // 397
}                                                                                                                     // 398
                                                                                                                      // 399
var alreadyInsecured = {};                                                                                            // 400
function keepInsecure(c) {                                                                                            // 401
  // If insecure package is in use, we need to add allow rules that return                                            // 402
  // true. Otherwise, it would seemingly turn off insecure mode.                                                      // 403
  if (Package && Package.insecure && !alreadyInsecured[c._name]) {                                                    // 404
    c.allow({                                                                                                         // 405
      insert: function() {                                                                                            // 406
        return true;                                                                                                  // 407
      },                                                                                                              // 408
      update: function() {                                                                                            // 409
        return true;                                                                                                  // 410
      },                                                                                                              // 411
      remove: function () {                                                                                           // 412
        return true;                                                                                                  // 413
      },                                                                                                              // 414
      fetch: [],                                                                                                      // 415
      transform: null                                                                                                 // 416
    });                                                                                                               // 417
    alreadyInsecured[c._name] = true;                                                                                 // 418
  }                                                                                                                   // 419
  // If insecure package is NOT in use, then adding the two deny functions                                            // 420
  // does not have any effect on the main app's security paradigm. The                                                // 421
  // user will still be required to add at least one allow function of her                                            // 422
  // own for each operation for this collection. And the user may still add                                           // 423
  // additional deny functions, but does not have to.                                                                 // 424
}                                                                                                                     // 425
                                                                                                                      // 426
var alreadyDefined = {};                                                                                              // 427
function defineDeny(c, options) {                                                                                     // 428
  if (!alreadyDefined[c._name]) {                                                                                     // 429
                                                                                                                      // 430
    var isLocalCollection = (c._connection === null);                                                                 // 431
                                                                                                                      // 432
    // First define deny functions to extend doc with the results of clean                                            // 433
    // and autovalues. This must be done with "transform: null" or we would be                                        // 434
    // extending a clone of doc and therefore have no effect.                                                         // 435
    c.deny({                                                                                                          // 436
      insert: function(userId, doc) {                                                                                 // 437
        var ss = c.simpleSchema();                                                                                    // 438
        // If _id has already been added, remove it temporarily if it's                                               // 439
        // not explicitly defined in the schema.                                                                      // 440
        var id;                                                                                                       // 441
        if (Meteor.isServer && doc._id && !ss.allowsKey("_id")) {                                                     // 442
          id = doc._id;                                                                                               // 443
          delete doc._id;                                                                                             // 444
        }                                                                                                             // 445
                                                                                                                      // 446
        // Referenced doc is cleaned in place                                                                         // 447
        ss.clean(doc, {                                                                                               // 448
          isModifier: false,                                                                                          // 449
          // We don't do these here because they are done on the client if desired                                    // 450
          filter: false,                                                                                              // 451
          autoConvert: false,                                                                                         // 452
          removeEmptyStrings: false,                                                                                  // 453
          trimStrings: false,                                                                                         // 454
          extendAutoValueContext: {                                                                                   // 455
            isInsert: true,                                                                                           // 456
            isUpdate: false,                                                                                          // 457
            isUpsert: false,                                                                                          // 458
            userId: userId,                                                                                           // 459
            isFromTrustedCode: false,                                                                                 // 460
            isLocalCollection: isLocalCollection                                                                      // 461
          }                                                                                                           // 462
        });                                                                                                           // 463
                                                                                                                      // 464
        // Add the ID back                                                                                            // 465
        if (id) {                                                                                                     // 466
          doc._id = id;                                                                                               // 467
        }                                                                                                             // 468
                                                                                                                      // 469
        return false;                                                                                                 // 470
      },                                                                                                              // 471
      update: function(userId, doc, fields, modifier) {                                                               // 472
        var ss = c.simpleSchema();                                                                                    // 473
        // Referenced modifier is cleaned in place                                                                    // 474
        ss.clean(modifier, {                                                                                          // 475
          isModifier: true,                                                                                           // 476
          // We don't do these here because they are done on the client if desired                                    // 477
          filter: false,                                                                                              // 478
          autoConvert: false,                                                                                         // 479
          removeEmptyStrings: false,                                                                                  // 480
          trimStrings: false,                                                                                         // 481
          extendAutoValueContext: {                                                                                   // 482
            isInsert: false,                                                                                          // 483
            isUpdate: true,                                                                                           // 484
            isUpsert: false,                                                                                          // 485
            userId: userId,                                                                                           // 486
            isFromTrustedCode: false,                                                                                 // 487
            docId: doc && doc._id,                                                                                    // 488
            isLocalCollection: isLocalCollection                                                                      // 489
          }                                                                                                           // 490
        });                                                                                                           // 491
                                                                                                                      // 492
        return false;                                                                                                 // 493
      },                                                                                                              // 494
      fetch: ['_id'],                                                                                                 // 495
      transform: null                                                                                                 // 496
    });                                                                                                               // 497
                                                                                                                      // 498
    // Second define deny functions to validate again on the server                                                   // 499
    // for client-initiated inserts and updates. These should be                                                      // 500
    // called after the clean/autovalue functions since we're adding                                                  // 501
    // them after. These must *not* have "transform: null" if options.transform is true because                       // 502
    // we need to pass the doc through any transforms to be sure                                                      // 503
    // that custom types are properly recognized for type validation.                                                 // 504
    c.deny(_.extend({                                                                                                 // 505
      insert: function(userId, doc) {                                                                                 // 506
        // We pass the false options because we will have done them on client if desired                              // 507
        doValidate.call(c, "insert", [doc, {trimStrings: false, removeEmptyStrings: false, filter: false, autoConvert: false}, function(error) {
            if (error) {                                                                                              // 509
              throw new Meteor.Error(400, 'INVALID', EJSON.stringify(error.invalidKeys));                             // 510
            }                                                                                                         // 511
          }], true, userId, false);                                                                                   // 512
                                                                                                                      // 513
        return false;                                                                                                 // 514
      },                                                                                                              // 515
      update: function(userId, doc, fields, modifier) {                                                               // 516
        // NOTE: This will never be an upsert because client-side upserts                                             // 517
        // are not allowed once you define allow/deny functions.                                                      // 518
        // We pass the false options because we will have done them on client if desired                              // 519
        doValidate.call(c, "update", [{_id: doc && doc._id}, modifier, {trimStrings: false, removeEmptyStrings: false, filter: false, autoConvert: false}, function(error) {
            if (error) {                                                                                              // 521
              throw new Meteor.Error(400, 'INVALID', EJSON.stringify(error.invalidKeys));                             // 522
            }                                                                                                         // 523
          }], true, userId, false);                                                                                   // 524
                                                                                                                      // 525
        return false;                                                                                                 // 526
      },                                                                                                              // 527
      fetch: ['_id']                                                                                                  // 528
    }, options.transform === true ? {} : {transform: null}));                                                         // 529
                                                                                                                      // 530
    // note that we've already done this collection so that we don't do it again                                      // 531
    // if attachSchema is called again                                                                                // 532
    alreadyDefined[c._name] = true;                                                                                   // 533
  }                                                                                                                   // 534
}                                                                                                                     // 535
                                                                                                                      // 536
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['aldeed:collection2'] = {};

})();

//# sourceMappingURL=aldeed_collection2.js.map
