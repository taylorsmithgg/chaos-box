(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;

/* Package-scope variables */
var ThemeData;

(function () {

///////////////////////////////////////////////////////////////////////
//                                                                   //
// packages/reactioncommerce:core-theme/theme-data.js                //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
ThemeData = function (file) {                                        // 1
  return Assets.getText(file);                                       // 2
}                                                                    // 3
                                                                     // 4
///////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['reactioncommerce:core-theme'] = {
  ThemeData: ThemeData
};

})();

//# sourceMappingURL=reactioncommerce_core-theme.js.map
