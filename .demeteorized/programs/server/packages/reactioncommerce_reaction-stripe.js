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
var StripePackageSchema, __coffeescriptShare;

(function () {

///////////////////////////////////////////////////////////////////////
//                                                                   //
// packages/reactioncommerce:reaction-stripe/common/collections.coff //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
ReactionCore.Schemas.StripePackageConfig = new SimpleSchema([
  ReactionCore.Schemas.PackageConfig, {
    "settings.api_key": {
      type: String,
      label: "API Client ID"
    }
  }
]);

ReactionCore.Schemas.StripePayment = new SimpleSchema({
  payerName: {
    type: String,
    label: "Cardholder name"
  },
  cardNumber: {
    type: String,
    min: 16,
    label: "Card number"
  },
  expireMonth: {
    type: String,
    max: 2,
    label: "Expiration month"
  },
  expireYear: {
    type: String,
    max: 4,
    label: "Expiration year"
  },
  cvv: {
    type: String,
    max: 4,
    label: "CVV"
  }
});
///////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

///////////////////////////////////////////////////////////////////////
//                                                                   //
// packages/reactioncommerce:reaction-stripe/common/register.coffee. //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
ReactionCore.registerPackage({
  name: "reaction-stripe",
  provides: ['paymentMethod'],
  paymentTemplate: "stripePaymentForm",
  label: "Stripe",
  description: "Stripe Payment for Reaction Commerce",
  icon: 'fa fa-shopping-cart',
  settingsRoute: "stripe",
  hasWidget: true,
  priority: "2",
  shopPermissions: [
    {
      label: "Stripe Payments",
      permission: "dashboard/payments",
      group: "Shop Settings"
    }
  ]
});
///////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

///////////////////////////////////////////////////////////////////////
//                                                                   //
// packages/reactioncommerce:reaction-stripe/common/routing.coffee.j //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
Router.map(function() {
  return this.route('stripe', {
    controller: ShopAdminController,
    path: 'dashboard/settings/stripe',
    template: 'stripe',
    waitOn: function() {
      return ReactionCore.Subscriptions.Packages;
    }
  });
});
///////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

///////////////////////////////////////////////////////////////////////
//                                                                   //
// packages/reactioncommerce:reaction-stripe/server/stripe.coffee.js //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var Fiber, Future;

Fiber = Npm.require("fibers");

Future = Npm.require("fibers/future");

Meteor.methods({
  stripeSubmit: function(cardData, paymentData) {
    var Stripe, api_key, fut;
    api_key = ReactionCore.Collections.Packages.findOne({
      name: "reaction-stripe"
    }).settings.api_key;
    Stripe = Npm.require("stripe")(api_key);
    fut = new Future();
    this.unblock();
    Stripe.charges.create({
      amount: paymentData.amount,
      currency: paymentData.currency,
      card: cardData
    }, function(err, payment) {
      if (err) {
        fut["return"]({
          saved: false,
          error: err
        });
      } else {
        fut["return"]({
          saved: true,
          payment: payment
        });
      }
    });
    return fut.wait();
  }
});
///////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['reactioncommerce:reaction-stripe'] = {
  StripePackageSchema: StripePackageSchema
};

})();

//# sourceMappingURL=reactioncommerce_reaction-stripe.js.map
