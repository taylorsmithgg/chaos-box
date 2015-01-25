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

//////////////////////////////////////////////////////////////////////////
//                                                                      //
// packages/reactioncommerce:reaction-braintree/common/collections.coff //
//                                                                      //
//////////////////////////////////////////////////////////////////////////
                                                                        //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
ReactionCore.Schemas.BraintreePackageConfig = new SimpleSchema([
  ReactionCore.Schemas.PackageConfig, {
    "settings.merchant_id": {
      type: String,
      label: "Merchant ID"
    },
    "settings.public_key": {
      type: String,
      label: "Public Key"
    },
    "settings.private_key": {
      type: String,
      label: "Private Key"
    }
  }
]);

ReactionCore.Schemas.BraintreePayment = new SimpleSchema({
  payerName: {
    type: String,
    label: "Cardholder name",
    regEx: /^\w+\s\w+$/
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

ReactionCore.Schemas.BraintreePayment.messages({
  "regEx payerName": "[label] must include both first and last name"
});
//////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////
//                                                                      //
// packages/reactioncommerce:reaction-braintree/common/routing.coffee.j //
//                                                                      //
//////////////////////////////////////////////////////////////////////////
                                                                        //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
Router.map(function() {
  return this.route('braintree', {
    controller: ShopAdminController,
    path: 'dashboard/settings/braintree',
    template: 'braintree',
    waitOn: function() {
      return ReactionCore.Subscriptions.Packages;
    }
  });
});
//////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////
//                                                                      //
// packages/reactioncommerce:reaction-braintree/common/register.coffee. //
//                                                                      //
//////////////////////////////////////////////////////////////////////////
                                                                        //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
ReactionCore.registerPackage({
  name: "reaction-braintree",
  provides: ['paymentMethod'],
  paymentTemplate: "braintreePaymentForm",
  label: "Braintree",
  description: "Braintree Payment for Reaction Commerce",
  icon: 'fa fa-shopping-cart',
  settingsRoute: "braintree",
  hasWidget: true,
  priority: "2",
  shopPermissions: [
    {
      label: "Braintree Payments",
      permission: "dashboard/payments",
      group: "Shop Settings"
    }
  ]
});
//////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////
//                                                                      //
// packages/reactioncommerce:reaction-braintree/server/braintree.coffee //
//                                                                      //
//////////////////////////////////////////////////////////////////////////
                                                                        //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var Braintree, Fiber, Future, braintreePackage, gateway, settings;

Braintree = Npm.require('braintree');

Fiber = Npm.require("fibers");

Future = Npm.require("fibers/future");

braintreePackage = ReactionCore.Collections.Packages.findOne({
  name: "reaction-braintree"
});

if (braintreePackage != null ? braintreePackage.settings : void 0) {
  ReactionCore.Events.trace({
    name: "reactioncommerce:reaction-braintree",
    settings: braintreePackage
  });
  settings = braintreePackage.settings;
  gateway = Braintree.connect({
    environment: Braintree.Environment.Sandbox,
    merchantId: settings.merchant_id,
    publicKey: settings.public_key,
    privateKey: settings.private_key
  });
}

Meteor.methods({
  braintreeSubmit: function(cardData, amount) {
    var fut;
    fut = new Future();
    this.unblock();
    return gateway.transaction.sale({
      amount: amount,
      creditCard: {
        number: cardData.number,
        expirationMonth: cardData.expirationMonth,
        expirationYear: cardData.expirationYear,
        cvv: cardData.cvv
      }
    }, function(err, payment) {
      if (err) {
        fut["return"]({
          saved: false,
          error: err
        });
      } else if (payment.success) {
        fut["return"]({
          saved: true,
          payment: payment
        });
      } else {
        console.log(result.message);
      }

      /* Error handling Snippet from braintree docs
      throw err if err
      if result.success
        console.log "Success. Transaction ID: " + result.transaction.id
      else
        console.log result.message
      return
       */
    });
  }
});
//////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['reactioncommerce:reaction-braintree'] = {};

})();

//# sourceMappingURL=reactioncommerce_reaction-braintree.js.map
