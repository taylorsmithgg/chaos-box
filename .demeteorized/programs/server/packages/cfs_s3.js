(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var FS = Package['cfs:base-package'].FS;

/* Package-scope variables */
var AWS;

(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// packages/cfs:s3/s3.server.js                                                                             //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
// We use the official aws sdk                                                                              // 1
AWS = Npm.require('aws-sdk');                                                                               // 2
                                                                                                            // 3
var validS3ServiceParamKeys = [                                                                             // 4
  'endpoint',                                                                                               // 5
  'accessKeyId',                                                                                            // 6
  'secretAccessKey',                                                                                        // 7
  'sessionToken',                                                                                           // 8
  'credentials',                                                                                            // 9
  'credentialProvider',                                                                                     // 10
  'region',                                                                                                 // 11
  'maxRetries',                                                                                             // 12
  'maxRedirects',                                                                                           // 13
  'sslEnabled',                                                                                             // 14
  'paramValidation',                                                                                        // 15
  'computeChecksums',                                                                                       // 16
  's3ForcePathStyle',                                                                                       // 17
  'httpOptions',                                                                                            // 18
  'apiVersion',                                                                                             // 19
  'apiVersions',                                                                                            // 20
  'logger',                                                                                                 // 21
  'signatureVersion'                                                                                        // 22
];                                                                                                          // 23
var validS3PutParamKeys = [                                                                                 // 24
  'ACL',                                                                                                    // 25
  'Body',                                                                                                   // 26
  'Bucket',                                                                                                 // 27
  'CacheControl',                                                                                           // 28
  'ContentDisposition',                                                                                     // 29
  'ContentEncoding',                                                                                        // 30
  'ContentLanguage',                                                                                        // 31
  'ContentLength',                                                                                          // 32
  'ContentMD5',                                                                                             // 33
  'ContentType',                                                                                            // 34
  'Expires',                                                                                                // 35
  'GrantFullControl',                                                                                       // 36
  'GrantRead',                                                                                              // 37
  'GrantReadACP',                                                                                           // 38
  'GrantWriteACP',                                                                                          // 39
  'Key',                                                                                                    // 40
  'Metadata',                                                                                               // 41
  'ServerSideEncryption',                                                                                   // 42
  'StorageClass',                                                                                           // 43
  'WebsiteRedirectLocation'                                                                                 // 44
];                                                                                                          // 45
                                                                                                            // 46
/**                                                                                                         // 47
 * @public                                                                                                  // 48
 * @constructor                                                                                             // 49
 * @param {String} name - The store name                                                                    // 50
 * @param {Object} options                                                                                  // 51
 * @param {String} options.region - Bucket region                                                           // 52
 * @param {String} options.bucket - Bucket name                                                             // 53
 * @param {String} [options.accessKeyId] - AWS IAM key; required if not set in environment variables        // 54
 * @param {String} [options.secretAccessKey] - AWS IAM secret; required if not set in environment variables // 55
 * @param {String} [options.ACL='private'] - ACL for objects when putting                                   // 56
 * @param {String} [options.folder='/'] - Which folder (key prefix) in the bucket to use                    // 57
 * @param {Function} [options.beforeSave] - Function to run before saving a file from the server. The context of the function will be the `FS.File` instance we're saving. The function may alter its properties.
 * @param {Number} [options.maxTries=5] - Max times to attempt saving a file                                // 59
 * @returns {FS.StorageAdapter} An instance of FS.StorageAdapter.                                           // 60
 *                                                                                                          // 61
 * Creates an S3 store instance on the server. Inherits from FS.StorageAdapter                              // 62
 * type.                                                                                                    // 63
 */                                                                                                         // 64
FS.Store.S3 = function(name, options) {                                                                     // 65
  var self = this;                                                                                          // 66
  if (!(self instanceof FS.Store.S3))                                                                       // 67
    throw new Error('FS.Store.S3 missing keyword "new"');                                                   // 68
                                                                                                            // 69
  options = options || {};                                                                                  // 70
                                                                                                            // 71
  // Determine which folder (key prefix) in the bucket to use                                               // 72
  var folder = options.folder;                                                                              // 73
  if (typeof folder === "string" && folder.length) {                                                        // 74
    if (folder.slice(0, 1) === "/") {                                                                       // 75
      folder = folder.slice(1);                                                                             // 76
    }                                                                                                       // 77
    if (folder.slice(-1) !== "/") {                                                                         // 78
      folder += "/";                                                                                        // 79
    }                                                                                                       // 80
  } else {                                                                                                  // 81
    folder = "";                                                                                            // 82
  }                                                                                                         // 83
                                                                                                            // 84
  var bucket = options.bucket;                                                                              // 85
  if (!bucket)                                                                                              // 86
    throw new Error('FS.Store.S3 you must specify the "bucket" option');                                    // 87
                                                                                                            // 88
  var defaultAcl = options.ACL || 'private';                                                                // 89
                                                                                                            // 90
  // Remove serviceParams from SA options                                                                   // 91
 // options = _.omit(options, validS3ServiceParamKeys);                                                     // 92
                                                                                                            // 93
  var serviceParams = FS.Utility.extend({                                                                   // 94
    Bucket: bucket,                                                                                         // 95
    region: null, //required                                                                                // 96
    accessKeyId: null, //required                                                                           // 97
    secretAccessKey: null, //required                                                                       // 98
    ACL: defaultAcl                                                                                         // 99
  }, options);                                                                                              // 100
                                                                                                            // 101
  // Whitelist serviceParams, else aws-sdk throws an error                                                  // 102
  // XXX: I've commented this at the moment... It stopped things from working                               // 103
  // we have to check up on this                                                                            // 104
  // serviceParams = _.pick(serviceParams, validS3ServiceParamKeys);                                        // 105
                                                                                                            // 106
  // Create S3 service                                                                                      // 107
  var S3 = new AWS.S3(serviceParams);                                                                       // 108
                                                                                                            // 109
  return new FS.StorageAdapter(name, options, {                                                             // 110
    typeName: 'storage.s3',                                                                                 // 111
    fileKey: function(fileObj) {                                                                            // 112
      // Lookup the copy                                                                                    // 113
      var info = fileObj && fileObj._getInfo(name);                                                         // 114
      // If the store and key is found return the key                                                       // 115
      if (info && info.key) return info.key;                                                                // 116
                                                                                                            // 117
      var filename = fileObj.name();                                                                        // 118
      var filenameInStore = fileObj.name({store: name});                                                    // 119
                                                                                                            // 120
      // If no store key found we resolve / generate a key                                                  // 121
      return fileObj.collectionName + '/' + fileObj._id + '-' + (filenameInStore || filename);              // 122
    },                                                                                                      // 123
    createReadStream: function(fileKey, options) {                                                          // 124
                                                                                                            // 125
      return S3.createReadStream({                                                                          // 126
        Bucket: bucket,                                                                                     // 127
        Key: folder + fileKey                                                                               // 128
      });                                                                                                   // 129
                                                                                                            // 130
    },                                                                                                      // 131
    // Comment to documentation: Set options.ContentLength otherwise the                                    // 132
    // indirect stream will be used creating extra overhead on the filesystem.                              // 133
    // An easy way if the data is not transformed is to set the                                             // 134
    // options.ContentLength = fileObj.size ...                                                             // 135
    createWriteStream: function(fileKey, options) {                                                         // 136
      options = options || {};                                                                              // 137
                                                                                                            // 138
      if (options.contentType) {                                                                            // 139
        options.ContentType = options.contentType;                                                          // 140
      }                                                                                                     // 141
                                                                                                            // 142
      // We dont support array of aliases                                                                   // 143
      delete options.aliases;                                                                               // 144
      // We dont support contentType                                                                        // 145
      delete options.contentType;                                                                           // 146
      // We dont support metadata use Metadata?                                                             // 147
      delete options.metadata;                                                                              // 148
                                                                                                            // 149
      // Set options                                                                                        // 150
      var options = FS.Utility.extend({                                                                     // 151
        Bucket: bucket,                                                                                     // 152
        Key: folder + fileKey,                                                                              // 153
        fileKey: fileKey,                                                                                   // 154
        ACL: defaultAcl                                                                                     // 155
      }, options);                                                                                          // 156
                                                                                                            // 157
      return S3.createWriteStream(options);                                                                 // 158
    },                                                                                                      // 159
    remove: function(fileKey, callback) {                                                                   // 160
                                                                                                            // 161
      S3.deleteObject({                                                                                     // 162
        Bucket: bucket,                                                                                     // 163
        Key: folder + fileKey                                                                               // 164
      }, function(error) {                                                                                  // 165
        callback(error, !error);                                                                            // 166
      });                                                                                                   // 167
    },                                                                                                      // 168
    watch: function() {                                                                                     // 169
      throw new Error("S3 storage adapter does not support the sync option");                               // 170
    }                                                                                                       // 171
  });                                                                                                       // 172
};                                                                                                          // 173
                                                                                                            // 174
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// packages/cfs:s3/s3.upload.stream2.js                                                                     //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
var Writable = Npm.require('stream').Writable;                                                              // 1
                                                                                                            // 2
// This is based on the code from                                                                           // 3
// https://github.com/nathanpeck/s3-upload-stream/blob/master/lib/s3-upload-stream.js                       // 4
// But much is rewritten and adapted to cfs                                                                 // 5
                                                                                                            // 6
AWS.S3.prototype.createReadStream = function(params, options) {                                             // 7
  // Simple wrapper                                                                                         // 8
  return this.getObject(params).createReadStream();                                                         // 9
};                                                                                                          // 10
                                                                                                            // 11
// Extend the AWS.S3 API                                                                                    // 12
AWS.S3.prototype.createWriteStream = function(params, options) {                                            // 13
  var self = this;                                                                                          // 14
                                                                                                            // 15
  //Create the writeable stream interface.                                                                  // 16
  var writeStream = Writable({                                                                              // 17
    highWaterMark: 4194304 // 4 MB                                                                          // 18
  });                                                                                                       // 19
                                                                                                            // 20
  var partNumber = 1;                                                                                       // 21
  var parts = [];                                                                                           // 22
  var receivedSize = 0;                                                                                     // 23
  var uploadedSize = 0;                                                                                     // 24
  var currentChunk = Buffer(0);                                                                             // 25
  var maxChunkSize = 5242880;                                                                               // 26
  var multipartUploadID = null;                                                                             // 27
  var waitingCallback;                                                                                      // 28
  var fileKey = params && (params.fileKey || params.Key);                                                   // 29
                                                                                                            // 30
  // Clean up for AWS sdk                                                                                   // 31
  delete params.fileKey;                                                                                    // 32
                                                                                                            // 33
  // This small function stops the write stream until we have connected with                                // 34
  // the s3 server                                                                                          // 35
  var runWhenReady = function(callback) {                                                                   // 36
    // If we dont have a upload id we are not ready                                                         // 37
    if (multipartUploadID === null) {                                                                       // 38
      // We set the waiting callback                                                                        // 39
      waitingCallback = callback;                                                                           // 40
    } else {                                                                                                // 41
      // No problem - just continue                                                                         // 42
      callback();                                                                                           // 43
    }                                                                                                       // 44
  };                                                                                                        // 45
                                                                                                            // 46
  //Handler to receive data and upload it to S3.                                                            // 47
  writeStream._write = function (chunk, enc, next) {                                                        // 48
    currentChunk = Buffer.concat([currentChunk, chunk]);                                                    // 49
                                                                                                            // 50
    // If the current chunk buffer is getting to large, or the stream piped in                              // 51
    // has ended then flush the chunk buffer downstream to S3 via the multipart                             // 52
    // upload API.                                                                                          // 53
    if(currentChunk.length > maxChunkSize) {                                                                // 54
      // Make sure we only run when the s3 upload is ready                                                  // 55
      runWhenReady(function() { flushChunk(next); });                                                       // 56
    } else {                                                                                                // 57
      // We dont have to contact s3 for this                                                                // 58
      runWhenReady(next);                                                                                   // 59
    }                                                                                                       // 60
  };                                                                                                        // 61
                                                                                                            // 62
  // Overwrite the end method so that we can hijack it to flush the last part                               // 63
  // and then complete the multipart upload                                                                 // 64
  var _originalEnd = writeStream.end;                                                                       // 65
  writeStream.end = function (chunk, encoding, callback) {                                                  // 66
    // Call the super                                                                                       // 67
    _originalEnd.call(this, chunk, encoding, function () {                                                  // 68
      // Make sure we only run when the s3 upload is ready                                                  // 69
      runWhenReady(function() { flushChunk(callback); });                                                   // 70
    });                                                                                                     // 71
  };                                                                                                        // 72
                                                                                                            // 73
  writeStream.on('error', function () {                                                                     // 74
    if (multipartUploadID) {                                                                                // 75
      if (FS.debug) {                                                                                       // 76
        console.log('SA S3 - ERROR!!');                                                                     // 77
      }                                                                                                     // 78
      self.abortMultipartUpload({                                                                           // 79
        Bucket: params.Bucket,                                                                              // 80
        Key: params.Key,                                                                                    // 81
        UploadId: multipartUploadID                                                                         // 82
      }, function (err) {                                                                                   // 83
        if(err) {                                                                                           // 84
          console.error('SA S3 - Could not abort multipart upload', err)                                    // 85
        }                                                                                                   // 86
      });                                                                                                   // 87
    }                                                                                                       // 88
  });                                                                                                       // 89
                                                                                                            // 90
  var flushChunk = function (callback) {                                                                    // 91
    if (multipartUploadID === null) {                                                                       // 92
      throw new Error('Internal error multipartUploadID is null');                                          // 93
    }                                                                                                       // 94
    // Get the chunk data                                                                                   // 95
    var uploadingChunk = Buffer(currentChunk.length);                                                       // 96
    currentChunk.copy(uploadingChunk);                                                                      // 97
                                                                                                            // 98
                                                                                                            // 99
    // Store the current part number and then increase the counter                                          // 100
    var localChunkNumber = partNumber++;                                                                    // 101
                                                                                                            // 102
    // We add the size of data                                                                              // 103
    receivedSize += uploadingChunk.length;                                                                  // 104
                                                                                                            // 105
    // Upload the part                                                                                      // 106
    self.uploadPart({                                                                                       // 107
      Body: uploadingChunk,                                                                                 // 108
      Bucket: params.Bucket,                                                                                // 109
      Key: params.Key,                                                                                      // 110
      UploadId: multipartUploadID,                                                                          // 111
      PartNumber: localChunkNumber                                                                          // 112
    }, function (err, result) {                                                                             // 113
      // Call the next data                                                                                 // 114
      if(typeof callback === 'function') {                                                                  // 115
        callback();                                                                                         // 116
      }                                                                                                     // 117
                                                                                                            // 118
      if(err) {                                                                                             // 119
        writeStream.emit('error', err);                                                                     // 120
      } else {                                                                                              // 121
        // Increase the upload size                                                                         // 122
        uploadedSize += uploadingChunk.length;                                                              // 123
        parts[localChunkNumber-1] = {                                                                       // 124
          ETag: result.ETag,                                                                                // 125
          PartNumber: localChunkNumber                                                                      // 126
        };                                                                                                  // 127
                                                                                                            // 128
        // XXX: event for debugging                                                                         // 129
        writeStream.emit('chunk', {                                                                         // 130
          ETag: result.ETag,                                                                                // 131
          PartNumber: localChunkNumber,                                                                     // 132
          receivedSize: receivedSize,                                                                       // 133
          uploadedSize: uploadedSize                                                                        // 134
        });                                                                                                 // 135
                                                                                                            // 136
        // The incoming stream has finished giving us all data and we have                                  // 137
        // finished uploading all that data to S3. So tell S3 to assemble those                             // 138
        // parts we uploaded into the final product.                                                        // 139
        if(writeStream._writableState.ended === true &&                                                     // 140
                uploadedSize === receivedSize) {                                                            // 141
          // Complete the upload                                                                            // 142
          self.completeMultipartUpload({                                                                    // 143
            Bucket: params.Bucket,                                                                          // 144
            Key: params.Key,                                                                                // 145
            UploadId: multipartUploadID,                                                                    // 146
            MultipartUpload: {                                                                              // 147
              Parts: parts                                                                                  // 148
            }                                                                                               // 149
          }, function (err, result) {                                                                       // 150
            if(err) {                                                                                       // 151
              writeStream.emit('error', err);                                                               // 152
            } else {                                                                                        // 153
              // Emit the cfs end event for uploads                                                         // 154
              if (FS.debug) {                                                                               // 155
                console.log('SA S3 - DONE!!');                                                              // 156
              }                                                                                             // 157
              writeStream.emit('stored', {                                                                  // 158
                fileKey: fileKey,                                                                           // 159
                size: uploadedSize,                                                                         // 160
                storedAt: new Date()                                                                        // 161
              });                                                                                           // 162
            }                                                                                               // 163
                                                                                                            // 164
          });                                                                                               // 165
        }                                                                                                   // 166
      }                                                                                                     // 167
    });                                                                                                     // 168
                                                                                                            // 169
    // Reset the current buffer                                                                             // 170
    currentChunk = Buffer(0);                                                                               // 171
  };                                                                                                        // 172
                                                                                                            // 173
  //Use the S3 client to initialize a multipart upload to S3.                                               // 174
  self.createMultipartUpload( params, function (err, data) {                                                // 175
    if(err) {                                                                                               // 176
      // Emit the error                                                                                     // 177
      writeStream.emit('error', err);                                                                       // 178
    } else {                                                                                                // 179
      // Set the upload id                                                                                  // 180
      multipartUploadID = data.UploadId;                                                                    // 181
                                                                                                            // 182
      // Call waiting callback                                                                              // 183
      if (typeof waitingCallback === 'function') {                                                          // 184
        // We call the waiting callback if any now since we established a                                   // 185
        // connection to the s3                                                                             // 186
        waitingCallback();                                                                                  // 187
      }                                                                                                     // 188
                                                                                                            // 189
    }                                                                                                       // 190
  });                                                                                                       // 191
                                                                                                            // 192
  // We return the write stream                                                                             // 193
  return writeStream;                                                                                       // 194
};                                                                                                          // 195
                                                                                                            // 196
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['cfs:s3'] = {};

})();

//# sourceMappingURL=cfs_s3.js.map
