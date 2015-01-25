(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var ReactionCore = Package['reactioncommerce:core'].ReactionCore;
var currentProduct = Package['reactioncommerce:core'].currentProduct;
var ShopController = Package['reactioncommerce:core'].ShopController;
var Products = Package['reactioncommerce:core'].Products;
var Cart = Package['reactioncommerce:core'].Cart;
var Tags = Package['reactioncommerce:core'].Tags;
var WebApp = Package.webapp.WebApp;
var main = Package.webapp.main;
var WebAppInternals = Package.webapp.WebAppInternals;
var Log = Package.logging.Log;
var Tracker = Package.deps.Tracker;
var Deps = Package.deps.Deps;
var DDP = Package.livedata.DDP;
var DDPServer = Package.livedata.DDPServer;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;
var Blaze = Package.ui.Blaze;
var UI = Package.ui.UI;
var Handlebars = Package.ui.Handlebars;
var Spacebars = Package.spacebars.Spacebars;
var check = Package.check.check;
var Match = Package.check.Match;
var _ = Package.underscore._;
var Random = Package.random.Random;
var EJSON = Package.ejson.EJSON;
var Accounts = Package['accounts-base'].Accounts;
var SimpleSchema = Package['aldeed:simple-schema'].SimpleSchema;
var MongoObject = Package['aldeed:simple-schema'].MongoObject;
var Router = Package['iron:router'].Router;
var RouteController = Package['iron:router'].RouteController;
var gm = Package['cfs:graphicsmagick'].gm;
var CollectionHooks = Package['matb33:collection-hooks'].CollectionHooks;
var Roles = Package['alanning:roles'].Roles;
var Factory = Package['dburles:factory'].Factory;
var getSlug = Package['ongoworks:speakingurl'].getSlug;
var HTML = Package.htmljs.HTML;
var Iron = Package['iron:core'].Iron;

/* Package-scope variables */
var __coffeescriptShare;

(function () {

///////////////////////////////////////////////////////////////////////////////////////
//                                                                                   //
// packages/reactioncommerce:reaction-google-analytics/common/register.coffee.js     //
//                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////
                                                                                     //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
ReactionCore.registerPackage({
  name: "reaction-google-analytics",
  provides: ['analytics'],
  label: "Google Analytics",
  description: "Event tracking with Google Analytics",
  icon: "fa fa-bar-chart-o",
  settingsRoute: "dashboard/settings/google",
  hasWidget: false,
  priority: "4",
  autoEnable: true,
  shopPermissions: [
    {
      label: "Google Analytics",
      permission: "dashboard/settings",
      group: "Shop Settings"
    }
  ]
});
///////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

///////////////////////////////////////////////////////////////////////////////////////
//                                                                                   //
// packages/reactioncommerce:reaction-google-analytics/common/collections.coffee.js  //
//                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////
                                                                                     //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
ReactionCore.Collections.AnalyticsEvents = new Meteor.Collection("AnalyticsEvents");
///////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

///////////////////////////////////////////////////////////////////////////////////////
//                                                                                   //
// packages/reactioncommerce:reaction-google-analytics/server/security/AnalyticsEven //
//                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////
                                                                                     //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
ReactionCore.Collections.AnalyticsEvents.allow({
  insert: function(userId, analyticsEvent) {
    analyticsEvent.shopId = ReactionCore.getShopId();
    return true;
  },
  update: function(userId, analyticsEvent, fields, modifier) {
    if (modifier.$set && modifier.$set.shopId) {
      return false;
    }
    return true;
  },
  remove: function(userId, analyticsEvent) {
    if (analyticsEvent.shopId !== ReactionCore.getShopId()) {
      return false;
    }
    return true;
  }
});
///////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

///////////////////////////////////////////////////////////////////////////////////////
//                                                                                   //
// packages/reactioncommerce:reaction-google-analytics/server/publications.coffee.js //
//                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////
                                                                                     //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
Meteor.publish("AnalyticsEvents", function() {
  return ReactionCore.Collections.AnalyticsEvents.find({
    shopId: ReactionCore.getShopId(this)
  });
});
///////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

///////////////////////////////////////////////////////////////////////////////////////
//                                                                                   //
// packages/reactioncommerce:reaction-google-analytics/server/fixtures.coffee.js     //
//                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////
                                                                                     //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;

/*
 * Fixture - we always want a record
 */
var Packages;

Packages = ReactionCore.Collections.Packages;

Meteor.startup(function() {
  var prop, _ref;
  prop = (_ref = Meteor.settings) != null ? _ref.googleAnalyticsProperty : void 0;
  if (!prop) {
    return;
  }
  return Packages.update({
    name: "reaction-google-analytics",
    property: null
  }, {
    $set: {
      property: prop
    }
  }, function(error, result) {
    if (result > 0) {
      return ReactionCore.Events.info("Added google analytics fixture data:", prop);
    }
  });
});
///////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['reactioncommerce:reaction-google-analytics'] = {};

})();

//# sourceMappingURL=reactioncommerce_reaction-google-analytics.js.map
