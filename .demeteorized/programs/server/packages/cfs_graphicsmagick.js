(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;

/* Package-scope variables */
var gm;

(function () {

///////////////////////////////////////////////////////////////////////////////////////////
//                                                                                       //
// packages/cfs:graphicsmagick/gm.js                                                     //
//                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////
                                                                                         //
//wrap gm() object with an object that exposes the same methods, with the addition of a  // 1
//.save() method that overwrites the FS.File's .buffer with the result                   // 2
                                                                                         // 3
var nodegm = Npm.require('gm');                                                          // 4
var path = Npm.require('path');                                                          // 5
var fs = Npm.require('fs');                                                              // 6
                                                                                         // 7
gm = function() {                                                                        // 8
  throw new Error('cfs:Graphicsmagic could not find "graphicsMagick" or "imageMagick"'); // 9
};                                                                                       // 10
                                                                                         // 11
var graphicsmagick = false;                                                              // 12
var imagemagick = false;                                                                 // 13
                                                                                         // 14
// Split the path by : or ;                                                              // 15
// XXX: windows is not tested                                                            // 16
var binaryPaths = process.env['PATH'].split(/:|;/);                                      // 17
                                                                                         // 18
// XXX: we should properly check if we can access the os temp folder - since             // 19
// gm binaries are using this and therefor may fail?                                     // 20
                                                                                         // 21
// XXX: we could push extra paths if the `gm` library check stuff like:                  // 22
// $MAGIC_HOME The current version does not check there                                  // 23
// $MAGICK_HOME (GraphicsMagick docs)                                                    // 24
                                                                                         // 25
// We check to see if we can find binaries                                               // 26
for (var i = 0; i < binaryPaths.length; i++) {                                           // 27
  var binPath = binaryPaths[i];                                                          // 28
                                                                                         // 29
  // If we have not found GraphicsMagic                                                  // 30
  if (!graphicsmagick) {                                                                 // 31
    // Init                                                                              // 32
    var gmPath = path.join(binPath, 'gm');                                               // 33
    var gmExePath = path.join(binPath, 'gm.exe');                                        // 34
                                                                                         // 35
    // Check to see if binary found                                                      // 36
    graphicsmagick = fs.existsSync(gmPath) || fs.existsSync(gmExePath);                  // 37
                                                                                         // 38
    if (graphicsmagick) console.log('=> GraphicsMagick found');                          // 39
                                                                                         // 40
    // If GraphicsMagic we dont have to check for ImageMagic                             // 41
    // Since we prefer GrapicsMagic when selecting api                                   // 42
    if (!graphicsmagick && !imagemagick) {                                               // 43
      // Init paths to check                                                             // 44
      var imPath = path.join(binPath, 'convert');                                        // 45
      var imExePath = path.join(binPath, 'convert.exe');                                 // 46
                                                                                         // 47
      // Check to see if binary found                                                    // 48
      imagemagick = fs.existsSync(imPath) || fs.existsSync(imExePath);                   // 49
                                                                                         // 50
      if (imagemagick) console.log('=> ImageMagick found');                              // 51
                                                                                         // 52
    }                                                                                    // 53
  }                                                                                      // 54
}                                                                                        // 55
                                                                                         // 56
                                                                                         // 57
if (!graphicsmagick && !imagemagick) {                                                   // 58
        // Both failed                                                                   // 59
        console.warn(                                                                    // 60
'WARNING:\n' +                                                                           // 61
'cfs:graphicsmagick could not find "graphicsMagic" or "imageMagic" on the\n' +           // 62
'system.\n' +                                                                            // 63
'\n' +                                                                                   // 64
'I just checked PATH to see if I could find the GraphicsMagick or ImageMagic\n' +        // 65
'unix/mac os/windows binaries on your system, I failed.\n' +                             // 66
'\n' +                                                                                   // 67
'Why:\n' +                                                                               // 68
'1. I may be blind or naive, help making me smarter\n' +                                 // 69
'2. You havent added the path to the binaries\n' +                                       // 70
'3. You havent actually installed GraphicsMagick or ImageMagick\n' +                     // 71
'\n' +                                                                                   // 72
'*** Make sure "$PATH" environment is configured "PATH:/path/to/binaries" ***\n' +       // 73
'\n' +                                                                                   // 74
'Installation hints:\n' +                                                                // 75
'* Mac OS X "brew install graphicsmagick" or "brew install imagemagick"\n' +             // 76
'* Linux download rpm or use packagemanager\n' +                                         // 77
'* Centos "yum install GraphicsMagick"' +                                                // 78
'* Windows download the installer and run');                                             // 79
                                                                                         // 80
  gm.isAvailable = false;                                                                // 81
                                                                                         // 82
} else {                                                                                 // 83
  // Rig the gm scope                                                                    // 84
                                                                                         // 85
  if (graphicsmagick) {                                                                  // 86
    // Prefer graphicsmagick                                                             // 87
    gm = nodegm;                                                                         // 88
  } else {                                                                               // 89
    // Use imageMagick - we subclass for the user                                        // 90
    var imageMagick = nodegm.subClass({ imageMagick: true });                            // 91
    gm = imageMagick;                                                                    // 92
  }                                                                                      // 93
                                                                                         // 94
  gm.isAvailable = true;                                                                 // 95
}                                                                                        // 96
                                                                                         // 97
///////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['cfs:graphicsmagick'] = {
  gm: gm
};

})();

//# sourceMappingURL=cfs_graphicsmagick.js.map
