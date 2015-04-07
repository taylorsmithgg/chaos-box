(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var ReactionCore = Package['reactioncommerce:core'].ReactionCore;
var ReactionRegistry = Package['reactioncommerce:core'].ReactionRegistry;
var currentProduct = Package['reactioncommerce:core'].currentProduct;
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
var Security = Package['ongoworks:security'].Security;
var HTML = Package.htmljs.HTML;
var BrowserPolicy = Package['browser-policy-common'].BrowserPolicy;
var Iron = Package['iron:core'].Iron;

/* Package-scope variables */
var __coffeescriptShare;

(function () {

///////////////////////////////////////////////////////////////////////////////////////
//                                                                                   //
// packages/reactioncommerce:reaction-google-analytics/common/routing.coffee.js      //
//                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////
                                                                                     //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
Router.map(function() {
  return this.route('googleAnalytics', {
    controller: ShopAdminController,
    path: 'dashboard/settings/googleAnalytics',
    template: 'googleAnalytics'
  });
});

Router.onRun(function() {
  var gaConfig, trackingID;
  gaConfig = ReactionCore.Collections.Packages.findOne({
    name: "reaction-google-analytics",
    'enabled': true
  });
  if (gaConfig) {
    trackingID = gaConfig.settings["public"].api_key;
  }
  if (trackingID) {
    ga("send", "pageview", Iron.Location.get().path);
  }
  this.next();
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

/*
 *   Google Analytics
 *   api_key: "UA-XXXXX-X" (this is your tracking ID)
 */
ReactionCore.Collections.AnalyticsEvents = new Meteor.Collection("AnalyticsEvents");

ReactionCore.Schemas.GoogleAnalyticsPackageConfig = new SimpleSchema([
  ReactionCore.Schemas.PackageConfig, {
    "settings.public.api_key": {
      type: String,
      label: "Tracking ID"
    }
  }
]);
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
// packages/reactioncommerce:reaction-google-analytics/server/security/browserPolicy //
//                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////
                                                                                     //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
Meteor.startup(function() {
  BrowserPolicy.content.allowOriginForAll("www.google-analytics.com");
  return BrowserPolicy.content.allowOriginForAll("*.doubleclick.net");
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
// packages/reactioncommerce:reaction-google-analytics/server/register.coffee.js     //
//                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////
                                                                                     //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
ReactionCore.registerPackage({
  name: 'reaction-google-analytics',
  autoEnable: false,
  settings: {
    "public": {
      api_key: ""
    }
  },
  registry: [
    {
      provides: 'dashboard',
      label: 'Google Analytics',
      description: "Event tracking and analytics with Google Analytics",
      icon: "fa fa-bar-chart-o",
      cycle: '3',
      container: 'dashboard'
    }, {
      route: 'googleAnalytics',
      provides: 'settings',
      container: 'dashboard'
    }
  ],
  permissions: [
    {
      label: "Google Analytics",
      permission: "dashboard/settings",
      group: "Shop Settings"
    }
  ]
});
///////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['reactioncommerce:reaction-google-analytics'] = {};

})();

//# sourceMappingURL=reactioncommerce_reaction-google-analytics.js.map
