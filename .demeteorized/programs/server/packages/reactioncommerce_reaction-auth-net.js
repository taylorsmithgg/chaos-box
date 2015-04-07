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

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                            //
// packages/reactioncommerce:reaction-auth-net/server/register.coffee.js                                      //
//                                                                                                            //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                              //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
ReactionCore.registerPackage({
  name: 'reaction-auth-net',
  autoEnable: false,
  settings: {
    mode: false,
    client_id: "",
    client_secret: ""
  },
  registry: [
    {
      provides: 'dashboard',
      label: 'Authorize.net',
      description: "Accept Authorize.net Payments",
      icon: 'fa fa-credit-card',
      cycle: '4',
      container: 'dashboard'
    }, {
      route: 'authnet',
      provides: 'settings',
      container: 'dashboard'
    }, {
      template: 'authnetPaymentForm',
      provides: 'paymentMethod'
    }
  ],
  permissions: [
    {
      label: "Authorize.net",
      permission: "dashboard/payments",
      group: "Shop Settings"
    }
  ]
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                            //
// packages/reactioncommerce:reaction-auth-net/server/authnet.coffee.js                                       //
//                                                                                                            //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                              //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var AuthNet, Fiber, Future;

AuthNet = Npm.require("paynode").use("authorizenet");

Fiber = Npm.require("fibers");

Future = Npm.require("fibers/future");

Meteor.methods({
  authnetSubmit: function(transactionType, cardData, paymentData) {
    var client, fut, paymentObj;
    ReactionCore.Events.info("authnetSubmit: " + transactionType + cardData + paymentData);
    paymentObj = Meteor.AuthNet.paymentObj(cardData, paymentData);
    client = AuthNet.createClient(Meteor.AuthNet.accountOptions());
    fut = new Future();
    this.unblock();
    client.performAimTransaction(paymentObj).on("success", function(error, result) {
      ReactionCore.Events.info("Processed successfully.");
      fut["return"]({
        saved: true,
        response: result
      });
    }, function(e) {
      console.error(e);
    }).on("failure", function(error, result) {
      ReactionCore.Events.warn("Encountered an error");
      fut["return"]({
        saved: false,
        error: result.responsereasontext
      });
    }, function(e) {
      console.error(e);
    });
    return fut.wait();
  },
  authnetCapture: function(captureDetails) {
    var client, fut;
    ReactionCore.Events.info("Capture Info: " + transactionId + captureDetails);
    client = AuthNet.createClient(Meteor.AuthNet.accountOptions());
    fut = new Future();
    this.unblock();
    client.performAimTransaction(captureDetails).on("success", function(error, result) {
      ReactionCore.Events.info("Processed successfully.");
      fut["return"]({
        saved: true,
        response: result
      });
    }, function(e) {
      console.error(e);
    }).on("failure", function(error, result) {
      ReactionCore.Events.warn("Encountered an error");
      fut["return"]({
        saved: false,
        error: result.responsereasontext
      });
    }, function(e) {
      console.error(e);
    });
    return fut.wait();
  }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                            //
// packages/reactioncommerce:reaction-auth-net/common/routing.coffee.js                                       //
//                                                                                                            //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                              //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
Router.map(function() {
  return this.route('authnet', {
    controller: ShopAdminController,
    path: 'dashboard/settings/authnet',
    template: 'authnet',
    waitOn: function() {
      return ReactionCore.Subscriptions.Packages;
    }
  });
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                            //
// packages/reactioncommerce:reaction-auth-net/common/collections.coffee.js                                   //
//                                                                                                            //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                              //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;

/*
 *  Meteor.settings.authnet =
 *    mode: false  #sandbox
 *    client_id: ""
 *    client_secret: ""
 *  see: https://developer.authnet.com/webapps/developer/docs/api/
 *  see: https://github.com/authnet/rest-api-sdk-nodejs
 */
ReactionCore.Schemas.AuthNetPackageConfig = new SimpleSchema([
  ReactionCore.Schemas.PackageConfig, {
    "settings.mode": {
      type: Boolean,
      defaultValue: false
    },
    "settings.api_id": {
      type: String,
      label: "API Login ID",
      min: 60
    },
    "settings.transaction_key": {
      type: String,
      label: "Transaction Key",
      min: 60
    }
  }
]);

ReactionCore.Schemas.AuthNetPayment = new SimpleSchema({
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

ReactionCore.Schemas.AuthNetPayment.messages({
  "regEx payerName": "[label] must include both first and last name"
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                            //
// packages/reactioncommerce:reaction-auth-net/lib/authnet.coffee.js                                          //
//                                                                                                            //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                              //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
Meteor.AuthNet = {
  accountOptions: function() {
    var mode, options, settings;
    settings = ReactionCore.Collections.Packages.findOne({
      "name": "reaction-auth-net"
    }).settings;
    if ((settings != null ? settings.mode : void 0) === true) {
      mode = 'secure.authorize.net';
    } else {
      mode = 'test.authorize.net';
    }
    options = {
      level: mode,
      login: (settings != null ? settings.client_id : void 0) || Meteor.settings.authnet.client_id,
      tran_key: (settings != null ? settings.client_secret : void 0) || Meteor.settings.authnet.client_secret
    };
    return options;
  },
  authorize: function(cardData, paymentData, callback) {
    Meteor.call("authnetSubmit", "authorize", cardData, paymentData, callback);
  },
  capture: function(authCode, amount, callback) {
    var captureDetails;
    captureDetails = {
      x_type: "CAPTURE_ONLY",
      x_amount: amount,
      x_auth_code: authCode
    };
    Meteor.call("authnetCapture", captureDetails, callback);
  },
  config: function(options) {
    this.accountOptions = options;
  },
  paymentObj: function(cardData, paymentData) {
    return {
      x_type: "AUTH_ONLY",
      x_method: "CC",
      x_card_num: cardData.number,
      x_card_code: cardData.cvv2,
      x_exp_date: cardData.expire_date,
      x_amount: paymentData.total,
      x_first_name: cardData.first_name,
      x_last_name: cardData.last_name,
      x_currency_code: paymentData.currency
    };
  }
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['reactioncommerce:reaction-auth-net'] = {};

})();

//# sourceMappingURL=reactioncommerce_reaction-auth-net.js.map
