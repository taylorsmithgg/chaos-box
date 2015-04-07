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

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                             //
// packages/reactioncommerce:reaction-braintree/server/register.coffee.js                                      //
//                                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                               //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
ReactionCore.registerPackage({
  name: 'reaction-braintree',
  autoEnable: false,
  settings: {
    mode: false,
    merchant_id: "",
    public_key: "",
    private_key: ""
  },
  registry: [
    {
      provides: 'dashboard',
      label: 'Braintree',
      description: "Braintree Payment for Reaction Commerce",
      icon: 'fa fa-credit-card',
      cycle: '3',
      container: 'dashboard'
    }, {
      route: 'braintree',
      provides: 'settings',
      container: 'dashboard'
    }, {
      template: 'braintreePaymentForm',
      provides: 'paymentMethod'
    }
  ],
  permissions: [
    {
      label: "Braintree",
      permission: "dashboard/payments",
      group: "Shop Settings"
    }
  ]
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                             //
// packages/reactioncommerce:reaction-braintree/server/braintree.coffee.js                                     //
//                                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                               //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var Braintree, Fiber, Future;

Braintree = Npm.require('braintree');

Fiber = Npm.require("fibers");

Future = Npm.require("fibers/future");

Meteor.methods({
  braintreeSubmit: function(transactionType, cardData, paymentData) {
    var accountOptions, fut, gateway, paymentObj;
    accountOptions = Meteor.Braintree.accountOptions();
    if (accountOptions.environment === "production") {
      accountOptions.environment = Braintree.Environment.Production;
    } else {
      accountOptions.environment = Braintree.Environment.Sandbox;
    }
    gateway = Braintree.connect(accountOptions);
    paymentObj = Meteor.Braintree.paymentObj();
    if (transactionType === "authorize") {
      paymentObj.options.submitForSettlement = false;
    }
    paymentObj.creditCard = Meteor.Braintree.parseCardData(cardData);
    paymentObj.amount = paymentData.total;
    fut = new Future();
    this.unblock();
    gateway.transaction.sale(paymentObj, Meteor.bindEnvironment(function(error, result) {
      if (error) {
        fut["return"]({
          saved: false,
          error: err
        });
      } else if (!result.success) {
        fut["return"]({
          saved: false,
          response: result
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
  braintreeCapture: function(transactionId, captureDetails) {
    var accountOptions, fut, gateway;
    accountOptions = Meteor.Braintree.accountOptions();
    if (accountOptions.environment === "production") {
      accountOptions.environment = Braintree.Environment.Production;
    } else {
      accountOptions.environment = Braintree.Environment.Sandbox;
    }
    gateway = Braintree.connect(accountOptions);
    fut = new Future();
    this.unblock();
    gateway.transaction.submit_for_settlement(transactionId, captureDetails, Meteor.bindEnvironment(function(error, result) {
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
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                             //
// packages/reactioncommerce:reaction-braintree/common/collections.coffee.js                                   //
//                                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                               //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;

/*
 *  Meteor.settings.braintree =
 *    mode: false  #sandbox
 *    merchant_id: ""
 *    public_key: ""
 *    private_key: ""
 *  see: https://developers.braintreepayments.com/javascript+node/reference
 */
ReactionCore.Schemas.BraintreePackageConfig = new SimpleSchema([
  ReactionCore.Schemas.PackageConfig, {
    "settings.mode": {
      type: Boolean,
      defaultValue: false
    },
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
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                             //
// packages/reactioncommerce:reaction-braintree/common/routing.coffee.js                                       //
//                                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                             //
// packages/reactioncommerce:reaction-braintree/lib/braintree.coffee.js                                        //
//                                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                               //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
Meteor.Braintree = {
  accountOptions: function() {
    var environment, options, settings;
    settings = ReactionCore.Collections.Packages.findOne({
      name: "reaction-braintree"
    }).settings;
    if ((settings != null ? settings.mode : void 0) === true) {
      environment = "production";
    } else {
      environment = "sandbox";
    }
    options = {
      environment: environment,
      merchantId: (settings != null ? settings.merchant_id : void 0) || Meteor.settings.braintree.merchant_id,
      publicKey: (settings != null ? settings.public_key : void 0) || Meteor.settings.braintree.public_key,
      privateKey: (settings != null ? settings.private_key : void 0) || Meteor.settings.braintree.private_key
    };
    return options;
  },
  authorize: function(cardData, paymentData, callback) {
    Meteor.call("braintreeSubmit", "authorize", cardData, paymentData, callback);
  },
  capture: function(transactionId, amount, callback) {
    var captureDetails;
    captureDetails = {
      amount: amount
    };
    Meteor.call("braintreeCapture", transactionId, captureDetails, callback);
  },
  config: function(options) {
    this.accountOptions = options;
  },
  paymentObj: function() {
    return {
      amount: "",
      options: {
        submitForSettlement: true
      }
    };
  },
  parseCardData: function(data) {
    return {
      cardholderName: data.name,
      number: data.number,
      expirationMonth: data.expirationMonth,
      expirationYear: data.expirationYear,
      cvv: data.cvv
    };
  },
  parseCurrencyData: function(data) {}
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['reactioncommerce:reaction-braintree'] = {};

})();

//# sourceMappingURL=reactioncommerce_reaction-braintree.js.map
