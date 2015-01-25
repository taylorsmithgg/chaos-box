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

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/reactioncommerce:reaction-paypal/common/register.coffee.js                                            //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
ReactionCore.registerPackage({
  name: 'reaction-paypal',
  provides: ['paymentMethod'],
  paymentTemplate: "paypalPaymentForm",
  label: 'PayPal',
  description: 'Accept PayPal',
  icon: 'fa fa-shopping-cart',
  settingsRoute: 'paypal',
  defaultSettings: {
    mode: false,
    client_id: "",
    client_secret: ""
  },
  priority: '2',
  hasWidget: true,
  shopPermissions: [
    {
      label: "Pay Pal",
      permission: "dashboard/payments",
      group: "Shop Settings"
    }
  ]
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/reactioncommerce:reaction-paypal/common/collections.coffee.js                                         //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
ReactionCore.Schemas.PaypalPackageConfig = new SimpleSchema([
  ReactionCore.Schemas.PackageConfig, {
    "settings.mode": {
      type: Boolean,
      defaultValue: false
    },
    "settings.client_id": {
      type: String,
      label: "API Client ID",
      min: 60
    },
    "settings.client_secret": {
      type: String,
      label: "API Secret",
      min: 60
    }
  }
]);

ReactionCore.Schemas.PaypalPayment = new SimpleSchema({
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

ReactionCore.Schemas.PaypalPayment.messages({
  "regEx payerName": "[label] must include both first and last name"
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/reactioncommerce:reaction-paypal/lib/paypal.coffee.js                                                 //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
Meteor.Paypal = {
  accountOptions: function() {
    var mode, options, settings;
    settings = ReactionCore.Collections.Packages.findOne({
      name: "reaction-paypal"
    }).settings;
    if ((settings != null ? settings.mode : void 0) === true) {
      mode = "live";
    } else {
      mode = "sandbox";
    }
    options = {
      mode: mode,
      client_id: (settings != null ? settings.client_id : void 0) || Meteor.settings.paypal.client_id,
      client_secret: (settings != null ? settings.client_secret : void 0) || Meteor.settings.paypal.client_secret
    };
    return options;
  },
  authorize: function(cardInfo, paymentInfo, callback) {
    Meteor.call("paypalSubmit", "authorize", cardInfo, paymentInfo, callback);
  },
  capture: function(transactionId, amount, callback) {
    var captureDetails;
    captureDetails = {
      amount: {
        currency: "USD",
        total: amount
      },
      is_final_capture: true
    };
    Meteor.call("paypalCapture", transactionId, captureDetails, callback);
  },
  config: function(options) {
    this.accountOptions = options;
  },
  paymentObj: function() {
    return {
      intent: "sale",
      payer: {
        payment_method: "credit_card",
        funding_instruments: []
      },
      transactions: []
    };
  },
  parseCardData: function(data) {
    return {
      credit_card: {
        type: data.type,
        number: data.number,
        first_name: data.first_name,
        last_name: data.last_name,
        cvv2: data.cvv2,
        expire_month: data.expire_month,
        expire_year: data.expire_year
      }
    };
  },
  parsePaymentData: function(data) {
    return {
      amount: {
        total: data.total,
        currency: data.currency
      }
    };
  }
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/reactioncommerce:reaction-paypal/server/paypal.coffee.js                                              //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var Fiber, Future, PayPal;

PayPal = Npm.require("paypal-rest-sdk");

Fiber = Npm.require("fibers");

Future = Npm.require("fibers/future");

Meteor.methods({
  paypalSubmit: function(transactionType, cardData, paymentData) {
    var fut, paymentObj;
    PayPal.configure(Meteor.Paypal.accountOptions());
    paymentObj = Meteor.Paypal.paymentObj();
    paymentObj.intent = transactionType;
    paymentObj.payer.funding_instruments.push(Meteor.Paypal.parseCardData(cardData));
    paymentObj.transactions.push(Meteor.Paypal.parsePaymentData(paymentData));
    fut = new Future();
    this.unblock();
    PayPal.payment.create(paymentObj, Meteor.bindEnvironment(function(err, payment) {
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
    }, function(e) {
      ReactionCore.Events.warn(e);
    }));
    return fut.wait();
  },
  paypalCapture: function(transactionId, captureDetails) {
    var fut;
    PayPal.configure(Meteor.Paypal.accountOptions());
    fut = new Future();
    this.unblock();
    PayPal.authorization.capture(transactionId, captureDetails, function(error, capture) {
      if (error) {
        fut["return"]({
          saved: false,
          error: error
        });
      } else {
        fut["return"]({
          saved: true,
          capture: capture
        });
      }
    });
    return fut.wait();
  }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['reactioncommerce:reaction-paypal'] = {};

})();

//# sourceMappingURL=reactioncommerce_reaction-paypal.js.map
