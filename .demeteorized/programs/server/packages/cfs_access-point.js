(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var FS = Package['cfs:base-package'].FS;
var check = Package.check.check;
var Match = Package.check.Match;
var EJSON = Package.ejson.EJSON;
var HTTP = Package['cfs:http-methods'].HTTP;

/* Package-scope variables */
var rootUrlPathPrefix, baseUrl, getHeaders, getHeadersByCollection, httpDelHandler, httpGetHandler, httpPutInsertHandler, httpPutUpdateHandler, _existingMountPoints, mountUrls;

(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/cfs:access-point/access-point-common.js                                                                   //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
rootUrlPathPrefix = __meteor_runtime_config__.ROOT_URL_PATH_PREFIX || "";                                             // 1
// Adjust the rootUrlPathPrefix if necessary                                                                          // 2
if (rootUrlPathPrefix.length > 0) {                                                                                   // 3
  if (rootUrlPathPrefix.slice(0, 1) !== '/') {                                                                        // 4
    rootUrlPathPrefix = '/' + rootUrlPathPrefix;                                                                      // 5
  }                                                                                                                   // 6
  if (rootUrlPathPrefix.slice(-1) === '/') {                                                                          // 7
    rootUrlPathPrefix = rootUrlPathPrefix.slice(0, -1);                                                               // 8
  }                                                                                                                   // 9
}                                                                                                                     // 10
                                                                                                                      // 11
// prepend ROOT_URL when isCordova                                                                                    // 12
if (Meteor.isCordova) {                                                                                               // 13
  rootUrlPathPrefix = Meteor.absoluteUrl(rootUrlPathPrefix.replace(/^\/+/, '')).replace(/\/+$/, '');                  // 14
}                                                                                                                     // 15
                                                                                                                      // 16
baseUrl = '/cfs';                                                                                                     // 17
FS.HTTP = FS.HTTP || {};                                                                                              // 18
                                                                                                                      // 19
// Note the upload URL so that client uploader packages know what it is                                               // 20
FS.HTTP.uploadUrl = rootUrlPathPrefix + baseUrl + '/files';                                                           // 21
                                                                                                                      // 22
/**                                                                                                                   // 23
 * @method FS.HTTP.setBaseUrl                                                                                         // 24
 * @public                                                                                                            // 25
 * @param {String} newBaseUrl - Change the base URL for the HTTP GET and DELETE endpoints.                            // 26
 * @returns {undefined}                                                                                               // 27
 */                                                                                                                   // 28
FS.HTTP.setBaseUrl = function setBaseUrl(newBaseUrl) {                                                                // 29
                                                                                                                      // 30
  // Adjust the baseUrl if necessary                                                                                  // 31
  if (newBaseUrl.slice(0, 1) !== '/') {                                                                               // 32
    newBaseUrl = '/' + newBaseUrl;                                                                                    // 33
  }                                                                                                                   // 34
  if (newBaseUrl.slice(-1) === '/') {                                                                                 // 35
    newBaseUrl = newBaseUrl.slice(0, -1);                                                                             // 36
  }                                                                                                                   // 37
                                                                                                                      // 38
  // Update the base URL                                                                                              // 39
  baseUrl = newBaseUrl;                                                                                               // 40
                                                                                                                      // 41
  // Change the upload URL so that client uploader packages know what it is                                           // 42
  FS.HTTP.uploadUrl = rootUrlPathPrefix + baseUrl + '/files';                                                         // 43
                                                                                                                      // 44
  // Remount URLs with the new baseUrl, unmounting the old, on the server only.                                       // 45
  // If existingMountPoints is empty, then we haven't run the server startup                                          // 46
  // code yet, so this new URL will be used at that point for the initial mount.                                      // 47
  if (Meteor.isServer && !FS.Utility.isEmpty(_existingMountPoints)) {                                                 // 48
    mountUrls();                                                                                                      // 49
  }                                                                                                                   // 50
};                                                                                                                    // 51
                                                                                                                      // 52
/*                                                                                                                    // 53
 * FS.File extensions                                                                                                 // 54
 */                                                                                                                   // 55
                                                                                                                      // 56
/**                                                                                                                   // 57
 * @method FS.File.prototype.url Construct the file url                                                               // 58
 * @public                                                                                                            // 59
 * @param {Object} [options]                                                                                          // 60
 * @param {String} [options.store] Name of the store to get from. If not defined, the first store defined in `options.stores` for the collection on the client is used.
 * @param {Boolean} [options.auth=null] Add authentication token to the URL query string? By default, a token for the current logged in user is added on the client. Set this to `false` to omit the token. Set this to a string to provide your own token. Set this to a number to specify an expiration time for the token in seconds.
 * @param {Boolean} [options.download=false] Should headers be set to force a download? Typically this means that clicking the link with this URL will download the file to the user's Downloads folder instead of displaying the file in the browser.
 * @param {Boolean} [options.brokenIsFine=false] Return the URL even if we know it's currently a broken link because the file hasn't been saved in the requested store yet.
 * @param {Boolean} [options.metadata=false] Return the URL for the file metadata access point rather than the file itself.
 * @param {String} [options.uploading=null] A URL to return while the file is being uploaded.                         // 66
 * @param {String} [options.storing=null] A URL to return while the file is being stored.                             // 67
 * @param {String} [options.filename=null] Override the filename that should appear at the end of the URL. By default it is the name of the file in the requested store.
 *                                                                                                                    // 69
 * Returns the HTTP URL for getting the file or its metadata.                                                         // 70
 */                                                                                                                   // 71
FS.File.prototype.url = function(options) {                                                                           // 72
  var self = this;                                                                                                    // 73
  options = options || {};                                                                                            // 74
  options = FS.Utility.extend({                                                                                       // 75
    store: null,                                                                                                      // 76
    auth: null,                                                                                                       // 77
    download: false,                                                                                                  // 78
    metadata: false,                                                                                                  // 79
    brokenIsFine: false,                                                                                              // 80
    uploading: null, // return this URL while uploading                                                               // 81
    storing: null, // return this URL while storing                                                                   // 82
    filename: null // override the filename that is shown to the user                                                 // 83
  }, options.hash || options); // check for "hash" prop if called as helper                                           // 84
                                                                                                                      // 85
  // Primarily useful for displaying a temporary image while uploading an image                                       // 86
  if (options.uploading && !self.isUploaded()) {                                                                      // 87
    return options.uploading;                                                                                         // 88
  }                                                                                                                   // 89
                                                                                                                      // 90
  if (self.isMounted()) {                                                                                             // 91
    // See if we've stored in the requested store yet                                                                 // 92
    var storeName = options.store || self.collection.primaryStore.name;                                               // 93
    if (!self.hasStored(storeName)) {                                                                                 // 94
      if (options.storing) {                                                                                          // 95
        return options.storing;                                                                                       // 96
      } else if (!options.brokenIsFine) {                                                                             // 97
        // We want to return null if we know the URL will be a broken                                                 // 98
        // link because then we can avoid rendering broken links, broken                                              // 99
        // images, etc.                                                                                               // 100
        return null;                                                                                                  // 101
      }                                                                                                               // 102
    }                                                                                                                 // 103
                                                                                                                      // 104
    // Add filename to end of URL if we can determine one                                                             // 105
    var filename = options.filename || self.name({store: storeName});                                                 // 106
    if (typeof filename === "string" && filename.length) {                                                            // 107
      filename = '/' + filename;                                                                                      // 108
    } else {                                                                                                          // 109
      filename = '';                                                                                                  // 110
    }                                                                                                                 // 111
                                                                                                                      // 112
    // TODO: Could we somehow figure out if the collection requires login?                                            // 113
    var authToken = '';                                                                                               // 114
    if (Meteor.isClient && typeof Accounts !== "undefined" && typeof Accounts._storedLoginToken === "function") {     // 115
      if (options.auth !== false) {                                                                                   // 116
        // Add reactive deps on the user                                                                              // 117
        Meteor.userId();                                                                                              // 118
                                                                                                                      // 119
        var authObject = {                                                                                            // 120
          authToken: Accounts._storedLoginToken() || ''                                                               // 121
        };                                                                                                            // 122
                                                                                                                      // 123
        // If it's a number, we use that as the expiration time (in seconds)                                          // 124
        if (options.auth === +options.auth) {                                                                         // 125
          authObject.expiration = FS.HTTP.now() + options.auth * 1000;                                                // 126
        }                                                                                                             // 127
                                                                                                                      // 128
        // Set the authToken                                                                                          // 129
        var authString = JSON.stringify(authObject);                                                                  // 130
        authToken = FS.Utility.btoa(authString);                                                                      // 131
      }                                                                                                               // 132
    } else if (typeof options.auth === "string") {                                                                    // 133
      // If the user supplies auth token the user will be responsible for                                             // 134
      // updating                                                                                                     // 135
      authToken = options.auth;                                                                                       // 136
    }                                                                                                                 // 137
                                                                                                                      // 138
    // Construct query string                                                                                         // 139
    var params = {};                                                                                                  // 140
    if (authToken !== '') {                                                                                           // 141
      params.token = authToken;                                                                                       // 142
    }                                                                                                                 // 143
    if (options.download) {                                                                                           // 144
      params.download = true;                                                                                         // 145
    }                                                                                                                 // 146
    if (options.store) {                                                                                              // 147
      // We use options.store here instead of storeName because we want to omit the queryString                       // 148
      // whenever possible, allowing users to have "clean" URLs if they want. The server will                         // 149
      // assume the first store defined on the server, which means that we are assuming that                          // 150
      // the first on the client is also the first on the server. If that's not the case, the                         // 151
      // store option should be supplied.                                                                             // 152
      params.store = options.store;                                                                                   // 153
    }                                                                                                                 // 154
    var queryString = FS.Utility.encodeParams(params);                                                                // 155
    if (queryString.length) {                                                                                         // 156
      queryString = '?' + queryString;                                                                                // 157
    }                                                                                                                 // 158
                                                                                                                      // 159
    // Determine which URL to use                                                                                     // 160
    var area;                                                                                                         // 161
    if (options.metadata) {                                                                                           // 162
      area = '/record';                                                                                               // 163
    } else {                                                                                                          // 164
      area = '/files';                                                                                                // 165
    }                                                                                                                 // 166
                                                                                                                      // 167
    // Construct and return the http method url                                                                       // 168
    return rootUrlPathPrefix + baseUrl + area + '/' + self.collection.name + '/' + self._id + filename + queryString; // 169
  }                                                                                                                   // 170
                                                                                                                      // 171
};                                                                                                                    // 172
                                                                                                                      // 173
                                                                                                                      // 174
                                                                                                                      // 175
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/cfs:access-point/access-point-handlers.js                                                                 //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
getHeaders = [];                                                                                                      // 1
getHeadersByCollection = {};                                                                                          // 2
                                                                                                                      // 3
/**                                                                                                                   // 4
 * @method httpDelHandler                                                                                             // 5
 * @private                                                                                                           // 6
 * @returns {any} response                                                                                            // 7
 *                                                                                                                    // 8
 * HTTP DEL request handler                                                                                           // 9
 */                                                                                                                   // 10
httpDelHandler = function httpDelHandler(ref) {                                                                       // 11
  var self = this;                                                                                                    // 12
  var opts = FS.Utility.extend({}, self.query || {}, self.params || {});                                              // 13
                                                                                                                      // 14
  // If DELETE request, validate with 'remove' allow/deny, delete the file, and return                                // 15
  FS.Utility.validateAction(ref.collection.files._validators['remove'], ref.file, self.userId);                       // 16
                                                                                                                      // 17
  /*                                                                                                                  // 18
   * From the DELETE spec:                                                                                            // 19
   * A successful response SHOULD be 200 (OK) if the response includes an                                             // 20
   * entity describing the status, 202 (Accepted) if the action has not                                               // 21
   * yet been enacted, or 204 (No Content) if the action has been enacted                                             // 22
   * but the response does not include an entity.                                                                     // 23
   */                                                                                                                 // 24
  self.setStatusCode(200);                                                                                            // 25
                                                                                                                      // 26
  return {                                                                                                            // 27
    deleted: !!ref.file.remove()                                                                                      // 28
  };                                                                                                                  // 29
};                                                                                                                    // 30
                                                                                                                      // 31
/**                                                                                                                   // 32
 * @method httpGetHandler                                                                                             // 33
 * @private                                                                                                           // 34
 * @returns {any} response                                                                                            // 35
 *                                                                                                                    // 36
 * HTTP GET request handler                                                                                           // 37
 */                                                                                                                   // 38
httpGetHandler = function httpGetHandler(ref) {                                                                       // 39
  var self = this;                                                                                                    // 40
  // Once we have the file, we can test allow/deny validators                                                         // 41
  // XXX: pass on the "share" query eg. ?share=342hkjh23ggj for shared url access?                                    // 42
  FS.Utility.validateAction(ref.collection._validators['download'], ref.file, self.userId /*, self.query.shareId*/);  // 43
                                                                                                                      // 44
  var storeName = ref.storeName;                                                                                      // 45
                                                                                                                      // 46
  // If no storeName was specified, use the first defined storeName                                                   // 47
  if (typeof storeName !== "string") {                                                                                // 48
    // No store handed, we default to primary store                                                                   // 49
    storeName = ref.collection.primaryStore.name;                                                                     // 50
  }                                                                                                                   // 51
                                                                                                                      // 52
  // Get the storage reference                                                                                        // 53
  var storage = ref.collection.storesLookup[storeName];                                                               // 54
                                                                                                                      // 55
  if (!storage) {                                                                                                     // 56
    throw new Meteor.Error(404, "Not Found", 'There is no store "' + storeName + '"');                                // 57
  }                                                                                                                   // 58
                                                                                                                      // 59
  // Get the file                                                                                                     // 60
  var copyInfo = ref.file.copies[storeName];                                                                          // 61
                                                                                                                      // 62
  if (!copyInfo) {                                                                                                    // 63
    throw new Meteor.Error(404, "Not Found", 'This file was not stored in the ' + storeName + ' store');              // 64
  }                                                                                                                   // 65
                                                                                                                      // 66
  var fileType = copyInfo.type;                                                                                       // 67
  var fileSize = copyInfo.size;                                                                                       // 68
                                                                                                                      // 69
  if (typeof fileType === "string") {                                                                                 // 70
    self.setContentType(fileType);                                                                                    // 71
  } else {                                                                                                            // 72
    self.setContentType('application/octet-stream');                                                                  // 73
  }                                                                                                                   // 74
                                                                                                                      // 75
  // Add 'Content-Disposition' header if requested a download/attachment URL                                          // 76
  if (typeof ref.download !== "undefined") {                                                                          // 77
    var filename = ref.filename || copyInfo.name;                                                                     // 78
    self.addHeader('Content-Disposition', 'attachment; filename="' + filename + '"');                                 // 79
  } else {                                                                                                            // 80
    self.addHeader('Content-Disposition', 'inline');                                                                  // 81
  }                                                                                                                   // 82
                                                                                                                      // 83
  // If a chunk/range was requested instead of the whole file, serve that'                                            // 84
  var start, end, unit, contentLength, readStreamOptions, range = self.requestHeaders.range;                          // 85
  if (range) {                                                                                                        // 86
    // Parse range header                                                                                             // 87
    range = range.split('=');                                                                                         // 88
                                                                                                                      // 89
    unit = range[0];                                                                                                  // 90
    if (unit !== 'bytes')                                                                                             // 91
      throw new Meteor.Error(416, "Requested Range Not Satisfiable");                                                 // 92
                                                                                                                      // 93
    range = range[1];                                                                                                 // 94
    // Spec allows multiple ranges, but we will serve only the first                                                  // 95
    range = range.split(',')[0];                                                                                      // 96
    // Get start and end byte positions                                                                               // 97
    range = range.split('-');                                                                                         // 98
    start = range[0];                                                                                                 // 99
    end = range[1] || '';                                                                                             // 100
    // Convert to numbers and adjust invalid values when possible                                                     // 101
    start = start.length ? Math.max(Number(start), 0) : 0;                                                            // 102
    end = end.length ? Math.min(Number(end), fileSize - 1) : fileSize - 1;                                            // 103
    if (end < start)                                                                                                  // 104
      throw new Meteor.Error(416, "Requested Range Not Satisfiable");                                                 // 105
                                                                                                                      // 106
    self.addHeader('Content-Range', 'bytes ' + start + '-' + end + '/' + copyInfo.size);                              // 107
    readStreamOptions = {start: start, end: end};                                                                     // 108
    end = end + 1; //HTTP end byte is inclusive and ours are not                                                      // 109
                                                                                                                      // 110
    // Sets properly content length for range                                                                         // 111
    contentLength = end - start;                                                                                      // 112
  } else {                                                                                                            // 113
    // Content length, defaults to file size                                                                          // 114
    contentLength = fileSize;                                                                                         // 115
    // Some browsers cope better if the content-range header is                                                       // 116
    // still included even for the full file being returned.                                                          // 117
    self.addHeader('Content-Range', 'bytes 0-' + (contentLength - 1) + '/' + contentLength);                          // 118
  }                                                                                                                   // 119
                                                                                                                      // 120
  if (contentLength < fileSize) {                                                                                     // 121
    self.setStatusCode(206, 'Partial Content');                                                                       // 122
  } else {                                                                                                            // 123
    self.setStatusCode(200, 'OK');                                                                                    // 124
  }                                                                                                                   // 125
                                                                                                                      // 126
  // Add any other global custom headers and collection-specific custom headers                                       // 127
  FS.Utility.each(getHeaders.concat(getHeadersByCollection[ref.collection.name] || []), function(header) {            // 128
    self.addHeader(header[0], header[1]);                                                                             // 129
  });                                                                                                                 // 130
                                                                                                                      // 131
  // Inform clients about length (or chunk length in case of ranges)                                                  // 132
  self.addHeader('Content-Length', contentLength);                                                                    // 133
                                                                                                                      // 134
  // Last modified header (updatedAt from file info)                                                                  // 135
  self.addHeader('Last-Modified', copyInfo.updatedAt.toUTCString());                                                  // 136
                                                                                                                      // 137
  // Inform clients that we accept ranges for resumable chunked downloads                                             // 138
  self.addHeader('Accept-Ranges', 'bytes');                                                                           // 139
                                                                                                                      // 140
  var readStream = storage.adapter.createReadStream(ref.file, readStreamOptions);                                     // 141
                                                                                                                      // 142
  readStream.on('error', function(err) {                                                                              // 143
    // Send proper error message on get error                                                                         // 144
    if (err.message && err.statusCode) {                                                                              // 145
      self.Error(new Meteor.Error(err.statusCode, err.message));                                                      // 146
    } else {                                                                                                          // 147
      self.Error(new Meteor.Error(503, 'Service unavailable'));                                                       // 148
    }                                                                                                                 // 149
  });                                                                                                                 // 150
                                                                                                                      // 151
  readStream.pipe(self.createWriteStream());                                                                          // 152
};                                                                                                                    // 153
                                                                                                                      // 154
httpPutInsertHandler = function httpPutInsertHandler(ref) {                                                           // 155
  var self = this;                                                                                                    // 156
  var opts = FS.Utility.extend({}, self.query || {}, self.params || {});                                              // 157
                                                                                                                      // 158
  FS.debug && console.log("HTTP PUT (insert) handler");                                                               // 159
                                                                                                                      // 160
  // Create the nice FS.File                                                                                          // 161
  var fileObj = new FS.File();                                                                                        // 162
                                                                                                                      // 163
  // Set its name                                                                                                     // 164
  fileObj.name(opts.filename || null);                                                                                // 165
                                                                                                                      // 166
  // Attach the readstream as the file's data                                                                         // 167
  fileObj.attachData(self.createReadStream(), {type: self.requestHeaders['content-type'] || 'application/octet-stream'});
                                                                                                                      // 169
  // Validate with insert allow/deny                                                                                  // 170
  FS.Utility.validateAction(ref.collection.files._validators['insert'], file, self.userId);                           // 171
                                                                                                                      // 172
  // Insert file into collection, triggering readStream storage                                                       // 173
  ref.collection.insert(fileObj);                                                                                     // 174
                                                                                                                      // 175
  // Send response                                                                                                    // 176
  self.setStatusCode(200);                                                                                            // 177
                                                                                                                      // 178
  // Return the new file id                                                                                           // 179
  return {_id: fileObj._id};                                                                                          // 180
};                                                                                                                    // 181
                                                                                                                      // 182
httpPutUpdateHandler = function httpPutUpdateHandler(ref) {                                                           // 183
  var self = this;                                                                                                    // 184
  var opts = FS.Utility.extend({}, self.query || {}, self.params || {});                                              // 185
                                                                                                                      // 186
  var chunk = parseInt(opts.chunk, 10);                                                                               // 187
  if (isNaN(chunk)) chunk = 0;                                                                                        // 188
                                                                                                                      // 189
  FS.debug && console.log("HTTP PUT (update) handler received chunk: ", chunk);                                       // 190
                                                                                                                      // 191
  // Validate with insert allow/deny; also mounts and retrieves the file                                              // 192
  FS.Utility.validateAction(ref.collection.files._validators['insert'], ref.file, self.userId);                       // 193
                                                                                                                      // 194
  self.createReadStream().pipe( FS.TempStore.createWriteStream(ref.file, chunk) );                                    // 195
                                                                                                                      // 196
  // Send response                                                                                                    // 197
  self.setStatusCode(200);                                                                                            // 198
                                                                                                                      // 199
  return { _id: ref.file._id, chunk: chunk };                                                                         // 200
};                                                                                                                    // 201
                                                                                                                      // 202
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/cfs:access-point/access-point-server.js                                                                   //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
var path = Npm.require("path");                                                                                       // 1
                                                                                                                      // 2
HTTP.publishFormats({                                                                                                 // 3
  fileRecordFormat: function (input) {                                                                                // 4
    // Set the method scope content type to json                                                                      // 5
    this.setContentType('application/json');                                                                          // 6
    if (FS.Utility.isArray(input)) {                                                                                  // 7
      return EJSON.stringify(FS.Utility.map(input, function (obj) {                                                   // 8
        return FS.Utility.cloneFileRecord(obj);                                                                       // 9
      }));                                                                                                            // 10
    } else {                                                                                                          // 11
      return EJSON.stringify(FS.Utility.cloneFileRecord(input));                                                      // 12
    }                                                                                                                 // 13
  }                                                                                                                   // 14
});                                                                                                                   // 15
                                                                                                                      // 16
/**                                                                                                                   // 17
 * @method FS.HTTP.setHeadersForGet                                                                                   // 18
 * @public                                                                                                            // 19
 * @param {Array} headers - List of headers, where each is a two-item array in which item 1 is the header name and item 2 is the header value.
 * @param {Array|String} [collections] - Which collections the headers should be added for. Omit this argument to add the header for all collections.
 * @returns {undefined}                                                                                               // 22
 */                                                                                                                   // 23
FS.HTTP.setHeadersForGet = function setHeadersForGet(headers, collections) {                                          // 24
  if (typeof collections === "string") {                                                                              // 25
    collections = [collections];                                                                                      // 26
  }                                                                                                                   // 27
  if (collections) {                                                                                                  // 28
    FS.Utility.each(collections, function(collectionName) {                                                           // 29
      getHeadersByCollection[collectionName] = headers || [];                                                         // 30
    });                                                                                                               // 31
  } else {                                                                                                            // 32
    getHeaders = headers || [];                                                                                       // 33
  }                                                                                                                   // 34
};                                                                                                                    // 35
                                                                                                                      // 36
/**                                                                                                                   // 37
 * @method FS.HTTP.publish                                                                                            // 38
 * @public                                                                                                            // 39
 * @param {FS.Collection} collection                                                                                  // 40
 * @param {Function} func - Publish function that returns a cursor.                                                   // 41
 * @returns {undefined}                                                                                               // 42
 *                                                                                                                    // 43
 * Publishes all documents returned by the cursor at a GET URL                                                        // 44
 * with the format baseUrl/record/collectionName. The publish                                                         // 45
 * function `this` is similar to normal `Meteor.publish`.                                                             // 46
 */                                                                                                                   // 47
FS.HTTP.publish = function fsHttpPublish(collection, func) {                                                          // 48
  var name = baseUrl + '/record/' + collection.name;                                                                  // 49
  // Mount collection listing URL using http-publish package                                                          // 50
  HTTP.publish({                                                                                                      // 51
    name: name,                                                                                                       // 52
    defaultFormat: 'fileRecordFormat',                                                                                // 53
    collection: collection,                                                                                           // 54
    collectionGet: true,                                                                                              // 55
    collectionPost: false,                                                                                            // 56
    documentGet: true,                                                                                                // 57
    documentPut: false,                                                                                               // 58
    documentDelete: false                                                                                             // 59
  }, func);                                                                                                           // 60
                                                                                                                      // 61
  FS.debug && console.log("Registered HTTP method GET URLs:\n\n" + name + '\n' + name + '/:id\n');                    // 62
};                                                                                                                    // 63
                                                                                                                      // 64
/**                                                                                                                   // 65
 * @method FS.HTTP.unpublish                                                                                          // 66
 * @public                                                                                                            // 67
 * @param {FS.Collection} collection                                                                                  // 68
 * @returns {undefined}                                                                                               // 69
 *                                                                                                                    // 70
 * Unpublishes a restpoint created by a call to `FS.HTTP.publish`                                                     // 71
 */                                                                                                                   // 72
FS.HTTP.unpublish = function fsHttpUnpublish(collection) {                                                            // 73
  // Mount collection listing URL using http-publish package                                                          // 74
  HTTP.unpublish(baseUrl + '/record/' + collection.name);                                                             // 75
};                                                                                                                    // 76
                                                                                                                      // 77
_existingMountPoints = {};                                                                                            // 78
                                                                                                                      // 79
/**                                                                                                                   // 80
 * @method defaultSelectorFunction                                                                                    // 81
 * @private                                                                                                           // 82
 * @returns { collection, file }                                                                                      // 83
 *                                                                                                                    // 84
 * This is the default selector function                                                                              // 85
 */                                                                                                                   // 86
var defaultSelectorFunction = function() {                                                                            // 87
  var self = this;                                                                                                    // 88
  // Selector function                                                                                                // 89
  //                                                                                                                  // 90
  // This function will have to return the collection and the                                                         // 91
  // file. If file not found undefined is returned - if null is returned the                                          // 92
  // search was not possible                                                                                          // 93
  var opts = FS.Utility.extend({}, self.query || {}, self.params || {});                                              // 94
                                                                                                                      // 95
  // Get the collection name from the url                                                                             // 96
  var collectionName = opts.collectionName;                                                                           // 97
                                                                                                                      // 98
  // Get the id from the url                                                                                          // 99
  var id = opts.id;                                                                                                   // 100
                                                                                                                      // 101
  // Get the collection                                                                                               // 102
  var collection = FS._collections[collectionName];                                                                   // 103
                                                                                                                      // 104
  // Get the file if possible else return null                                                                        // 105
  var file = (id && collection)? collection.findOne({ _id: id }): null;                                               // 106
                                                                                                                      // 107
  // Return the collection and the file                                                                               // 108
  return {                                                                                                            // 109
    collection: collection,                                                                                           // 110
    file: file,                                                                                                       // 111
    storeName: opts.store,                                                                                            // 112
    download: opts.download,                                                                                          // 113
    filename: opts.filename                                                                                           // 114
  };                                                                                                                  // 115
};                                                                                                                    // 116
                                                                                                                      // 117
/*                                                                                                                    // 118
 * @method FS.HTTP.mount                                                                                              // 119
 * @public                                                                                                            // 120
 * @param {array of string} mountPoints mount points to map rest functinality on                                      // 121
 * @param {function} selector_f [selector] function returns `{ collection, file }` for mount points to work with      // 122
 *                                                                                                                    // 123
*/                                                                                                                    // 124
FS.HTTP.mount = function(mountPoints, selector_f) {                                                                   // 125
  // We take mount points as an array and we get a selector function                                                  // 126
  var selectorFunction = selector_f || defaultSelectorFunction;                                                       // 127
                                                                                                                      // 128
  var accessPoint = {                                                                                                 // 129
    'stream': true,                                                                                                   // 130
    'auth': expirationAuth,                                                                                           // 131
    'post': function(data) {                                                                                          // 132
      // Use the selector for finding the collection and file reference                                               // 133
      var ref = selectorFunction.call(this);                                                                          // 134
                                                                                                                      // 135
      // We dont support post - this would be normal insert eg. of filerecord?                                        // 136
      throw new Meteor.Error(501, "Not implemented", "Post is not supported");                                        // 137
    },                                                                                                                // 138
    'put': function(data) {                                                                                           // 139
      // Use the selector for finding the collection and file reference                                               // 140
      var ref = selectorFunction.call(this);                                                                          // 141
                                                                                                                      // 142
      // Make sure we have a collection reference                                                                     // 143
      if (!ref.collection)                                                                                            // 144
        throw new Meteor.Error(404, "Not Found", "No collection found");                                              // 145
                                                                                                                      // 146
      // Make sure we have a file reference                                                                           // 147
      if (ref.file === null) {                                                                                        // 148
        // No id supplied so we will create a new FS.File instance and                                                // 149
        // insert the supplied data.                                                                                  // 150
        return httpPutInsertHandler.apply(this, [ref]);                                                               // 151
      } else {                                                                                                        // 152
        if (ref.file) {                                                                                               // 153
          return httpPutUpdateHandler.apply(this, [ref]);                                                             // 154
        } else {                                                                                                      // 155
          throw new Meteor.Error(404, "Not Found", 'No file found');                                                  // 156
        }                                                                                                             // 157
      }                                                                                                               // 158
    },                                                                                                                // 159
    'get': function(data) {                                                                                           // 160
      // Use the selector for finding the collection and file reference                                               // 161
      var ref = selectorFunction.call(this);                                                                          // 162
                                                                                                                      // 163
      // Make sure we have a collection reference                                                                     // 164
      if (!ref.collection)                                                                                            // 165
        throw new Meteor.Error(404, "Not Found", "No collection found");                                              // 166
                                                                                                                      // 167
      // Make sure we have a file reference                                                                           // 168
      if (ref.file === null) {                                                                                        // 169
        // No id supplied so we will return the published list of files ala                                           // 170
        // http.publish in json format                                                                                // 171
        return httpGetListHandler.apply(this, [ref]);                                                                 // 172
      } else {                                                                                                        // 173
        if (ref.file) {                                                                                               // 174
          return httpGetHandler.apply(this, [ref]);                                                                   // 175
        } else {                                                                                                      // 176
          throw new Meteor.Error(404, "Not Found", 'No file found');                                                  // 177
        }                                                                                                             // 178
      }                                                                                                               // 179
    },                                                                                                                // 180
    'delete': function(data) {                                                                                        // 181
      // Use the selector for finding the collection and file reference                                               // 182
      var ref = selectorFunction.call(this);                                                                          // 183
                                                                                                                      // 184
      // Make sure we have a collection reference                                                                     // 185
      if (!ref.collection)                                                                                            // 186
        throw new Meteor.Error(404, "Not Found", "No collection found");                                              // 187
                                                                                                                      // 188
      // Make sure we have a file reference                                                                           // 189
      if (ref.file) {                                                                                                 // 190
        return httpDelHandler.apply(this, [ref]);                                                                     // 191
      } else {                                                                                                        // 192
        throw new Meteor.Error(404, "Not Found", 'No file found');                                                    // 193
      }                                                                                                               // 194
    }                                                                                                                 // 195
  };                                                                                                                  // 196
                                                                                                                      // 197
  var accessPoints = {};                                                                                              // 198
                                                                                                                      // 199
  // Add debug message                                                                                                // 200
  FS.debug && console.log('Registered HTTP method URLs:');                                                            // 201
                                                                                                                      // 202
  FS.Utility.each(mountPoints, function(mountPoint) {                                                                 // 203
    // Couple mountpoint and accesspoint                                                                              // 204
    accessPoints[mountPoint] = accessPoint;                                                                           // 205
    // Remember our mountpoints                                                                                       // 206
    _existingMountPoints[mountPoint] = mountPoint;                                                                    // 207
    // Add debug message                                                                                              // 208
    FS.debug && console.log(mountPoint);                                                                              // 209
  });                                                                                                                 // 210
                                                                                                                      // 211
  // XXX: HTTP:methods should unmount existing mounts in case of overwriting?                                         // 212
  HTTP.methods(accessPoints);                                                                                         // 213
                                                                                                                      // 214
};                                                                                                                    // 215
                                                                                                                      // 216
/**                                                                                                                   // 217
 * @method FS.HTTP.unmount                                                                                            // 218
 * @public                                                                                                            // 219
 * @param {string | array of string} [mountPoints] Optional, if not specified all mountpoints are unmounted           // 220
 *                                                                                                                    // 221
 */                                                                                                                   // 222
FS.HTTP.unmount = function(mountPoints) {                                                                             // 223
  // The mountPoints is optional, can be string or array if undefined then                                            // 224
  // _existingMountPoints will be used                                                                                // 225
  var unmountList;                                                                                                    // 226
  // Container for the mount points to unmount                                                                        // 227
  var unmountPoints = {};                                                                                             // 228
                                                                                                                      // 229
  if (typeof mountPoints === 'undefined') {                                                                           // 230
    // Use existing mount points - unmount all                                                                        // 231
    unmountList = _existingMountPoints;                                                                               // 232
  } else if (mountPoints === ''+mountPoints) {                                                                        // 233
    // Got a string                                                                                                   // 234
    unmountList = [mountPoints];                                                                                      // 235
  } else if (mountPoints.length) {                                                                                    // 236
    // Got an array                                                                                                   // 237
    unmountList = mountPoints;                                                                                        // 238
  }                                                                                                                   // 239
                                                                                                                      // 240
  // If we have a list to unmount                                                                                     // 241
  if (unmountList) {                                                                                                  // 242
    // Iterate over each item                                                                                         // 243
    FS.Utility.each(unmountList, function(mountPoint) {                                                               // 244
      // Check _existingMountPoints to make sure the mount point exists in our                                        // 245
      // context / was created by the FS.HTTP.mount                                                                   // 246
      if (_existingMountPoints[mountPoint]) {                                                                         // 247
        // Mark as unmount                                                                                            // 248
        unmountPoints[mountPoint] = false;                                                                            // 249
        // Release                                                                                                    // 250
        delete _existingMountPoints[mountPoint];                                                                      // 251
      }                                                                                                               // 252
    });                                                                                                               // 253
    FS.debug && console.log('FS.HTTP.unmount:');                                                                      // 254
    FS.debug && console.log(unmountPoints);                                                                           // 255
    // Complete unmount                                                                                               // 256
    HTTP.methods(unmountPoints);                                                                                      // 257
  }                                                                                                                   // 258
};                                                                                                                    // 259
                                                                                                                      // 260
// ### FS.Collection maps on HTTP pr. default on the following restpoints:                                            // 261
// *                                                                                                                  // 262
//    baseUrl + '/files/:collectionName/:id/:filename',                                                               // 263
//    baseUrl + '/files/:collectionName/:id',                                                                         // 264
//    baseUrl + '/files/:collectionName'                                                                              // 265
//                                                                                                                    // 266
// Change/ replace the existing mount point by:                                                                       // 267
// ```js                                                                                                              // 268
//   // unmount all existing                                                                                          // 269
//   FS.HTTP.unmount();                                                                                               // 270
//   // Create new mount point                                                                                        // 271
//   FS.HTTP.mount([                                                                                                  // 272
//    '/cfs/files/:collectionName/:id/:filename',                                                                     // 273
//    '/cfs/files/:collectionName/:id',                                                                               // 274
//    '/cfs/files/:collectionName'                                                                                    // 275
//  ]);                                                                                                               // 276
//  ```                                                                                                               // 277
//                                                                                                                    // 278
mountUrls = function mountUrls() {                                                                                    // 279
  // We unmount first in case we are calling this a second time                                                       // 280
  FS.HTTP.unmount();                                                                                                  // 281
                                                                                                                      // 282
  FS.HTTP.mount([                                                                                                     // 283
    baseUrl + '/files/:collectionName/:id/:filename',                                                                 // 284
    baseUrl + '/files/:collectionName/:id',                                                                           // 285
    baseUrl + '/files/:collectionName'                                                                                // 286
  ]);                                                                                                                 // 287
};                                                                                                                    // 288
                                                                                                                      // 289
// Returns the userId from URL token                                                                                  // 290
var expirationAuth = function expirationAuth() {                                                                      // 291
  var self = this;                                                                                                    // 292
                                                                                                                      // 293
  // Read the token from '/hello?token=base64'                                                                        // 294
  var encodedToken = self.query.token;                                                                                // 295
                                                                                                                      // 296
  FS.debug && console.log("token: "+encodedToken);                                                                    // 297
                                                                                                                      // 298
  if (!encodedToken || !Meteor.users) return false;                                                                   // 299
                                                                                                                      // 300
  // Check the userToken before adding it to the db query                                                             // 301
  // Set the this.userId                                                                                              // 302
  var tokenString = FS.Utility.atob(encodedToken);                                                                    // 303
                                                                                                                      // 304
  var tokenObject;                                                                                                    // 305
  try {                                                                                                               // 306
    tokenObject = JSON.parse(tokenString);                                                                            // 307
  } catch(err) {                                                                                                      // 308
    throw new Meteor.Error(400, 'Bad Request');                                                                       // 309
  }                                                                                                                   // 310
                                                                                                                      // 311
  // XXX: Do some check here of the object                                                                            // 312
  var userToken = tokenObject.authToken;                                                                              // 313
  if (userToken !== ''+userToken) {                                                                                   // 314
    throw new Meteor.Error(400, 'Bad Request');                                                                       // 315
  }                                                                                                                   // 316
                                                                                                                      // 317
  // If we have an expiration token we should check that it's still valid                                             // 318
  if (tokenObject.expiration != null) {                                                                               // 319
    // check if its too old                                                                                           // 320
    var now = Date.now();                                                                                             // 321
    if (tokenObject.expiration < now) {                                                                               // 322
      FS.debug && console.log('Expired token: ' + tokenObject.expiration + ' is less than ' + now);                   // 323
      throw new Meteor.Error(500, 'Expired token');                                                                   // 324
    }                                                                                                                 // 325
  }                                                                                                                   // 326
                                                                                                                      // 327
  // We are not on a secure line - so we have to look up the user...                                                  // 328
  var user = Meteor.users.findOne({                                                                                   // 329
    $or: [                                                                                                            // 330
      {'services.resume.loginTokens.hashedToken': Accounts._hashLoginToken(userToken)},                               // 331
      {'services.resume.loginTokens.token': userToken}                                                                // 332
    ]                                                                                                                 // 333
  });                                                                                                                 // 334
                                                                                                                      // 335
  // Set the userId in the scope                                                                                      // 336
  return user && user._id;                                                                                            // 337
};                                                                                                                    // 338
                                                                                                                      // 339
HTTP.methods(                                                                                                         // 340
  {'/cfs/servertime': {                                                                                               // 341
    get: function(data) {                                                                                             // 342
      return Date.now().toString();                                                                                   // 343
    }                                                                                                                 // 344
  }                                                                                                                   // 345
});                                                                                                                   // 346
                                                                                                                      // 347
// Unify client / server api                                                                                          // 348
FS.HTTP.now = function() {                                                                                            // 349
  return Date.now();                                                                                                  // 350
};                                                                                                                    // 351
                                                                                                                      // 352
// Start up the basic mount points                                                                                    // 353
Meteor.startup(function () {                                                                                          // 354
  mountUrls();                                                                                                        // 355
});                                                                                                                   // 356
                                                                                                                      // 357
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['cfs:access-point'] = {};

})();

//# sourceMappingURL=cfs_access-point.js.map
