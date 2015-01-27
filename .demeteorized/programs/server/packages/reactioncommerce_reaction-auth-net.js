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

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                            //
// packages/reactioncommerce:reaction-auth-net/common/register.coffee.js                                      //
//                                                                                                            //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                              //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
ReactionCore.registerPackage({
  name: 'reaction-auth-net',
  provides: ['paymentMethod'],
  paymentTemplate: "authnetPaymentForm",
  label: 'AuthNet',
  description: 'Accept AuthNet',
  icon: 'fa fa-shopping-cart',
  settingsRoute: 'authnet',
  defaultSettings: {
    mode: false,
    client_id: "",
    client_secret: ""
  },
  priority: '2',
  hasWidget: true,
  shopPermissions: [
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
  authorize: function(cardInfo, paymentInfo, callback) {
    Meteor.call("authnetSubmit", "authorize", cardInfo, paymentInfo, callback);
  },
  capture: function(transactionId, amount, callback) {
    var captureDetails;
    console.log("Capture Info: " + transactionId + amount + callback);
    captureDetails = {
      amount: {
        currency: "USD",
        total: amount
      },
      is_final_capture: true
    };
    Meteor.call("authnetCapture", transactionId, captureDetails, callback);
  },
  config: function(options) {
    this.accountOptions = options;
  },
  paymentObj: function() {
    return {
      intent: "sale",
      payer: {
        payment_method: "CC",
        funding_instruments: []
      },
      transactions: []
    };
  },
  parseCardData: function(data) {
    console.log("Parsing card data:" + data);
    return {
      type: data.type,
      number: data.number,
      first_name: data.first_name,
      last_name: data.last_name,
      cvv2: data.cvv2,
      expire_month: data.expire_month,
      expire_year: data.expire_year
    };
  },
  parsePaymentData: function(data) {
    console.log("Parsing payment data: " + data.total + data.currency);
    return {
      amount: {
        total: data.total,
        currency: data.currency
      }
    };
  }
};
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
    console.log("authnetSubmit: " + transactionType + cardData + paymentData);
    paymentObj = Meteor.AuthNet.paymentObj();
    paymentObj.intent = transactionType;
    paymentObj.payer.funding_instruments.push(Meteor.AuthNet.parseCardData(cardData));
    paymentObj.transactions.push(Meteor.AuthNet.parsePaymentData(paymentData));
    console.log(paymentObj.transactions);
    client = AuthNet.createClient(Meteor.AuthNet.accountOptions());
    fut = new Future();
    this.unblock();
    client.performAimTransaction({
      x_type: "AUTH_CAPTURE",
      x_method: "CC",
      x_card_num: "4111111111111111",
      x_exp_date: "0115",
      x_amount: "19.99",
      x_description: "Sample Transaction",
      x_first_name: "John",
      x_last_name: "Doe",
      x_address: "1234 Street",
      x_state: "WA",
      x_zip: "98004"
    }).on("success", function(err, result) {
      console.log("Processed successfully.");
      fut["return"]({
        saved: true,
        result: result
      });
    }, function(e) {
      console.error(e);
    }).on("failure", function(err, result) {
      console.log("Encountered an error");
      fut["return"]({
        saved: false,
        error: result.responsereasontext
      });
    }, function(e) {
      console.error(e);
    });
    return fut.wait();
  },
  authnetCapture: function(transactionId, captureDetails) {
    var client, fut;
    console.log("Capture Info: " + transactionId, captureDetails);
    client = AuthNet.createClient({
      level: AuthNet.levels.sandbox,
      login: "2CxyF7b3njd",
      tran_key: "75Bm5295n53Rr5CA"
    });
    fut = new Future();
    this.unblock();
    AuthNet.authorization.capture(transactionId, captureDetails, function(error, capture) {
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
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['reactioncommerce:reaction-auth-net'] = {};

})();

//# sourceMappingURL=reactioncommerce_reaction-auth-net.js.map
