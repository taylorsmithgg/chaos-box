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

///////////////////////////////////////////////////////////////////////////
//                                                                       //
// packages/reactioncommerce:reaction-shipping/common/register.coffee.js //
//                                                                       //
///////////////////////////////////////////////////////////////////////////
                                                                         //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
ReactionCore.registerPackage({
  name: 'reaction-shipping',
  provides: ['shippingMethod'],
  shippingTemplate: "flatRateCheckoutShipping",
  label: 'Basic Shipping',
  description: 'Use flat rates for shipping calculations',
  icon: 'fa fa-truck',
  settingsRoute: 'shipping',
  defaultSettings: {
    name: "Flat Rate Service"
  },
  priority: '2',
  hasWidget: true,
  autoEnable: true,
  shopPermissions: [
    {
      label: "Shipping",
      permission: "dashboard/shipping",
      group: "Shop Settings"
    }
  ]
});
///////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

///////////////////////////////////////////////////////////////////////////
//                                                                       //
// packages/reactioncommerce:reaction-shipping/common/collections.coffee //
//                                                                       //
///////////////////////////////////////////////////////////////////////////
                                                                         //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;

/*
 *  Meteor.settings.paypal =
 *    mode: false  #sandbox
 *    client_id: ""
 *    client_secret: ""
 *  see: https://developer.paypal.com/webapps/developer/docs/api/
 *  see: https://github.com/paypal/rest-api-sdk-nodejs
 */
ReactionCore.Schemas.ShippingPackageConfig = new SimpleSchema([
  ReactionCore.Schemas.PackageConfig, {
    "settings.name": {
      type: String,
      defaultValue: "Flat Rate Service"
    }
  }
]);
///////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

///////////////////////////////////////////////////////////////////////////
//                                                                       //
// packages/reactioncommerce:reaction-shipping/common/routing.coffee.js  //
//                                                                       //
///////////////////////////////////////////////////////////////////////////
                                                                         //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
Router.map(function() {
  return this.route('shipping', {
    controller: ShopAdminController,
    path: 'dashboard/settings/shipping',
    template: 'shipping',
    waitOn: function() {
      return ReactionCore.Subscriptions.Packages;
    },
    subscriptions: function() {
      return Meteor.subscribe("shipping");
    }
  });
});
///////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

///////////////////////////////////////////////////////////////////////////
//                                                                       //
// packages/reactioncommerce:reaction-shipping/server/methods.coffee.js  //
//                                                                       //
///////////////////////////////////////////////////////////////////////////
                                                                         //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
Meteor.methods({

  /*
   * add new shipping methods
   */
  addShippingMethod: function(insertDoc, updateDoc, currentDoc) {
    if (!Roles.userIsInRole(Meteor.userId(), ['admin', 'shipping'])) {
      return false;
    }
    return ReactionCore.Collections.Shipping.update({
      '_id': currentDoc
    }, {
      $addToSet: {
        'methods': insertDoc
      }
    });
  },

  /*
   * Update Shipping methods for a provider
   */
  updateShippingMethods: function(docId, currentDoc, updateDoc) {
    check(docId, String);
    if (!Roles.userIsInRole(Meteor.userId(), ['admin', 'shipping'])) {
      return false;
    }
    return ReactionCore.Collections.Shipping.update({
      '_id': docId,
      'methods': currentDoc
    }, {
      $set: {
        'methods.$': updateDoc
      }
    });
  },

  /*
   * remove shipping method
   */
  removeShippingMethod: function(providerId, removeDoc) {
    check(providerId, String);
    if (!Roles.userIsInRole(Meteor.userId(), ['admin', 'shipping'])) {
      return false;
    }
    return ReactionCore.Collections.Shipping.update({
      '_id': providerId,
      'methods': removeDoc
    }, {
      $pull: {
        'methods': removeDoc
      }
    });
  },

  /*
   * add / insert shipping provider
   */
  addShippingProvider: function(insertDoc, updateDoc, currentDoc) {
    if (!Roles.userIsInRole(Meteor.userId(), ['admin', 'shipping'])) {
      return false;
    }
    return ReactionCore.Collections.Shipping.insert(insertDoc);
  },

  /*
   * update shipping provider
   */
  updateShippingProvider: function(insertDoc, updateDoc, currentDoc) {
    if (!Roles.userIsInRole(Meteor.userId(), ['admin', 'shipping'])) {
      return false;
    }
    return ReactionCore.Collections.Shipping.update({
      '_id': currentDoc
    }, updateDoc);
  }
});
///////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

///////////////////////////////////////////////////////////////////////////
//                                                                       //
// packages/reactioncommerce:reaction-shipping/server/fixtures.coffee.js //
//                                                                       //
///////////////////////////////////////////////////////////////////////////
                                                                         //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;

/*
 * Fixture - we always want a record
 */
Meteor.startup(function() {
  var jsonFile;
  jsonFile = Assets.getText("private/data/Shipping.json");
  return Fixtures.loadData(ReactionCore.Collections.Shipping, jsonFile);
});
///////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['reactioncommerce:reaction-shipping'] = {};

})();

//# sourceMappingURL=reactioncommerce_reaction-shipping.js.map
