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

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/reactioncommerce:reaction-stripe/server/register.coffee.js                                     //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
ReactionCore.registerPackage({
  name: 'reaction-stripe',
  autoEnable: false,
  settings: {
    mode: false,
    api_key: ""
  },
  registry: [
    {
      provides: 'dashboard',
      label: 'Stripe',
      description: "Stripe Payment for Reaction Commerce",
      icon: 'fa fa-cc-stripe',
      cycle: '3',
      container: 'dashboard'
    }, {
      route: 'stripe',
      provides: 'settings',
      container: 'dashboard'
    }, {
      template: 'stripePaymentForm',
      provides: 'paymentMethod'
    }
  ],
  permissions: [
    {
      label: "Stripe",
      permission: "dashboard/payments",
      group: "Shop Settings"
    }
  ]
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/reactioncommerce:reaction-stripe/server/stripe.coffee.js                                       //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var Fiber, Future, ValidCVV, ValidCardNumber, ValidExpireMonth, ValidExpireYear;

Fiber = Npm.require("fibers");

Future = Npm.require("fibers/future");

Meteor.methods({
  stripeSubmit: function(transactionType, cardData, paymentData) {
    var Stripe, chargeObj, fut;
    check(transactionType, String);
    check(cardData, {
      name: String,
      number: ValidCardNumber,
      expire_month: ValidExpireMonth,
      expire_year: ValidExpireYear,
      cvv2: ValidCVV,
      type: String
    });
    check(paymentData, {
      total: String,
      currency: String
    });
    Stripe = Npm.require("stripe")(Meteor.Stripe.accountOptions());
    chargeObj = Meteor.Stripe.chargeObj();
    if (transactionType === "authorize") {
      chargeObj.capture = false;
    }
    chargeObj.card = Meteor.Stripe.parseCardData(cardData);
    chargeObj.amount = parseFloat(paymentData.total) * 100;
    chargeObj.currency = paymentData.currency;
    fut = new Future();
    this.unblock();
    Stripe.charges.create(chargeObj, Meteor.bindEnvironment(function(error, result) {
      if (error) {
        fut["return"]({
          saved: false,
          error: error
        });
      } else {
        fut["return"]({
          saved: true,
          response: result
        });
      }
    }, function(e) {
      ReactionCore.Events.warn(e);
    }));
    return fut.wait();
  },
  stripeCapture: function(transactionId, captureDetails) {
    var Stripe, fut;
    Stripe = Npm.require("stripe")(Meteor.Stripe.accountOptions());
    fut = new Future();
    this.unblock();
    Stripe.charges.capture(transactionId, captureDetails, Meteor.bindEnvironment(function(error, result) {
      if (error) {
        fut["return"]({
          saved: false,
          error: error
        });
      } else {
        fut["return"]({
          saved: true,
          response: result
        });
      }
    }, function(e) {
      ReactionCore.Events.warn(e);
    }));
    return fut.wait();
  }
});

ValidCardNumber = Match.Where(function(x) {
  return /^[0-9]{14,16}$/.test(x);
});

ValidExpireMonth = Match.Where(function(x) {
  return /^[0-9]{1,2}$/.test(x);
});

ValidExpireYear = Match.Where(function(x) {
  return /^[0-9]{4}$/.test(x);
});

ValidCVV = Match.Where(function(x) {
  return /^[0-9]{3,4}$/.test(x);
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/reactioncommerce:reaction-stripe/common/collections.coffee.js                                  //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;

/*
 *  Meteor.settings.stripe =
 *    mode: false  #sandbox
 *    api_key: ""
 *  see: https://stripe.com/docs/api
 */
ReactionCore.Schemas.StripePackageConfig = new SimpleSchema([
  ReactionCore.Schemas.PackageConfig, {
    "settings.mode": {
      type: Boolean,
      defaultValue: false
    },
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
    min: 14,
    max: 16,
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

ReactionCore.Schemas.StripePayment.messages({
  "regEx payerName": "[label] must include both first and last name"
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/reactioncommerce:reaction-stripe/common/routing.coffee.js                                      //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/reactioncommerce:reaction-stripe/lib/stripe.coffee.js                                          //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
Meteor.Stripe = {
  accountOptions: function() {
    var settings;
    settings = ReactionCore.Collections.Packages.findOne({
      name: "reaction-stripe"
    }).settings;
    return settings.api_key;
  },
  authorize: function(cardInfo, paymentInfo, callback) {
    Meteor.call("stripeSubmit", "authorize", cardInfo, paymentInfo, callback);
  },
  capture: function(transactionId, amount, callback) {
    var captureDetails;
    captureDetails = {
      amount: amount
    };
    Meteor.call("stripeCapture", transactionId, captureDetails, callback);
  },
  config: function(options) {
    this.accountOptions = options;
  },
  chargeObj: function() {
    return {
      amount: "",
      currency: "",
      card: {},
      capture: true,
      currency: ""
    };
  },
  parseCardData: function(data) {
    return {
      number: data.number,
      name: data.name,
      cvc: data.cvv2,
      exp_month: data.expire_month,
      exp_year: data.expire_year
    };
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['reactioncommerce:reaction-stripe'] = {};

})();

//# sourceMappingURL=reactioncommerce_reaction-stripe.js.map
