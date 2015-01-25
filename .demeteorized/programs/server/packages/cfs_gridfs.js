(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var FS = Package['cfs:base-package'].FS;

(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/cfs:gridfs/gridfs.server.js                                                                    //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
var path = Npm.require('path');                                                                            // 1
var mongodb = Npm.require('mongodb');                                                                      // 2
var ObjectID = Npm.require('mongodb').ObjectID;                                                            // 3
var Grid = Npm.require('gridfs-stream');                                                                   // 4
//var Grid = Npm.require('gridfs-locking-stream');                                                         // 5
                                                                                                           // 6
var chunkSize = 1024*1024*2; // 256k is default GridFS chunk size, but performs terribly for largish files // 7
                                                                                                           // 8
/**                                                                                                        // 9
 * @public                                                                                                 // 10
 * @constructor                                                                                            // 11
 * @param {String} name - The store name                                                                   // 12
 * @param {Object} options                                                                                 // 13
 * @param {Function} [options.beforeSave] - Function to run before saving a file from the server. The context of the function will be the `FS.File` instance we're saving. The function may alter its properties.
 * @param {Number} [options.maxTries=5] - Max times to attempt saving a file                               // 15
 * @returns {FS.StorageAdapter} An instance of FS.StorageAdapter.                                          // 16
 *                                                                                                         // 17
 * Creates a GridFS store instance on the server. Inherits from FS.StorageAdapter                          // 18
 * type.                                                                                                   // 19
 */                                                                                                        // 20
                                                                                                           // 21
FS.Store.GridFS = function(name, options) {                                                                // 22
  var self = this;                                                                                         // 23
  options = options || {};                                                                                 // 24
                                                                                                           // 25
  var gridfsName = name;                                                                                   // 26
  var mongoOptions = options.mongoOptions || {};                                                           // 27
                                                                                                           // 28
  if (!(self instanceof FS.Store.GridFS))                                                                  // 29
    throw new Error('FS.Store.GridFS missing keyword "new"');                                              // 30
                                                                                                           // 31
  if (!options.mongoUrl) {                                                                                 // 32
    options.mongoUrl = process.env.MONGO_URL;                                                              // 33
    // When using a Meteor MongoDB instance, preface name with "cfs_gridfs."                               // 34
    gridfsName = "cfs_gridfs." + name;                                                                     // 35
  }                                                                                                        // 36
                                                                                                           // 37
  if (!options.mongoOptions) {                                                                             // 38
    options.mongoOptions = { db: { native_parser: true }, server: { auto_reconnect: true }};               // 39
  }                                                                                                        // 40
                                                                                                           // 41
  if (options.chunkSize) {                                                                                 // 42
    chunkSize = options.chunkSize;                                                                         // 43
  }                                                                                                        // 44
                                                                                                           // 45
  return new FS.StorageAdapter(name, options, {                                                            // 46
                                                                                                           // 47
    typeName: 'storage.gridfs',                                                                            // 48
    fileKey: function(fileObj) {                                                                           // 49
      // We should not have to mount the file here - We assume its taken                                   // 50
      // care of - Otherwise we create new files instead of overwriting                                    // 51
      var key = {                                                                                          // 52
        _id: null,                                                                                         // 53
        filename: null                                                                                     // 54
      };                                                                                                   // 55
                                                                                                           // 56
      // If we're passed a fileObj, we retrieve the _id and filename from it.                              // 57
      if (fileObj) {                                                                                       // 58
        var info = fileObj._getInfo(name, {updateFileRecordFirst: false});                                 // 59
        key._id = info.key || null;                                                                        // 60
        key.filename = info.name || fileObj.name({updateFileRecordFirst: false}) || (fileObj.collectionName + '-' + fileObj._id);
      }                                                                                                    // 62
                                                                                                           // 63
      // If key._id is null at this point, createWriteStream will let GridFS generate a new ID             // 64
      return key;                                                                                          // 65
    },                                                                                                     // 66
    createReadStream: function(fileKey, options) {                                                         // 67
      // Init GridFS                                                                                       // 68
      var gfs = new Grid(self.db, mongodb);                                                                // 69
                                                                                                           // 70
      return gfs.createReadStream({                                                                        // 71
        _id: new ObjectID(fileKey._id),                                                                    // 72
        root: gridfsName                                                                                   // 73
      });                                                                                                  // 74
                                                                                                           // 75
    },                                                                                                     // 76
    createWriteStream: function(fileKey, options) {                                                        // 77
      options = options || {};                                                                             // 78
                                                                                                           // 79
      // Init GridFS                                                                                       // 80
      var gfs = new Grid(self.db, mongodb);                                                                // 81
                                                                                                           // 82
      var opts = {                                                                                         // 83
        filename: fileKey.filename,                                                                        // 84
        mode: 'w',                                                                                         // 85
        root: gridfsName,                                                                                  // 86
        chunk_size: options.chunk_size || chunkSize,                                                       // 87
        // We allow aliases, metadata and contentType to be passed in via                                  // 88
        // options                                                                                         // 89
        aliases: options.aliases || [],                                                                    // 90
        metadata: options.metadata || null,                                                                // 91
        content_type: options.contentType || 'application/octet-stream'                                    // 92
      };                                                                                                   // 93
                                                                                                           // 94
      if (fileKey._id) {                                                                                   // 95
        opts._id = new ObjectID(fileKey._id);                                                              // 96
      }                                                                                                    // 97
                                                                                                           // 98
      var writeStream = gfs.createWriteStream(opts);                                                       // 99
                                                                                                           // 100
      writeStream.on('close', function(file) {                                                             // 101
        if (!file) {                                                                                       // 102
          // gridfs-stream will emit "close" without passing a file                                        // 103
          // if there is an error. We can simply exit here because                                         // 104
          // the "error" listener will also be called in this case.                                        // 105
          return;                                                                                          // 106
        }                                                                                                  // 107
                                                                                                           // 108
        if (FS.debug) console.log('SA GridFS - DONE!');                                                    // 109
                                                                                                           // 110
        // Emit end and return the fileKey, size, and updated date                                         // 111
        writeStream.emit('stored', {                                                                       // 112
          // Set the generated _id so that we know it for future reads and writes.                         // 113
          // We store the _id as a string and only convert to ObjectID right before                        // 114
          // reading, writing, or deleting. If we store the ObjectID itself,                               // 115
          // Meteor (EJSON?) seems to convert it to a LocalCollection.ObjectID,                            // 116
          // which GFS doesn't understand.                                                                 // 117
          fileKey: file._id.toString(),                                                                    // 118
          size: file.length,                                                                               // 119
          storedAt: file.uploadDate || new Date()                                                          // 120
        });                                                                                                // 121
      });                                                                                                  // 122
                                                                                                           // 123
      writeStream.on('error', function(error) {                                                            // 124
        console.log('SA GridFS - ERROR!', error);                                                          // 125
      });                                                                                                  // 126
                                                                                                           // 127
      return writeStream;                                                                                  // 128
                                                                                                           // 129
    },                                                                                                     // 130
    remove: function(fileKey, callback) {                                                                  // 131
      // Init GridFS                                                                                       // 132
      var gfs = new Grid(self.db, mongodb);                                                                // 133
                                                                                                           // 134
      try {                                                                                                // 135
        gfs.remove({ _id: new ObjectID(fileKey._id), root: gridfsName }, callback);                        // 136
      } catch(err) {                                                                                       // 137
        callback(err);                                                                                     // 138
      }                                                                                                    // 139
    },                                                                                                     // 140
                                                                                                           // 141
    // Not implemented                                                                                     // 142
    watch: function() {                                                                                    // 143
      throw new Error("GridFS storage adapter does not support the sync option");                          // 144
    },                                                                                                     // 145
                                                                                                           // 146
    init: function(callback) {                                                                             // 147
      mongodb.MongoClient.connect(options.mongoUrl, mongoOptions, function (err, db) {                     // 148
        if (err) { return callback(err); }                                                                 // 149
        self.db = db;                                                                                      // 150
        callback(null);                                                                                    // 151
      });                                                                                                  // 152
    }                                                                                                      // 153
  });                                                                                                      // 154
};                                                                                                         // 155
                                                                                                           // 156
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['cfs:gridfs'] = {};

})();

//# sourceMappingURL=cfs_gridfs.js.map
