Package.describe({
  summary: "Reaction Paypal - PayPal payments for Reaction Commerce",
  name: "reactioncommerce:reaction-paypal",
  version: "0.1.4",
  git: "https://github.com/reactioncommerce/reaction-paypal.git"
});

Npm.depends({'paypal-rest-sdk': '1.2.2'});

Package.onUse(function (api, where) {
  api.versionsFrom('METEOR@1.0');
  api.use("meteor-platform@1.2.1");
  api.use("coffeescript");
  api.use("less");
  api.use("reactioncommerce:core@0.2.2");

  api.add_files([
    "common/register.coffee",
    "common/collections.coffee",
    "lib/paypal.coffee"
  ],["client","server"]);
  api.add_files("server/paypal.coffee",["server"]);
  api.add_files([
    "client/routing.coffee",
    "client/templates/paypal.html",
    "client/templates/paypal.less",
    "client/templates/paypal.coffee",
    "client/templates/cart/checkout/payment/methods/paypal/paypal.html",
    "client/templates/cart/checkout/payment/methods/paypal/paypal.less",
    "client/templates/cart/checkout/payment/methods/paypal/paypal.coffee"
  ],
  ["client"]);

});
