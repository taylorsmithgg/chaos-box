(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var Accounts = Package['accounts-base'].Accounts;
var HTTP = Package.http.HTTP;
var HTTPInternals = Package.http.HTTPInternals;
var _ = Package.underscore._;
var Blaze = Package.ui.Blaze;
var UI = Package.ui.UI;
var Handlebars = Package.ui.Handlebars;
var Email = Package.email.Email;
var check = Package.check.check;
var Match = Package.check.Match;
var ReactiveVar = Package['reactive-var'].ReactiveVar;
var d3 = Package['d3js:d3'].d3;
var _s = Package['mrt:underscore-string-latest']._s;
var GeoCoder = Package['aldeed:geocoder'].GeoCoder;
var Router = Package['iron:router'].Router;
var RouteController = Package['iron:router'].RouteController;
var getSlug = Package['ongoworks:speakingurl'].getSlug;
var logger = Package['ongoworks:bunyan-logger'].logger;
var Security = Package['ongoworks:security'].Security;
var Factory = Package['dburles:factory'].Factory;
var Fake = Package['anti:fake'].Fake;
var CollectionHooks = Package['matb33:collection-hooks'].CollectionHooks;
var Roles = Package['alanning:roles'].Roles;
var gm = Package['cfs:graphicsmagick'].gm;
var Template = Package['meteorhacks:ssr'].Template;
var SSR = Package['meteorhacks:ssr'].SSR;
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
var Spacebars = Package.spacebars.Spacebars;
var Random = Package.random.Random;
var EJSON = Package.ejson.EJSON;
var HTML = Package.htmljs.HTML;
var BrowserPolicy = Package['browser-policy-common'].BrowserPolicy;
var SimpleSchema = Package['aldeed:simple-schema'].SimpleSchema;
var MongoObject = Package['aldeed:simple-schema'].MongoObject;
var Iron = Package['iron:core'].Iron;
var FS = Package['cfs:base-package'].FS;

/* Package-scope variables */
var ReactionCore, ReactionRegistry, currentProduct, exports, Alerts, Schemas, __coffeescriptShare;

(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/reactioncommerce:core/lib/statemachine/state-machine.js                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/*                                                                                                                     // 1
                                                                                                                       // 2
  Javascript State Machine Library - https://github.com/jakesgordon/javascript-state-machine                           // 3
                                                                                                                       // 4
  Copyright (c) 2012, 2013, 2014, 2015, Jake Gordon and contributors                                                   // 5
  Released under the MIT license - https://github.com/jakesgordon/javascript-state-machine/blob/master/LICENSE         // 6
                                                                                                                       // 7
*/                                                                                                                     // 8
                                                                                                                       // 9
(function () {                                                                                                         // 10
                                                                                                                       // 11
  var StateMachine = {                                                                                                 // 12
                                                                                                                       // 13
    //---------------------------------------------------------------------------                                      // 14
                                                                                                                       // 15
    VERSION: "2.3.5",                                                                                                  // 16
                                                                                                                       // 17
    //---------------------------------------------------------------------------                                      // 18
                                                                                                                       // 19
    Result: {                                                                                                          // 20
      SUCCEEDED:    1, // the event transitioned successfully from one state to another                                // 21
      NOTRANSITION: 2, // the event was successfull but no state transition was necessary                              // 22
      CANCELLED:    3, // the event was cancelled by the caller in a beforeEvent callback                              // 23
      PENDING:      4  // the event is asynchronous and the caller is in control of when the transition occurs         // 24
    },                                                                                                                 // 25
                                                                                                                       // 26
    Error: {                                                                                                           // 27
      INVALID_TRANSITION: 100, // caller tried to fire an event that was innapropriate in the current state            // 28
      PENDING_TRANSITION: 200, // caller tried to fire an event while an async transition was still pending            // 29
      INVALID_CALLBACK:   300 // caller provided callback function threw an exception                                  // 30
    },                                                                                                                 // 31
                                                                                                                       // 32
    WILDCARD: '*',                                                                                                     // 33
    ASYNC: 'async',                                                                                                    // 34
                                                                                                                       // 35
    //---------------------------------------------------------------------------                                      // 36
                                                                                                                       // 37
    create: function(cfg, target) {                                                                                    // 38
                                                                                                                       // 39
      var initial      = (typeof cfg.initial == 'string') ? { state: cfg.initial } : cfg.initial; // allow for a simple string, or an object with { state: 'foo', event: 'setup', defer: true|false }
      var terminal     = cfg.terminal || cfg['final'];                                                                 // 41
      var fsm          = target || cfg.target  || {};                                                                  // 42
      var events       = cfg.events || [];                                                                             // 43
      var callbacks    = cfg.callbacks || {};                                                                          // 44
      var map          = {}; // track state transitions allowed for an event { event: { from: [ to ] } }               // 45
      var transitions  = {}; // track events allowed from a state            { state: [ event ] }                      // 46
                                                                                                                       // 47
      var add = function(e) {                                                                                          // 48
        var from = (e.from instanceof Array) ? e.from : (e.from ? [e.from] : [StateMachine.WILDCARD]); // allow 'wildcard' transition if 'from' is not specified
        map[e.name] = map[e.name] || {};                                                                               // 50
        for (var n = 0 ; n < from.length ; n++) {                                                                      // 51
          transitions[from[n]] = transitions[from[n]] || [];                                                           // 52
          transitions[from[n]].push(e.name);                                                                           // 53
                                                                                                                       // 54
          map[e.name][from[n]] = e.to || from[n]; // allow no-op transition if 'to' is not specified                   // 55
        }                                                                                                              // 56
      };                                                                                                               // 57
                                                                                                                       // 58
      if (initial) {                                                                                                   // 59
        initial.event = initial.event || 'startup';                                                                    // 60
        add({ name: initial.event, from: 'none', to: initial.state });                                                 // 61
      }                                                                                                                // 62
                                                                                                                       // 63
      for(var n = 0 ; n < events.length ; n++)                                                                         // 64
        add(events[n]);                                                                                                // 65
                                                                                                                       // 66
      for(var name in map) {                                                                                           // 67
        if (map.hasOwnProperty(name))                                                                                  // 68
          fsm[name] = StateMachine.buildEvent(name, map[name]);                                                        // 69
      }                                                                                                                // 70
                                                                                                                       // 71
      for(var name in callbacks) {                                                                                     // 72
        if (callbacks.hasOwnProperty(name))                                                                            // 73
          fsm[name] = callbacks[name]                                                                                  // 74
      }                                                                                                                // 75
                                                                                                                       // 76
      fsm.current     = 'none';                                                                                        // 77
      fsm.is          = function(state) { return (state instanceof Array) ? (state.indexOf(this.current) >= 0) : (this.current === state); };
      fsm.can         = function(event) { return !this.transition && (map[event].hasOwnProperty(this.current) || map[event].hasOwnProperty(StateMachine.WILDCARD)); }
      fsm.cannot      = function(event) { return !this.can(event); };                                                  // 80
      fsm.transitions = function()      { return transitions[this.current]; };                                         // 81
      fsm.isFinished  = function()      { return this.is(terminal); };                                                 // 82
      fsm.error       = cfg.error || function(name, from, to, args, error, msg, e) { throw e || msg; }; // default behavior when something unexpected happens is to throw an exception, but caller can override this behavior if desired (see github issue #3 and #17)
                                                                                                                       // 84
      if (initial && !initial.defer)                                                                                   // 85
        fsm[initial.event]();                                                                                          // 86
                                                                                                                       // 87
      return fsm;                                                                                                      // 88
                                                                                                                       // 89
    },                                                                                                                 // 90
                                                                                                                       // 91
    //===========================================================================                                      // 92
                                                                                                                       // 93
    doCallback: function(fsm, func, name, from, to, args) {                                                            // 94
      if (func) {                                                                                                      // 95
        try {                                                                                                          // 96
          return func.apply(fsm, [name, from, to].concat(args));                                                       // 97
        }                                                                                                              // 98
        catch(e) {                                                                                                     // 99
          return fsm.error(name, from, to, args, StateMachine.Error.INVALID_CALLBACK, "an exception occurred in a caller-provided callback function", e);
        }                                                                                                              // 101
      }                                                                                                                // 102
    },                                                                                                                 // 103
                                                                                                                       // 104
    beforeAnyEvent:  function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onbeforeevent'],                       name, from, to, args); },
    afterAnyEvent:   function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onafterevent'] || fsm['onevent'],      name, from, to, args); },
    leaveAnyState:   function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onleavestate'],                        name, from, to, args); },
    enterAnyState:   function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onenterstate'] || fsm['onstate'],      name, from, to, args); },
    changeState:     function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onchangestate'],                       name, from, to, args); },
                                                                                                                       // 110
    beforeThisEvent: function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onbefore' + name],                     name, from, to, args); },
    afterThisEvent:  function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onafter'  + name] || fsm['on' + name], name, from, to, args); },
    leaveThisState:  function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onleave'  + from],                     name, from, to, args); },
    enterThisState:  function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onenter'  + to]   || fsm['on' + to],   name, from, to, args); },
                                                                                                                       // 115
    beforeEvent: function(fsm, name, from, to, args) {                                                                 // 116
      if ((false === StateMachine.beforeThisEvent(fsm, name, from, to, args)) ||                                       // 117
          (false === StateMachine.beforeAnyEvent( fsm, name, from, to, args)))                                         // 118
        return false;                                                                                                  // 119
    },                                                                                                                 // 120
                                                                                                                       // 121
    afterEvent: function(fsm, name, from, to, args) {                                                                  // 122
      StateMachine.afterThisEvent(fsm, name, from, to, args);                                                          // 123
      StateMachine.afterAnyEvent( fsm, name, from, to, args);                                                          // 124
    },                                                                                                                 // 125
                                                                                                                       // 126
    leaveState: function(fsm, name, from, to, args) {                                                                  // 127
      var specific = StateMachine.leaveThisState(fsm, name, from, to, args),                                           // 128
          general  = StateMachine.leaveAnyState( fsm, name, from, to, args);                                           // 129
      if ((false === specific) || (false === general))                                                                 // 130
        return false;                                                                                                  // 131
      else if ((StateMachine.ASYNC === specific) || (StateMachine.ASYNC === general))                                  // 132
        return StateMachine.ASYNC;                                                                                     // 133
    },                                                                                                                 // 134
                                                                                                                       // 135
    enterState: function(fsm, name, from, to, args) {                                                                  // 136
      StateMachine.enterThisState(fsm, name, from, to, args);                                                          // 137
      StateMachine.enterAnyState( fsm, name, from, to, args);                                                          // 138
    },                                                                                                                 // 139
                                                                                                                       // 140
    //===========================================================================                                      // 141
                                                                                                                       // 142
    buildEvent: function(name, map) {                                                                                  // 143
      return function() {                                                                                              // 144
                                                                                                                       // 145
        var from  = this.current;                                                                                      // 146
        var to    = map[from] || map[StateMachine.WILDCARD] || from;                                                   // 147
        var args  = Array.prototype.slice.call(arguments); // turn arguments into pure array                           // 148
                                                                                                                       // 149
        if (this.transition)                                                                                           // 150
          return this.error(name, from, to, args, StateMachine.Error.PENDING_TRANSITION, "event " + name + " inappropriate because previous transition did not complete");
                                                                                                                       // 152
        if (this.cannot(name))                                                                                         // 153
          return this.error(name, from, to, args, StateMachine.Error.INVALID_TRANSITION, "event " + name + " inappropriate in current state " + this.current);
                                                                                                                       // 155
        if (false === StateMachine.beforeEvent(this, name, from, to, args))                                            // 156
          return StateMachine.Result.CANCELLED;                                                                        // 157
                                                                                                                       // 158
        if (from === to) {                                                                                             // 159
          StateMachine.afterEvent(this, name, from, to, args);                                                         // 160
          return StateMachine.Result.NOTRANSITION;                                                                     // 161
        }                                                                                                              // 162
                                                                                                                       // 163
        // prepare a transition method for use EITHER lower down, or by caller if they want an async transition (indicated by an ASYNC return value from leaveState)
        var fsm = this;                                                                                                // 165
        this.transition = function() {                                                                                 // 166
          fsm.transition = null; // this method should only ever be called once                                        // 167
          fsm.current = to;                                                                                            // 168
          StateMachine.enterState( fsm, name, from, to, args);                                                         // 169
          StateMachine.changeState(fsm, name, from, to, args);                                                         // 170
          StateMachine.afterEvent( fsm, name, from, to, args);                                                         // 171
          return StateMachine.Result.SUCCEEDED;                                                                        // 172
        };                                                                                                             // 173
        this.transition.cancel = function() { // provide a way for caller to cancel async transition if desired (issue #22)
          fsm.transition = null;                                                                                       // 175
          StateMachine.afterEvent(fsm, name, from, to, args);                                                          // 176
        }                                                                                                              // 177
                                                                                                                       // 178
        var leave = StateMachine.leaveState(this, name, from, to, args);                                               // 179
        if (false === leave) {                                                                                         // 180
          this.transition = null;                                                                                      // 181
          return StateMachine.Result.CANCELLED;                                                                        // 182
        }                                                                                                              // 183
        else if (StateMachine.ASYNC === leave) {                                                                       // 184
          return StateMachine.Result.PENDING;                                                                          // 185
        }                                                                                                              // 186
        else {                                                                                                         // 187
          if (this.transition) // need to check in case user manually called transition() but forgot to return StateMachine.ASYNC
            return this.transition();                                                                                  // 189
        }                                                                                                              // 190
                                                                                                                       // 191
      };                                                                                                               // 192
    }                                                                                                                  // 193
                                                                                                                       // 194
  }; // StateMachine                                                                                                   // 195
                                                                                                                       // 196
  //===========================================================================                                        // 197
                                                                                                                       // 198
  //======                                                                                                             // 199
  // NODE                                                                                                              // 200
  //======                                                                                                             // 201
  if (typeof exports !== 'undefined') {                                                                                // 202
    if (typeof module !== 'undefined' && module.exports) {                                                             // 203
      exports = module.exports = StateMachine;                                                                         // 204
    }                                                                                                                  // 205
    exports.StateMachine = StateMachine;                                                                               // 206
  }                                                                                                                    // 207
  //============                                                                                                       // 208
  // AMD/REQUIRE                                                                                                       // 209
  //============                                                                                                       // 210
  else if (typeof define === 'function' && define.amd) {                                                               // 211
    define(function(require) { return StateMachine; });                                                                // 212
  }                                                                                                                    // 213
  //========                                                                                                           // 214
  // BROWSER                                                                                                           // 215
  //========                                                                                                           // 216
  else if (typeof window !== 'undefined') {                                                                            // 217
    window.StateMachine = StateMachine;                                                                                // 218
  }                                                                                                                    // 219
  //===========                                                                                                        // 220
  // WEB WORKER                                                                                                        // 221
  //===========                                                                                                        // 222
  else if (typeof self !== 'undefined') {                                                                              // 223
    self.StateMachine = StateMachine;                                                                                  // 224
  }                                                                                                                    // 225
                                                                                                                       // 226
}());                                                                                                                  // 227
                                                                                                                       // 228
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/reactioncommerce:core/common/packageGlobals.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
// exported, global/window scope                                                                                       // 1
ReactionCore = {};                                                                                                     // 2
ReactionCore.Schemas = {};                                                                                             // 3
ReactionCore.Collections = {};                                                                                         // 4
ReactionCore.Helpers = {};                                                                                             // 5
ReactionCore.MetaData = {};                                                                                            // 6
ReactionCore.Locale = {};                                                                                              // 7
ReactionCore.Events = {};                                                                                              // 8
                                                                                                                       // 9
if (Meteor.isClient) {                                                                                                 // 10
  ReactionCore.Alerts = {};                                                                                            // 11
  ReactionCore.Subscriptions = {};                                                                                     // 12
}                                                                                                                      // 13
                                                                                                                       // 14
// convenience                                                                                                         // 15
Alerts = ReactionCore.Alerts;                                                                                          // 16
Schemas = ReactionCore.Schemas;                                                                                        // 17
                                                                                                                       // 18
// not exported to client (private)                                                                                    // 19
ReactionRegistry = {};                                                                                                 // 20
ReactionRegistry.Packages = {};                                                                                        // 21
                                                                                                                       // 22
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/reactioncommerce:core/common/common.coffee.js                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;

/*
 * Common settings for CollectionFS
 */
FS.HTTP.setBaseUrl('/assets');

FS.HTTP.setHeadersForGet([['Cache-Control', 'public, max-age=31536000']]);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/reactioncommerce:core/common/helpers.coffee.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
_.extend(ReactionCore, {
  shopIdAutoValue: function() {
    if (this.isSet && this.isFromTrustedCode) {
      return;
    }
    if (Meteor.isClient && this.isInsert) {
      return ReactionCore.getShopId() || "1";
    } else if (Meteor.isServer && (this.isInsert || this.isUpsert)) {
      return ReactionCore.getShopId();
    } else {
      this.unset();
    }
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/reactioncommerce:core/common/routing.coffee.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;

/*
 * Helper method to set default/parameterized product variant
 */
var ShopAdminController, ShopController, setProduct;

setProduct = function(productId, variantId) {
  var product;
  if (!productId.match(/^[A-Za-z0-9]{17}$/)) {
    product = Products.findOne({
      handle: productId.toLowerCase()
    });
    productId = product != null ? product._id : void 0;
  }
  setCurrentProduct(productId);
  setCurrentVariant(variantId);
};


/*
 *  Global Route Configuration
 *  Extend/override in reaction/client/routing.coffee
 */

Router.configure({
  notFoundTemplate: "notFound",
  loadingTemplate: "loading",
  onBeforeAction: function() {
    this.render("loading");
    Alerts.removeSeen();
    return this.next();
  }
});

Router.waitOn(function() {
  this.subscribe("shops");
  return this.subscribe("Packages");
});

this.ShopController = RouteController.extend({
  onAfterAction: function() {
    return ReactionCore.MetaData.refresh(this.route, this.params);
  },
  layoutTemplate: "layout",
  yieldTemplates: {
    layoutHeader: {
      to: "layoutHeader"
    },
    layoutFooter: {
      to: "layoutFooter"
    },
    dashboard: {
      to: "dashboard"
    }
  }
});

ShopController = this.ShopController;

this.ShopAdminController = this.ShopController.extend({
  layoutTemplate: "coreLayout",
  yieldTemplates: {
    layoutHeader: {
      to: "layoutHeader"
    },
    layoutFooter: {
      to: "layoutFooter"
    },
    dashboard: {
      to: "dashboard"
    }
  },
  onBeforeAction: function() {
    if (!(ReactionCore.hasPermission(this.route.getName()) && Meteor.userId())) {
      this.render('unauthorized');
    } else {
      this.next();
    }
  }
});

ShopAdminController = this.ShopAdminController;


/*
 * General Route Declarations
 */

Router.map(function() {
  this.route("products", {
    controller: ShopAdminController,
    path: "/products",
    name: "products",
    template: "products",
    waitOn: function() {
      return this.subscribe("products");
    }
  });
  this.route("index", {
    controller: ShopController,
    path: "/",
    name: "index",
    template: "index"
  });
  this.route('dashboard', {
    controller: ShopAdminController,
    template: 'dashboardPackages',
    onBeforeAction: function() {
      Session.set("dashboard", true);
      return this.next();
    }
  });
  this.route('dashboard/settings/shop', {
    controller: ShopAdminController,
    path: '/dashboard/settings/shop',
    template: 'shopSettings',
    data: function() {
      return Shops.findOne();
    }
  });
  this.route('dashboard/settings/account', {
    controller: ShopAdminController,
    path: '/dashboard/settings/account',
    template: 'shopAccounts'
  });
  this.route('dashboard/customers', {
    controller: ShopAdminController
  });
  this.route('dashboard/orders', {
    controller: ShopAdminController,
    path: 'dashboard/orders/',
    template: 'orders',
    data: function() {
      return Orders.find(this.params._id);
    }
  });
  this.route('product/tag', {
    controller: ShopAdminController,
    path: 'product/tag/:_id',
    template: "products",
    waitOn: function() {
      return this.subscribe("products");
    },
    subscriptions: function() {
      return this.subscribe("tags");
    },
    data: function() {
      var id;
      if (this.ready()) {
        id = this.params._id;
        if (id.match(/^[A-Za-z0-9]{17}$/)) {
          return {
            tag: Tags.findOne(id)
          };
        } else {
          return {
            tag: Tags.findOne({
              slug: id.toLowerCase()
            })
          };
        }
      }
    }
  });
  this.route('product', {
    controller: ShopAdminController,
    path: 'product/:_id/:variant?',
    template: 'productDetail',
    waitOn: function() {
      return this.subscribe('product', this.params._id);
    },
    onBeforeAction: function() {
      var variant;
      variant = this.params.variant || this.params.query.variant;
      setProduct(this.params._id, variant);
      return this.next();
    },
    data: function() {
      var product;
      product = selectedProduct();
      if (this.ready() && product) {
        if (!product.isVisible) {
          if (!ReactionCore.hasPermission(this.url)) {
            this.render('unauthorized');
          }
        }
        return product;
      }
      if (this.ready() && !product) {
        return this.render('notFound');
      }
    }
  });
  this.route('cartCheckout', {
    layoutTemplate: "layout",
    path: 'checkout',
    template: 'cartCheckout',
    yieldTemplates: {
      checkoutHeader: {
        to: "layoutHeader"
      }
    },
    waitOn: function() {
      return this.subscribe("Packages");
    },
    subscriptions: function() {
      this.subscribe("products");
      this.subscribe("shipping");
      return this.subscribe("accountOrders", Session.get("sessionId"), Meteor.userId());
    }
  });
  this.route('cartCompleted', {
    controller: ShopAdminController,
    path: 'completed/:_id',
    template: 'cartCompleted',
    subscriptions: function() {
      return this.subscribe("accountOrders", Session.get("sessionId"), Meteor.userId());
    },
    data: function() {
      if (this.ready()) {
        if (Orders.findOne(this.params._id)) {
          return ReactionCore.Collections.Orders.findOne({
            '_id': this.params._id
          });
        } else {
          return this.render('unauthorized');
        }
      } else {
        return this.render("loading");
      }
    }
  });
  return this.route('account/profile', {
    controller: ShopAdminController,
    path: 'account/profile',
    template: 'accountProfile',
    subscriptions: function() {
      return this.subscribe("accountOrders", Session.get("sessionId"), Meteor.userId());
    },
    data: function() {
      if (this.ready()) {
        if (Orders.findOne() || Meteor.userId()) {
          return ReactionCore.Collections.Orders.find({}, {
            sort: {
              createdAt: -1
            }
          });
        } else {
          return this.render('unauthorized');
        }
      } else {
        return this.render("loading");
      }
    }
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/reactioncommerce:core/common/schemas/packages.coffee.js                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;

/*
 * Packages
 */
ReactionCore.Schemas.PackageConfig = new SimpleSchema({
  shopId: {
    type: String,
    index: 1,
    autoValue: ReactionCore.shopIdAutoValue
  },
  name: {
    type: String,
    index: 1
  },
  enabled: {
    type: Boolean,
    defaultValue: true
  },
  settings: {
    type: Object,
    optional: true,
    blackbox: true
  },
  shopPermissions: {
    type: [Object],
    optional: true,
    blackbox: true
  },
  registry: {
    type: [Object],
    optional: true
  },
  'registry.$.provides': {
    type: String
  },
  'registry.$.route': {
    type: String,
    optional: true
  },
  'registry.$.template': {
    type: String,
    optional: true
  },
  'registry.$.description': {
    type: String,
    optional: true
  },
  'registry.$.icon': {
    type: String,
    optional: true
  },
  'registry.$.label': {
    type: String,
    optional: true
  },
  'registry.$.container': {
    type: String,
    optional: true
  },
  'registry.$.cycle': {
    type: Number,
    optional: true
  },
  'registry.$.enabled': {
    type: Boolean,
    optional: true
  }
});


/*
 * Core Reaction Settings
 */

ReactionCore.Schemas.CorePackageConfig = new SimpleSchema([
  ReactionCore.Schemas.PackageConfig, {
    "settings.mail": {
      type: Object,
      optional: true,
      label: "Mail Settings"
    },
    "settings.mail.user": {
      type: String,
      label: "Username"
    },
    "settings.mail.password": {
      type: String,
      label: "Password"
    },
    "settings.mail.host": {
      type: String,
      label: "Host"
    },
    "settings.mail.port": {
      type: String,
      label: "Port"
    },
    "settings.public": {
      type: Object,
      optional: true
    },
    "settings.public.allowGuestCheckout": {
      type: Boolean,
      label: "Allow Guest Checkout"
    }
  }
]);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/reactioncommerce:core/common/schemas/accounts.coffee.js                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;

/*
 * Emails
 */
ReactionCore.Schemas.Email = new SimpleSchema({
  address: {
    type: String,
    regEx: SimpleSchema.RegEx.Email
  },
  verified: {
    type: Boolean,
    defaultValue: false
  }
});


/*
 * AddressBook
 */

ReactionCore.Schemas.Address = new SimpleSchema({
  _id: {
    type: String,
    defaultValue: Random.id(),
    optional: true
  },
  fullName: {
    type: String,
    label: 'Full name'
  },
  address1: {
    label: "Address 1",
    type: String
  },
  address2: {
    label: "Address 2",
    type: String,
    optional: true
  },
  city: {
    type: String,
    label: "City"
  },
  company: {
    type: String,
    label: "Company",
    optional: true
  },
  phone: {
    type: String,
    label: "Phone"
  },
  region: {
    label: "State/Province/Region",
    type: String
  },
  postal: {
    label: "ZIP/Postal Code",
    type: String
  },
  country: {
    type: String,
    label: "Country"
  },
  isCommercial: {
    label: "This is a commercial address.",
    type: Boolean
  },
  isBillingDefault: {
    label: "Make this your default billing address?",
    type: Boolean
  },
  isShippingDefault: {
    label: "Make this your default shipping address?",
    type: Boolean
  },
  metafields: {
    type: [ReactionCore.Schemas.Metafield],
    optional: true
  }
});


/*
 * Accounts
 */

ReactionCore.Schemas.Accounts = new SimpleSchema({
  userId: {
    type: String,
    optional: true,
    regEx: SimpleSchema.RegEx.Id
  },
  sessions: {
    type: [String],
    optional: true,
    index: 1
  },
  shopId: {
    type: String,
    autoValue: ReactionCore.shopIdAutoValue,
    regEx: SimpleSchema.RegEx.Id
  },
  emails: {
    type: [ReactionCore.Schemas.Email],
    optional: true
  },
  acceptsMarketing: {
    type: Boolean,
    defaultValue: false,
    optional: true
  },
  state: {
    type: String,
    defaultValue: "new",
    optional: true
  },
  note: {
    type: String,
    optional: true
  },
  profile: {
    type: Object,
    optional: true
  },
  'profile.addressBook': {
    type: [ReactionCore.Schemas.Address],
    optional: true
  },
  metafields: {
    type: [ReactionCore.Schemas.Metafield],
    optional: true
  },
  createdAt: {
    type: Date,
    autoValue: function() {
      if (this.isInsert) {
        return new Date;
      } else if (this.isUpsert) {
        return {
          $setOnInsert: new Date
        };
      }
    }
  },
  updatedAt: {
    type: Date,
    autoValue: function() {
      if (this.isUpdate) {
        return {
          $set: new Date
        };
      } else if (this.isUpsert) {
        return {
          $setOnInsert: new Date
        };
      }
    },
    optional: true
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/reactioncommerce:core/common/schemas/shops.coffee.js                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;

/*
 * Shops
 */
ReactionCore.Schemas.ShopMember = new SimpleSchema({
  userId: {
    type: String
  },
  isAdmin: {
    type: Boolean,
    optional: true
  },
  permissions: {
    type: [String],
    optional: true
  }
});

ReactionCore.Schemas.CustomEmailSettings = new SimpleSchema({
  username: {
    type: String,
    optional: true
  },
  password: {
    type: String,
    optional: true
  },
  host: {
    type: String,
    optional: true
  },
  port: {
    type: Number,
    allowedValues: [25, 587, 465, 475, 2525],
    optional: true
  }
});

ReactionCore.Schemas.Metafield = new SimpleSchema({
  key: {
    type: String,
    max: 30,
    optional: true
  },
  namespace: {
    type: String,
    max: 20,
    optional: true
  },
  scope: {
    type: String,
    optional: true
  },
  value: {
    type: String,
    optional: true
  },
  valueType: {
    type: String,
    optional: true
  },
  description: {
    type: String,
    optional: true
  }
});

ReactionCore.Schemas.Currency = new SimpleSchema({
  symbol: {
    type: String,
    defaultValue: "$"
  },
  format: {
    type: String,
    defaultValue: "%s%v"
  },
  precision: {
    type: String,
    defaultValue: "0",
    optional: true
  },
  decimal: {
    type: String,
    defaultValue: ".",
    optional: true
  },
  thousand: {
    type: String,
    defaultValue: ",",
    optional: true
  }
});

ReactionCore.Schemas.Country = new SimpleSchema({
  name: {
    type: String
  },
  code: {
    type: String
  }
});

ReactionCore.Schemas.Shop = new SimpleSchema({
  _id: {
    type: String,
    optional: true
  },
  name: {
    type: String,
    index: 1
  },
  description: {
    type: String,
    optional: true
  },
  keywords: {
    type: String,
    optional: true
  },
  addressBook: {
    type: [ReactionCore.Schemas.Address]
  },
  domains: {
    type: [String],
    defaultValue: ["localhost"]
  },
  emails: {
    type: [ReactionCore.Schemas.Email],
    optional: true
  },
  currency: {
    type: String,
    defaultValue: "USD"
  },
  currencies: {
    type: [ReactionCore.Schemas.Currency]
  },
  "public": {
    type: String,
    optional: true
  },
  timezone: {
    type: String
  },
  baseUOM: {
    type: String,
    optional: true,
    defaultValue: "OZ",
    label: "Base Unit of Measure"
  },
  allowGuestCheckout: {
    type: Boolean,
    defaultValue: false
  },
  ownerId: {
    type: String
  },
  members: {
    type: [ReactionCore.Schemas.ShopMember],
    index: 1
  },
  metafields: {
    type: [ReactionCore.Schemas.Metafield],
    optional: true
  },
  createdAt: {
    type: Date
  },
  updatedAt: {
    type: Date,
    autoValue: function() {
      if (this.isUpdate) {
        return new Date();
      }
    },
    optional: true
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/reactioncommerce:core/common/schemas/shipping.coffee.js                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
ReactionCore.Schemas.ShipmentQuote = new SimpleSchema({
  carrier: {
    type: String
  },
  method: {
    type: ReactionCore.Schemas.ShippingMethod
  },
  rate: {
    type: Number,
    decimal: true,
    defaultValue: "0.00"
  },
  tracking: {
    type: String,
    optional: true
  }
});

ReactionCore.Schemas.Shipment = new SimpleSchema({
  address: {
    type: ReactionCore.Schemas.Address,
    label: "Destination",
    optional: true
  },
  shipmentMethod: {
    type: ReactionCore.Schemas.ShipmentQuote,
    label: "Selected Rate",
    optional: true
  },
  shipmentQuotes: {
    type: [ReactionCore.Schemas.ShipmentQuote],
    label: "Rate Quotes",
    optional: true
  }
});

ReactionCore.Schemas.ShippingProvider = new SimpleSchema({
  name: {
    type: String,
    label: "Service Code"
  },
  label: {
    type: String,
    label: "Public Label"
  },
  enabled: {
    type: Boolean,
    defaultValue: true
  },
  serviceAuth: {
    type: String,
    label: "Auth",
    optional: true
  },
  serviceSecret: {
    type: String,
    label: "Secret",
    optional: true
  },
  serviceUrl: {
    type: String,
    label: "Service URL",
    optional: true
  }
});

ReactionCore.Schemas.ShippingParcel = new SimpleSchema({
  containers: {
    type: String,
    optional: true
  },
  length: {
    type: Number,
    optional: true
  },
  width: {
    type: Number,
    optional: true
  },
  height: {
    type: Number,
    optional: true
  },
  weight: {
    type: Number,
    optional: true
  }
});

ReactionCore.Schemas.ShippingMethod = new SimpleSchema({
  name: {
    type: String,
    label: "Method Code"
  },
  label: {
    type: String,
    label: "Public Label"
  },
  group: {
    type: String,
    label: "Group"
  },
  cost: {
    type: Number,
    label: "Cost",
    decimal: true,
    optional: true
  },
  handling: {
    type: Number,
    label: "Handling",
    optional: true,
    decimal: true,
    defaultValue: 0,
    min: 0
  },
  rate: {
    type: Number,
    label: "Rate",
    decimal: true,
    min: 0
  },
  enabled: {
    type: Boolean,
    label: "Enabled",
    defaultValue: true
  },
  validRanges: {
    type: Array,
    optional: true,
    label: "Matching Cart Ranges"
  },
  'validRanges.$': {
    type: Object,
    optional: true
  },
  'validRanges.$.begin': {
    type: Number,
    decimal: true,
    label: "Begin",
    optional: true
  },
  'validRanges.$.end': {
    type: Number,
    decimal: true,
    label: "End",
    optional: true
  },
  validLocales: {
    type: Array,
    optional: true,
    label: "Matching Locales"
  },
  'validLocales.$': {
    type: Object,
    optional: true
  },
  'validLocales.$.origination': {
    type: String,
    label: "From",
    optional: true
  },
  'validLocales.$.destination': {
    type: String,
    label: "To",
    optional: true
  },
  'validLocales.$.deliveryBegin': {
    type: Number,
    label: "Shipping Est.",
    optional: true
  },
  'validLocales.$.deliveryEnd': {
    type: Number,
    label: "Delivery Est.",
    optional: true
  }
});

ReactionCore.Schemas.Shipping = new SimpleSchema({
  shopId: {
    type: String,
    index: 1,
    autoValue: ReactionCore.shopIdAutoValue
  },
  provider: {
    type: ReactionCore.Schemas.ShippingProvider
  },
  methods: {
    type: [ReactionCore.Schemas.ShippingMethod],
    optional: true
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/reactioncommerce:core/common/schemas/products.coffee.js                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;

/*
 * Products
 */
ReactionCore.Schemas.VariantMedia = new SimpleSchema({
  mediaId: {
    type: String,
    optional: true
  },
  priority: {
    type: Number,
    optional: true
  },
  metafields: {
    type: [ReactionCore.Schemas.Metafield],
    optional: true
  },
  updatedAt: {
    type: Date,
    optional: true
  },
  createdAt: {
    type: Date
  }
});

ReactionCore.Schemas.ProductPosition = new SimpleSchema({
  tag: {
    type: String,
    optional: true
  },
  position: {
    type: Number,
    optional: true
  },
  weight: {
    type: Number,
    optional: true
  },
  updatedAt: {
    type: Date
  }
});

ReactionCore.Schemas.ProductVariant = new SimpleSchema({
  _id: {
    type: String
  },
  parentId: {
    type: String,
    optional: true
  },
  cloneId: {
    type: String,
    optional: true
  },
  index: {
    type: String,
    optional: true
  },
  barcode: {
    label: "Barcode",
    type: String,
    optional: true
  },
  compareAtPrice: {
    label: "MSRP",
    type: Number,
    optional: true,
    decimal: true,
    min: 0
  },
  fulfillmentService: {
    label: "Fulfillment service",
    type: String,
    optional: true
  },
  weight: {
    label: "Weight",
    type: Number,
    min: 0
  },
  inventoryManagement: {
    type: Boolean,
    label: "Inventory Tracking"
  },
  inventoryPolicy: {
    type: Boolean,
    label: "Deny when out of stock"
  },
  lowInventoryWarningThreshold: {
    type: Number,
    label: "Warn @",
    min: 0,
    optional: true
  },
  inventoryQuantity: {
    type: Number,
    label: "Quantity",
    optional: true,
    custom: function() {
      if (Meteor.isClient) {
        if (checkChildVariants(this.docId) === 0 && !this.value) {
          return "required";
        }
      }
    }
  },
  price: {
    label: "Price",
    type: Number,
    decimal: true,
    min: 0,
    optional: true,
    custom: function() {
      if (Meteor.isClient) {
        if (checkChildVariants(this.docId) === 0 && !this.value) {
          return "required";
        }
      }
    }
  },
  sku: {
    label: "SKU",
    type: String,
    optional: true
  },
  taxable: {
    label: "Taxable",
    type: Boolean,
    optional: true
  },
  title: {
    label: "Label",
    type: String
  },
  optionTitle: {
    label: "Option",
    type: String,
    optional: true
  },
  metafields: {
    type: [ReactionCore.Schemas.Metafield],
    optional: true
  },
  createdAt: {
    label: "Created at",
    type: Date,
    optional: true
  },
  updatedAt: {
    label: "Updated at",
    type: Date,
    optional: true
  }
});

ReactionCore.Schemas.Product = new SimpleSchema({
  _id: {
    type: String,
    optional: true
  },
  cloneId: {
    type: String,
    optional: true
  },
  shopId: {
    type: String,
    autoValue: ReactionCore.shopIdAutoValue
  },
  title: {
    type: String
  },
  pageTitle: {
    type: String,
    optional: true
  },
  description: {
    type: String,
    optional: true
  },
  productType: {
    type: String
  },
  vendor: {
    type: String,
    optional: true
  },
  positions: {
    type: [ReactionCore.Schemas.ProductPosition],
    optional: true
  },
  metafields: {
    type: [ReactionCore.Schemas.Metafield],
    optional: true
  },
  positions: {
    type: [ReactionCore.Schemas.ProductPosition],
    optional: true
  },
  variants: {
    type: [ReactionCore.Schemas.ProductVariant]
  },
  requiresShipping: {
    label: "Require a shipping address",
    type: Boolean,
    defaultValue: true,
    optional: true
  },
  parcel: {
    type: ReactionCore.Schemas.ShippingParcel,
    optional: true
  },
  hashtags: {
    type: [String],
    optional: true,
    index: 1
  },
  twitterMsg: {
    type: String,
    optional: true,
    max: 140
  },
  facebookMsg: {
    type: String,
    optional: true,
    max: 255
  },
  googleplusMsg: {
    type: String,
    optional: true,
    max: 255
  },
  pinterestMsg: {
    type: String,
    optional: true,
    max: 255
  },
  metaDescription: {
    type: String,
    optional: true
  },
  handle: {
    type: String,
    optional: true,
    index: 1
  },
  isVisible: {
    type: Boolean,
    index: 1
  },
  publishedAt: {
    type: Date,
    optional: true
  },
  publishedScope: {
    type: String,
    optional: true
  },
  templateSuffix: {
    type: String,
    optional: true
  },
  createdAt: {
    type: Date
  },
  updatedAt: {
    type: Date,
    autoValue: function() {
      if (this.isUpdate) {
        return new Date();
      }
    },
    optional: true
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/reactioncommerce:core/common/schemas/tags.coffee.js                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;

/*
 * Tags
 */
ReactionCore.Schemas.Tag = new SimpleSchema({
  name: {
    type: String,
    index: 1
  },
  slug: {
    type: String
  },
  position: {
    type: Number,
    optional: true
  },
  relatedTagIds: {
    type: [String],
    optional: true,
    index: 1
  },
  isTopLevel: {
    type: Boolean
  },
  shopId: {
    type: String,
    index: 1,
    autoValue: ReactionCore.shopIdAutoValue
  },
  createdAt: {
    type: Date
  },
  updatedAt: {
    type: Date
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/reactioncommerce:core/common/schemas/cart.coffee.js                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;

/*
 * Carts
 */
ReactionCore.Schemas.CartItem = new SimpleSchema({
  _id: {
    type: String
  },
  productId: {
    type: String
  },
  shopId: {
    type: String,
    autoValue: ReactionCore.shopIdAutoValue
  },
  quantity: {
    label: "Quantity",
    type: Number,
    min: 0
  },
  variants: {
    type: ReactionCore.Schemas.ProductVariant
  }
});

ReactionCore.Schemas.Cart = new SimpleSchema({
  shopId: {
    type: String,
    index: 1,
    autoValue: ReactionCore.shopIdAutoValue,
    index: 1
  },
  userId: {
    type: String,
    optional: true,
    index: 1
  },
  sessions: {
    type: [String],
    optional: true,
    index: 1
  },
  email: {
    type: String,
    optional: true,
    index: 1,
    regEx: SimpleSchema.RegEx.Email
  },
  items: {
    type: [ReactionCore.Schemas.CartItem],
    optional: true
  },
  requiresShipping: {
    label: "Require a shipping address",
    type: Boolean,
    defaultValue: true,
    optional: true
  },
  shipping: {
    type: ReactionCore.Schemas.Shipment,
    optional: true,
    blackbox: true
  },
  payment: {
    type: ReactionCore.Schemas.Payment,
    optional: true,
    blackbox: true
  },
  totalPrice: {
    label: "Total Price",
    type: Number,
    optional: true,
    decimal: true,
    min: 0
  },
  state: {
    type: String,
    defaultValue: "new",
    optional: true
  },
  createdAt: {
    type: Date,
    autoValue: function() {
      if (this.isInsert) {
        return new Date;
      } else if (this.isUpsert) {
        return {
          $setOnInsert: new Date
        };
      }
    },
    denyUpdate: true
  },
  updatedAt: {
    type: Date,
    autoValue: function() {
      if (this.isUpdate) {
        return {
          $set: new Date
        };
      } else if (this.isUpsert) {
        return {
          $setOnInsert: new Date
        };
      }
    },
    optional: true
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/reactioncommerce:core/common/schemas/orders.coffee.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;

/*
 * Payments Schema
 */
ReactionCore.Schemas.PaymentMethod = new SimpleSchema({
  processor: {
    type: String
  },
  storedCard: {
    type: String,
    optional: true
  },
  method: {
    type: String,
    optional: true
  },
  transactionId: {
    type: String
  },
  status: {
    type: String,
    allowedValues: ["created", "approved", "failed", "canceled", "expired", "pending", "voided", "settled"]
  },
  mode: {
    type: String,
    allowedValues: ["authorize", 'capture', 'refund', 'void']
  },
  createdAt: {
    type: Date,
    optional: true
  },
  updatedAt: {
    type: Date,
    optional: true
  },
  authorization: {
    type: String,
    optional: true
  },
  amount: {
    type: Number,
    decimal: true
  },
  transactions: {
    type: [Object],
    optional: true,
    blackbox: true
  }
});

ReactionCore.Schemas.Invoice = new SimpleSchema({
  transaction: {
    type: String,
    optional: true
  },
  shipping: {
    type: Number,
    decimal: true,
    optional: true
  },
  taxes: {
    type: Number,
    decimal: true,
    optional: true
  },
  subtotal: {
    type: Number,
    decimal: true
  },
  discounts: {
    type: Number,
    decimal: true,
    optional: true
  },
  total: {
    type: Number,
    decimal: true
  }
});

ReactionCore.Schemas.Payment = new SimpleSchema({
  address: {
    type: ReactionCore.Schemas.Address,
    optional: true
  },
  paymentMethod: {
    type: [ReactionCore.Schemas.PaymentMethod],
    optional: true
  },
  invoices: {
    type: [ReactionCore.Schemas.Invoice],
    optional: true
  }
});


/*
 * Orders
 */

ReactionCore.Schemas.Document = new SimpleSchema({
  docId: {
    type: String
  },
  docType: {
    type: String,
    optional: true
  }
});

ReactionCore.Schemas.History = new SimpleSchema({
  event: {
    type: String
  },
  userId: {
    type: String
  },
  updatedAt: {
    type: Date
  }
});


/*
 * ReactionCore.Schemas.OrderItems
 * merges with ReactionCore.Schemas.Cart, ReactionCore.Schemas.OrderItems]
 * to create Orders collection
 */

ReactionCore.Schemas.OrderItems = new SimpleSchema({
  additionalField: {
    type: String,
    optional: true
  },
  status: {
    type: String
  },
  history: {
    type: [ReactionCore.Schemas.History],
    optional: true
  },
  documents: {
    type: [ReactionCore.Schemas.Document],
    optional: true
  }
});

ReactionCore.Schemas.Order = new SimpleSchema({
  cartId: {
    type: String,
    optional: true
  },
  history: {
    type: [ReactionCore.Schemas.History],
    optional: true
  },
  documents: {
    type: [ReactionCore.Schemas.Document],
    optional: true
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/reactioncommerce:core/common/schemas/translations.coffee.js                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
ReactionCore.Collections.Translations = new Mongo.Collection("Translations");
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/reactioncommerce:core/common/schemas/taxes.coffee.js                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
ReactionCore.Schemas.TaxRates = new SimpleSchema({
  country: {
    type: String
  },
  county: {
    type: String,
    optional: true
  },
  rate: {
    type: Number
  }
});

ReactionCore.Schemas.Taxes = new SimpleSchema({
  shopId: {
    type: String,
    autoValue: ReactionCore.shopIdAutoValue
  },
  cartMethod: {
    label: "Calculation Method",
    type: String,
    allowedValues: ['unit', 'row', 'total']
  },
  taxLocale: {
    label: "Taxation Location",
    type: String,
    allowedValues: ['shipping', 'billing', 'origination', 'destination']
  },
  taxShipping: {
    label: "Tax Shipping",
    type: Boolean,
    defaultValue: false
  },
  taxIncluded: {
    label: "Taxes included in product prices",
    type: Boolean,
    defaultValue: false
  },
  discountsIncluded: {
    label: "Tax before discounts",
    type: Boolean,
    defaultValue: false
  },
  rates: {
    label: "Tax Rate",
    type: [ReactionCore.Schemas.TaxRates]
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/reactioncommerce:core/common/schemas/discounts.coffee.js                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
ReactionCore.Schemas.DiscountType = new SimpleSchema({
  percentage: {
    type: Number,
    optional: true,
    label: "Percentage"
  },
  fixed: {
    type: Number,
    optional: true,
    label: "Price Discount"
  },
  shipping: {
    type: Boolean,
    label: "Free Shipping",
    optional: true
  }
});

ReactionCore.Schemas.DiscountRules = new SimpleSchema({
  validUses: {
    type: Number,
    optional: true
  },
  products: {
    type: [String],
    optional: true
  },
  codes: {
    type: [String],
    optional: true
  },
  range: {
    type: [Object],
    optional: true
  },
  'range.$.begin': {
    type: Number,
    optional: true
  },
  'range.$.end': {
    type: Number,
    optional: true
  }
});

ReactionCore.Schemas.Discounts = new SimpleSchema({
  shopId: {
    type: String,
    autoValue: ReactionCore.shopIdAutoValue
  },
  beginDate: {
    type: Date,
    optional: true
  },
  endDate: {
    type: Date,
    optional: true
  },
  discount: {
    type: ReactionCore.Schemas.DiscountType
  },
  rules: {
    type: ReactionCore.Schemas.DiscountRules
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/reactioncommerce:core/common/collections/collections.coffee.js                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;

/*
 * Cart
 *
 * methods to return cart calculated values
 * cartCount, cartSubTotal, cartShipping, cartTaxes, cartTotal
 * are calculated by a transformation on the collection
 * and are available to use in template as cart.xxx
 * in template: {{cart.cartCount}}
 * in code: ReactionCore.Collections.Cart.findOne().cartTotal()
 */
var Accounts, Cart, Orders, Products, Shops, Tags;

ReactionCore.Collections.Cart = Cart = this.Cart = new Mongo.Collection("Cart", {
  transform: function(cart) {
    cart.cartCount = function() {
      var count, items, _i, _len, _ref;
      count = 0;
      if (cart != null ? cart.items : void 0) {
        _ref = cart.items;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          items = _ref[_i];
          count += items.quantity;
        }
      }
      return count;
    };
    cart.cartShipping = function() {
      var shipping, shippingMethod, _i, _len, _ref, _ref1, _ref2, _ref3, _ref4, _ref5;
      shipping = 0;
      if (cart != null ? (_ref = cart.shipping) != null ? (_ref1 = _ref.shipmentMethod) != null ? _ref1.rate : void 0 : void 0 : void 0) {
        shipping = cart != null ? (_ref2 = cart.shipping) != null ? (_ref3 = _ref2.shipmentMethod) != null ? _ref3.rate : void 0 : void 0 : void 0;
      } else {
        if ((cart != null ? (_ref4 = cart.shipping) != null ? _ref4.shipmentMethod.length : void 0 : void 0) > 0) {
          _ref5 = cart.shipping.shipmentMethod;
          for (_i = 0, _len = _ref5.length; _i < _len; _i++) {
            shippingMethod = _ref5[_i];
            shipping += shippingMethod.rate;
          }
        }
      }
      return shipping;
    };
    cart.cartSubTotal = function() {
      var items, subtotal, _i, _len, _ref;
      subtotal = 0;
      if (cart != null ? cart.items : void 0) {
        _ref = cart.items;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          items = _ref[_i];
          subtotal += items.quantity * items.variants.price;
        }
      }
      subtotal = subtotal.toFixed(2);
      return subtotal;
    };
    cart.cartTaxes = function() {

      /*
       * TODO: lookup cart taxes, and apply rules here
       */
      return "0.00";
    };
    cart.cartDiscounts = function() {

      /*
       * TODO: lookup discounts, and apply rules here
       */
      return "0.00";
    };
    cart.cartTotal = function() {
      var items, shipping, shippingMethod, subtotal, total, _i, _j, _len, _len1, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6;
      subtotal = 0;
      if (cart != null ? cart.items : void 0) {
        _ref = cart.items;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          items = _ref[_i];
          subtotal += items.quantity * items.variants.price;
        }
      }
      shipping = 0;
      if (cart != null ? (_ref1 = cart.shipping) != null ? (_ref2 = _ref1.shipmentMethod) != null ? _ref2.rate : void 0 : void 0 : void 0) {
        shipping = cart != null ? (_ref3 = cart.shipping) != null ? (_ref4 = _ref3.shipmentMethod) != null ? _ref4.rate : void 0 : void 0 : void 0;
      } else {
        if ((cart != null ? (_ref5 = cart.shipping) != null ? _ref5.shipmentMethod.length : void 0 : void 0) > 0) {
          _ref6 = cart.shipping.shipmentMethod;
          for (_j = 0, _len1 = _ref6.length; _j < _len1; _j++) {
            shippingMethod = _ref6[_j];
            shipping += shippingMethod.rate;
          }
        }
      }
      shipping = parseFloat(shipping);
      if (!isNaN(shipping)) {
        subtotal = subtotal + shipping;
      }
      total = subtotal.toFixed(2);
      return total;
    };
    return cart;
  }
});

ReactionCore.Collections.Cart.attachSchema(ReactionCore.Schemas.Cart);

ReactionCore.Collections.Accounts = Accounts = this.Accounts = new Mongo.Collection("Accounts");

ReactionCore.Collections.Accounts.attachSchema(ReactionCore.Schemas.Accounts);

ReactionCore.Collections.Orders = Orders = this.Orders = new Mongo.Collection("Orders", {
  transform: function(order) {
    order.itemCount = function() {
      var count, items, _i, _len, _ref;
      count = 0;
      if (order != null ? order.items : void 0) {
        _ref = order.items;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          items = _ref[_i];
          count += items.quantity;
        }
      }
      return count;
    };
    return order;
  }
});

ReactionCore.Collections.Orders.attachSchema([ReactionCore.Schemas.Cart, ReactionCore.Schemas.Order, ReactionCore.Schemas.OrderItems]);

ReactionCore.Collections.Packages = new Mongo.Collection("Packages");

ReactionCore.Collections.Packages.attachSchema(ReactionCore.Schemas.PackageConfig);

ReactionCore.Collections.Products = Products = this.Products = new Mongo.Collection("Products");

ReactionCore.Collections.Products.attachSchema(ReactionCore.Schemas.Product);

ReactionCore.Collections.Shipping = new Mongo.Collection("Shipping");

ReactionCore.Collections.Shipping.attachSchema(ReactionCore.Schemas.Shipping);

ReactionCore.Collections.Taxes = new Mongo.Collection("Taxes");

ReactionCore.Collections.Taxes.attachSchema(ReactionCore.Schemas.Taxes);

ReactionCore.Collections.Discounts = new Mongo.Collection("Discounts");

ReactionCore.Collections.Discounts.attachSchema(ReactionCore.Schemas.Discounts);

ReactionCore.Collections.Shops = Shops = this.Shops = new Mongo.Collection("Shops", {
  transform: function(shop) {
    var index, member, _ref;
    _ref = shop.members;
    for (index in _ref) {
      member = _ref[index];
      member.index = index;
      member.user = Meteor.users.findOne(member.userId);
    }
    return shop;
  }
});

ReactionCore.Collections.Shops.attachSchema(ReactionCore.Schemas.Shop);

ReactionCore.Collections.Tags = Tags = this.Tags = new Mongo.Collection("Tags");

ReactionCore.Collections.Tags.attachSchema(ReactionCore.Schemas.Tag);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/reactioncommerce:core/common/collections/collectionFS.coffee.js                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;

/*
 * Define CollectionFS collection
 * See: https://github.com/CollectionFS/Meteor-CollectionFS
 */
ReactionCore.Collections.Media = new FS.Collection("media", {
  stores: [
    new FS.Store.GridFS("image"), new FS.Store.GridFS("large", {
      transformWrite: function(fileObj, readStream, writeStream) {
        if (gm.isAvailable) {
          gm(readStream, fileObj.name).resize("1000", "1000").stream().pipe(writeStream);
        } else {
          readStream.pipe(writeStream);
        }
      }
    }), new FS.Store.GridFS("medium", {
      transformWrite: function(fileObj, readStream, writeStream) {
        if (gm.isAvailable) {
          gm(readStream, fileObj.name).resize("600", "600").stream().pipe(writeStream);
        } else {
          readStream.pipe(writeStream);
        }
      }
    }), new FS.Store.GridFS("small", {
      transformWrite: function(fileObj, readStream, writeStream) {
        if (gm.isAvailable) {
          gm(readStream).resize("235", "235" + '^').gravity('Center').extent("235", "235").stream('PNG').pipe(writeStream);
        } else {
          readStream.pipe(writeStream);
        }
      }
    }), new FS.Store.GridFS("thumbnail", {
      transformWrite: function(fileObj, readStream, writeStream) {
        if (gm.isAvailable) {
          gm(readStream).resize("100", "100" + '^').gravity('Center').extent("100", "100").stream('PNG').pipe(writeStream);
        } else {
          readStream.pipe(writeStream);
        }
      }
    })
  ],
  filter: {
    allow: {
      contentTypes: ["image/*"]
    }
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/reactioncommerce:core/common/hooks/hooks.coffee.js                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var applyVariantDefaults;

applyVariantDefaults = function(variant) {
  return _.defaults(variant, {
    _id: Random.id(),
    inventoryManagement: true,
    inventoryPolicy: true,
    updatedAt: new Date(),
    createdAt: new Date()
  });
};

Products.before.insert(function(userId, product) {
  var variant, _i, _len, _ref, _results;
  product.shopId = product.shopId || ReactionCore.getCurrentShop()._id;
  _.defaults(product, {
    productType: "Simple",
    handle: getSlug(product.title),
    isVisible: false,
    updatedAt: new Date(),
    createdAt: new Date()
  });
  _ref = product.variants;
  _results = [];
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    variant = _ref[_i];
    _results.push(applyVariantDefaults(variant));
  }
  return _results;
});

Products.before.update(function(userId, product, fieldNames, modifier, options) {
  var addToSet, createdAt, parentVariant, position, qty, updatedAt, variant, _i, _len, _ref, _ref1, _ref2, _ref3, _ref4;
  ({
    updatedAt: new Date()
  });
  if (modifier.$push) {
    if (modifier.$push.variants) {
      applyVariantDefaults(modifier.$push.variants);
    }
  }
  if (((_ref = modifier.$set) != null ? (_ref1 = _ref['variants.$']) != null ? _ref1.inventoryQuantity : void 0 : void 0) >= 0) {
    qty = modifier.$set['variants.$'].inventoryQuantity || 0;
    _ref2 = product.variants;
    for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
      variant = _ref2[_i];
      if (variant._id !== modifier.$set['variants.$']._id && variant.parentId === modifier.$set['variants.$'].parentId) {
        qty += variant.inventoryQuantity || 0;
      }
    }
    parentVariant = ((function() {
      var _j, _len1, _ref3, _results;
      _ref3 = product.variants;
      _results = [];
      for (_j = 0, _len1 = _ref3.length; _j < _len1; _j++) {
        variant = _ref3[_j];
        if (variant._id === modifier.$set['variants.$'].parentId) {
          _results.push(variant);
        }
      }
      return _results;
    })())[0];
    if ((parentVariant != null ? parentVariant.inventoryQuantity : void 0) !== qty) {
      Products.direct.update({
        '_id': product._id,
        'variants._id': modifier.$set['variants.$'].parentId
      }, {
        $set: {
          'variants.$.inventoryQuantity': qty
        }
      });
    }
  }
  if (_.indexOf(fieldNames, 'positions') !== -1) {
    addToSet = (_ref3 = modifier.$addToSet) != null ? _ref3.positions : void 0;
    if (addToSet) {
      createdAt = new Date();
      updatedAt = new Date();
      if (addToSet.$each) {
        for (position in addToSet.$each) {
          createdAt = new Date();
          updatedAt = new Date();
        }
      } else {
        addToSet.updatedAt = updatedAt;
      }
    }
  }
  if (modifier.$set) {
    modifier.$set.updatedAt = new Date();
  }
  if ((_ref4 = modifier.$addToSet) != null ? _ref4.variants : void 0) {
    if (!modifier.$addToSet.variants.createdAt) {
      modifier.$addToSet.variants.createdAt = new Date();
    }
    if (!modifier.$addToSet.variants.updatedAt) {
      return modifier.$addToSet.variants.updatedAt = new Date();
    }
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/reactioncommerce:core/server/app.coffee.js                                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;

/*
 * configure bunyan logging module for reaction server
 * See: https://github.com/trentm/node-bunyan#levels
 */
var isDebug, levels;

isDebug = Meteor.settings.isDebug;

levels = ["FATAL", "ERROR", "WARN", "INFO", "DEBUG", "TRACE"];

if (isDebug === true || (process.env.NODE_ENV === "development" && isDebug !== false)) {
  if (typeof isDebug !== 'boolean' && typeof isDebug !== 'undefined') {
    isDebug = isDebug.toUpperCase();
  }
  if (!_.contains(levels, isDebug)) {
    isDebug = "WARN";
  }
}

ReactionCore.Events = logger.bunyan.createLogger({
  name: "core",
  serializers: logger.bunyan.stdSerializers,
  streams: [
    {
      level: "debug",
      stream: (isDebug !== "DEBUG" ? logger.bunyanPretty() : process.stdout)
    }
  ]
});

ReactionCore.Events.level(isDebug);


/*
 * Global reaction shop permissions methods
 */

_.extend(ReactionCore, {
  getCurrentShopCursor: function(client) {
    var cursor, domain;
    domain = this.getDomain(client);
    cursor = Shops.find({
      domains: domain
    }, {
      limit: 1
    });
    if (!cursor.count()) {
      ReactionCore.Events.info("Reaction Configuration: Add a domain entry to shops for: ", domain);
    }
    return cursor;
  },
  getCurrentShop: function(client) {
    var cursor;
    cursor = this.getCurrentShopCursor(client);
    return cursor.fetch()[0];
  },
  getShopId: function(client) {
    var _ref;
    return (_ref = this.getCurrentShop(client)) != null ? _ref._id : void 0;
  },
  getDomain: function(client) {
    return Meteor.absoluteUrl().split('/')[2].split(':')[0];
  },
  findMember: function(shop, userId) {
    if (!shop) {
      shop = this.getCurrentShop();
    }
    if (!userId) {
      userId = Meteor.userId();
    }
    return _.find(shop.members, function(member) {
      return userId === member.userId;
    });
  },
  hasPermission: function(permissions, shop, userId) {
    var has, member;
    if (!permissions) {
      return false;
    }
    if (!shop) {
      shop = this.getCurrentShop();
    }
    if (!userId) {
      userId = Meteor.userId();
    }
    if (!_.isArray(permissions)) {
      permissions = [permissions];
    }
    has = this.hasOwnerAccess(shop, userId);
    if (!has) {
      member = this.findMember(shop, userId);
      if (member) {
        has = member.isAdmin || _.intersection(permissions, member.permissions).length;
      }
    }
    return has;
  },
  hasOwnerAccess: function(shop, userId) {
    if (!shop) {
      shop = this.getCurrentShop();
    }
    if (!userId) {
      userId = Meteor.userId();
    }
    return Roles.userIsInRole(userId, "admin") || userId === shop.ownerId;
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/reactioncommerce:core/server/register.coffee.js                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
ReactionCore.registerPackage = function(packageInfo) {
  return ReactionRegistry.Packages[packageInfo.name] = packageInfo;
};

ReactionCore.registerPackage({
  name: 'core',
  autoEnable: true,
  settings: {
    "public": {
      allowGuestCheckout: false
    },
    mail: {
      user: "",
      password: "",
      host: "localhost",
      port: "25"
    }
  },
  registry: [
    {
      route: "dashboard",
      provides: 'dashboard',
      label: 'Core',
      description: 'Reaction Commerce Core',
      icon: 'fa fa-th',
      cycle: 1,
      container: "dashboard"
    }, {
      route: "dashboard",
      provides: 'shortcut',
      label: 'Dashboard',
      icon: 'fa fa-th',
      cycle: 1
    }, {
      route: "dashboard",
      label: 'Dashboard',
      provides: 'console'
    }, {
      route: "dashboard/settings/shop",
      provides: 'settings',
      icon: "fa fa-cog fa-2x fa-fw",
      container: 'dashboard'
    }, {
      route: "dashboard/orders",
      provides: 'dashboard',
      label: 'Orders',
      description: 'Fulfill your orders',
      icon: 'fa fa-sun-o',
      cycle: 3,
      container: "orders"
    }, {
      route: "dashboard/orders",
      provides: 'shortcut',
      label: 'Orders',
      description: 'Fulfill your orders',
      icon: 'fa fa-sun-o',
      cycle: 3
    }, {
      route: "dashboard/orders",
      label: 'Orders',
      provides: 'console'
    }, {
      template: "coreOrderWidgets",
      provides: 'widget'
    }, {
      route: 'createProduct',
      label: 'Create',
      icon: 'fa fa-plus',
      provides: 'shortcut'
    }, {
      route: 'dashboard/settings/account',
      label: 'Organization Users',
      description: 'Manage administrative access to shop.',
      icon: 'fa fa-users',
      provides: 'dashboard',
      cycle: 3
    }, {
      route: 'account/profile',
      label: 'Profile',
      icon: 'fa fa-info-circle',
      provides: 'userAccountDropdown'
    }
  ],
  permissions: [
    {
      label: "Customers",
      permission: "dashboard/customers",
      group: "Shop Management"
    }, {
      label: "Promotions",
      permission: "dashboard/promotions",
      group: "Shop Management"
    }, {
      label: "Products",
      permission: "dashboard/products",
      group: "Shop Content"
    }, {
      label: "Shop Settings",
      permission: "dashboard/settings",
      group: "Shop Settings"
    }, {
      label: "Dashboard Access",
      permission: "dashboard/settings/account",
      group: "Shop Settings"
    }, {
      label: "Orders",
      permission: "dashboard/orders",
      group: "Shop Management"
    }
  ]
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/reactioncommerce:core/server/security.coffee.js                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;

/*
 * The following security definitions use the ongoworks:security package.
 * Rules within a single chain stack with AND relationship. Multiple
 * chains for the same collection stack with OR relationship.
 * See https://github.com/ongoworks/meteor-security
 *
 * It's important to note that these security rules are for inserts,
 * updates, and removes initiated from untrusted (client) code.
 * Thus there may be other actions that certain roles are allowed to
 * take, but they do not necessarily need to be listed here if the
 * database operation is executed in a server method.
 */

/*
 * Assign to some local variables to keep code
 * short and sweet
 */
var Cart, Customers, Discounts, Media, Orders, Packages, Products, Shipping, Shops, Tags, Taxes, Translations;

Cart = ReactionCore.Collections.Cart;

Customers = ReactionCore.Collections.Customers;

Discounts = ReactionCore.Collections.Discounts;

Media = ReactionCore.Collections.Media;

Orders = ReactionCore.Collections.Orders;

Packages = ReactionCore.Collections.Packages;

Products = ReactionCore.Collections.Products;

Shipping = ReactionCore.Collections.Shipping;

Shops = ReactionCore.Collections.Shops;

Tags = ReactionCore.Collections.Tags;

Taxes = ReactionCore.Collections.Taxes;

Translations = ReactionCore.Collections.Translations;


/*
 * Define some additional rule chain methods
 */

Security.defineMethod('ifShopIdMatches', {
  fetch: [],
  deny: function(type, arg, userId, doc) {
    return doc.shopId !== ReactionCore.getShopId();
  }
});

Security.defineMethod('ifShopIdMatchesThisId', {
  fetch: [],
  deny: function(type, arg, userId, doc) {
    return doc._id !== ReactionCore.getShopId();
  }
});

Security.defineMethod('ifFileBelongsToShop', {
  fetch: [],
  deny: function(type, arg, userId, doc) {
    return doc.metadata.shopId !== ReactionCore.getShopId();
  }
});

Security.defineMethod('ifUserIdMatches', {
  fetch: [],
  deny: function(type, arg, userId, doc) {
    return (userId && doc.userId && doc.userId !== userId) || (doc.userId && !userId);
  }
});

Security.defineMethod('ifUserIdMatchesProp', {
  fetch: [],
  deny: function(type, arg, userId, doc) {
    return doc[arg] !== userId;
  }
});


/*
 * Define all security rules
 */


/*
 * Permissive security for users with the 'admin' role
 */

Security.permit(['insert', 'update', 'remove']).collections([Products, Tags, Translations, Discounts, Taxes, Shipping, Orders, Packages]).ifHasRole('admin').ifShopIdMatches().exceptProps(['shopId']).apply();


/*
 * Permissive security for users with the 'admin' role for FS.Collections
 */

Security.permit(['insert', 'update', 'remove']).collections([Media]).ifHasRole('admin').ifFileBelongsToShop().apply();


/*
 * Users with the 'admin' or 'owner' role may update and
 * remove their shop but may not insert one.
 */

Shops.permit(['update', 'remove']).ifHasRole(['admin', 'owner']).ifShopIdMatchesThisId().ifUserIdMatchesProp('ownerId').apply();


/*
 * Users with the 'owner' role may remove orders for their shop
 */

Orders.permit('remove').ifHasRole('owner').ifUserIdMatchesProp('ownerId').ifShopIdMatches().exceptProps(['shopId']).apply();


/*
 * Can update cart from client. Must insert/remove carts using
 * server methods.
 * Can update all session carts if not logged in or user cart if logged in as that user
 * XXX should verify session match, but doesn't seem possible? Might have to move all cart updates to server methods, too?
 */

Cart.permit('update').ifUserIdMatches().exceptProps(['shopId']).apply();

_.each([Media], function(fsCollection) {
  return fsCollection.allow({
    download: function() {
      return true;
    }
  });
});

BrowserPolicy.content.allowOriginForAll('*.bootstrapcdn.com');

BrowserPolicy.content.allowOriginForAll('*.googleapis.com');

BrowserPolicy.content.allowOriginForAll('*.fonts.gstatic.com');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/reactioncommerce:core/server/publications.coffee.js                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var Accounts, Cart, Discounts, Media, Orders, Packages, Products, Shipping, Shops, Tags, Taxes, Translations;

Cart = ReactionCore.Collections.Cart;

Accounts = ReactionCore.Collections.Accounts;

Discounts = ReactionCore.Collections.Discounts;

Media = ReactionCore.Collections.Media;

Orders = ReactionCore.Collections.Orders;

Packages = ReactionCore.Collections.Packages;

Products = ReactionCore.Collections.Products;

Shipping = ReactionCore.Collections.Shipping;

Shops = ReactionCore.Collections.Shops;

Tags = ReactionCore.Collections.Tags;

Taxes = ReactionCore.Collections.Taxes;

Translations = ReactionCore.Collections.Translations;


/*
 * Reaction Server / amplify permanent sessions
 * If no id is passed we create a new session
 * Load the session
 * If no session is loaded, creates a new one
 */

this.ServerSessions = new Mongo.Collection("Sessions");

Meteor.publish('Sessions', function(id) {
  var created, serverSession;
  check(id, Match.OneOf(String, null));
  created = new Date().getTime();
  if (!id) {
    id = ServerSessions.insert({
      created: created
    });
  }
  serverSession = ServerSessions.find(id);
  if (serverSession.count() === 0) {
    id = ServerSessions.insert({
      created: created
    });
    serverSession = ServerSessions.find(id);
  }
  return serverSession;
});


/*
 * CollectionFS - Image/Video Publication
 */

Meteor.publish("media", function() {
  return Media.find({
    'metadata.shopId': ReactionCore.getShopId(this)
  }, {
    sort: {
      "metadata.priority": 1
    }
  });
});


/*
 * i18n - translations
 */

Meteor.publish("Translations", function(sessionLanguage) {
  check(sessionLanguage, String);
  return Translations.find({
    $or: [
      {
        'i18n': 'en'
      }, {
        'i18n': sessionLanguage
      }
    ]
  });
});


/*
 * userProfile
 * get any user name,social profile image
 * should be limited, secure information
 */

Meteor.publish("UserProfile", function(profileId) {
  check(profileId, Match.OneOf(String, null));
  if (profileId != null) {
    if (Roles.userIsInRole(this.userId, ['dashboard/orders', 'owner', 'admin', 'dashboard/customers'])) {
      return Meteor.users.find({
        _id: profileId
      }, {
        fields: {
          profile: 1,
          emails: 1
        }
      });
    } else {
      ReactionCore.Events.info("user profile access denied");
      return [];
    }
  } else {
    ReactionCore.Events.info("profileId not defined. access denied");
    return [];
  }
});


/*
 *  Packages contains user specific configuration
 *  settings, package access rights
 */

Meteor.publish("Packages", function() {
  var shop;
  shop = ReactionCore.getCurrentShop(this);
  if (shop) {
    if (Roles.userIsInRole(this.userId, ['dashboard', 'owner', 'admin'])) {
      return Packages.find({
        shopId: shop._id
      });
    } else {
      return Packages.find({
        shopId: shop._id
      }, {
        fields: {
          name: true,
          enabled: true,
          registry: true,
          shopId: true,
          'settings.public': true
        }
      });
    }
  } else {
    return [];
  }
});


/*
 * shops
 */

Meteor.publish('shops', function() {
  return ReactionCore.getCurrentShopCursor(this);
});

Meteor.publish('shopMembers', function() {
  var handle, self;
  self = this;
  handle = ReactionCore.getCurrentShopCursor(self).observeChanges({
    added: function(id) {
      var memberIds, shop;
      shop = Shops.findOne(id);
      memberIds = _.pluck(shop.members, "userId");
      return Meteor.users.find({
        _id: {
          $in: memberIds
        }
      }, {
        fields: {
          emails: 1,
          profile: 1
        }
      }).forEach(function(user) {
        return self.added("users", user._id, user);
      });
    },
    changed: function(id) {
      var memberIds, shop;
      shop = Shops.findOne(id);
      memberIds = _.pluck(shop.members, "userId");
      return Meteor.users.find({
        _id: {
          $in: memberIds
        }
      }, {
        fields: {
          emails: 1,
          profile: 1
        }
      }).forEach(function(user) {
        return self.added("users", user._id, user);
      });
    }
  });
  self.ready();
  self.onStop(function() {
    return handle.stop();
  });
});


/*
 * products
 */

Meteor.publish('products', function(userId, shops) {
  var selector, shop;
  shop = ReactionCore.getCurrentShop(this);
  if (shop) {
    selector = {
      shopId: shop._id
    };
    if (shops) {
      selector = {
        shopId: {
          $in: shops
        }
      };
    }
    if (!Roles.userIsInRole(this.userId, ['admin'])) {
      selector.isVisible = true;
    }
    return Products.find(selector);
  } else {
    return [];
  }
});

Meteor.publish('product', function(productId) {
  var shop;
  check(productId, String);
  shop = ReactionCore.getCurrentShop(this);
  if (productId.match(/^[A-Za-z0-9]{17}$/)) {
    return Products.find(productId);
  } else {
    return Products.find({
      handle: {
        $regex: productId,
        $options: "i"
      }
    });
  }
});


/*
 * orders
 */

Meteor.publish('orders', function(userId) {
  check(userId, Match.Optional(String));
  if (Roles.userIsInRole(this.userId, ['admin', 'owner'])) {
    return Orders.find({
      shopId: ReactionCore.getShopId(this)
    });
  } else {
    return [];
  }
});


/*
 * account orders
 */

Meteor.publish('accountOrders', function(sessionId, userId) {
  var shopId;
  check(sessionId, Match.OptionalOrNull(String));
  check(userId, Match.OptionalOrNull(String));
  shopId = ReactionCore.getShopId(this);
  if (userId && userId !== this.userId) {
    return [];
  }
  if (!userId) {
    userId = '';
  }
  if (!sessionId) {
    sessionId = '';
  }
  return Orders.find({
    'shopId': shopId,
    $or: [
      {
        'userId': userId
      }, {
        'sessions': {
          $in: [sessionId]
        }
      }
    ]
  });
});


/*
 * cart
 */

Meteor.publish('cart', function(sessionId, userId) {
  var currentCart, shopId;
  check(sessionId, Match.OptionalOrNull(String));
  check(userId, Match.OptionalOrNull(String));
  if (!sessionId) {
    return;
  }
  shopId = ReactionCore.getShopId(this);
  currentCart = getCurrentCart(sessionId, shopId, this.userId);
  ReactionCore.Events.debug("Publishing cart sessionId:" + sessionId);
  return currentCart;
});


/*
 * accounts
 */

Meteor.publish('accounts', function(sessionId, userId) {
  var accountId, shopId, _ref, _ref1;
  check(sessionId, Match.OneOf(String, null));
  check(userId, Match.OneOf(String, null));
  shopId = ReactionCore.getShopId(this);
  if (Roles.userIsInRole(this.userId, ['admin', 'owner'])) {
    return Accounts.find({
      shopId: shopId
    });
  } else {
    ReactionCore.Events.debug("subscribe account", sessionId, this.userId);
    if (this.userId) {
      accountId = (_ref = ReactionCore.Collections.Accounts.findOne({
        'userId': this.userId
      })) != null ? _ref._id : void 0;
    } else {
      accountId = (_ref1 = ReactionCore.Collections.Accounts.findOne({
        'sessions': sessionId
      })) != null ? _ref1._id : void 0;
    }
    if (!accountId) {
      accountId = ReactionCore.Collections.Accounts.insert({
        'sessions': [sessionId],
        'userId': userId
      });
    }
    ReactionCore.Events.info("publishing account", accountId);
    return ReactionCore.Collections.Accounts.find(accountId);
  }
});


/*
 * tags
 */

Meteor.publish("tags", function() {
  return Tags.find({
    shopId: ReactionCore.getShopId()
  });
});


/*
 * shipping
 */

Meteor.publish("shipping", function() {
  return Shipping.find({
    shopId: ReactionCore.getShopId()
  });
});


/*
 * taxes
 */

Meteor.publish("taxes", function() {
  return Taxes.find({
    shopId: ReactionCore.getShopId()
  });
});


/*
 * discounts
 */

Meteor.publish("discounts", function() {
  return Discounts.find({
    shopId: ReactionCore.getShopId()
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/reactioncommerce:core/server/fixtures.coffee.js                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;

/*
 * Fixtures is a global server object that it can be reused in packages
 * assumes collection data in reaction-core/private/data, optionally jsonFile
 * use jsonFile when calling from another package, as we can't read the assets from here
 */
var PackageFixture, createDefaultAdminUser, getDomain, loadFixtures;

PackageFixture = function() {
  return {
    loadData: function(collection, jsonFile) {
      var index, item, json, _i, _len;
      check(jsonFile, Match.Optional(String));
      if (collection.find().count() > 0) {
        return;
      }
      ReactionCore.Events.info("Loading fixture data for " + collection._name);
      if (!jsonFile) {
        json = EJSON.parse(Assets.getText("private/data/" + collection._name + ".json"));
      } else {
        json = EJSON.parse(jsonFile);
      }
      for (index = _i = 0, _len = json.length; _i < _len; index = ++_i) {
        item = json[index];
        collection._collection.insert(item, function(error, result) {
          if (error) {
            ReactionCore.Events.info(error + "Error adding " + index + " items to " + collection._name);
            return false;
          }
        });
      }
      if (index > 0) {
        ReactionCore.Events.info("Success adding " + index + " items to " + collection._name);
      } else {
        ReactionCore.Events.info("No data imported to " + collection._name);
      }
    },
    loadSettings: function(json) {
      var exists, item, pkg, result, validatedJson, _i, _len, _results;
      check(json, String);
      validatedJson = EJSON.parse(json);
      if (!_.isArray(validatedJson[0])) {
        ReactionCore.Events.warn("Load Settings is not an array. Failed to load settings.");
        return;
      }
      _results = [];
      for (_i = 0, _len = validatedJson.length; _i < _len; _i++) {
        pkg = validatedJson[_i];
        _results.push((function() {
          var _j, _len1, _results1;
          _results1 = [];
          for (_j = 0, _len1 = pkg.length; _j < _len1; _j++) {
            item = pkg[_j];
            exists = ReactionCore.Collections.Packages.findOne({
              'name': item.name
            });
            if (exists) {
              result = ReactionCore.Collections.Packages.upsert({
                'name': item.name
              }, {
                $set: {
                  'settings': item.settings,
                  'enabled': item.enabled
                }
              }, {
                multi: true,
                upsert: true,
                validate: false
              });
              _results1.push(ReactionCore.Events.info("loaded local package data: " + item.name));
            } else {
              _results1.push(void 0);
            }
          }
          return _results1;
        })());
      }
      return _results;
    },
    loadI18n: function(collection) {
      var item, json, language, languages, shop, _i, _j, _len, _len1, _ref;
      if (collection == null) {
        collection = ReactionCore.Collections.Translations;
      }
      languages = [];
      if (collection.find().count() > 0) {
        return;
      }
      shop = ReactionCore.Collections.Shops.findOne();
      ReactionCore.Events.info("Loading fixture data for " + collection._name);
      if (!(shop != null ? shop.languages : void 0)) {
        shop.languages = [
          {
            'i18n': 'en'
          }
        ];
      }
      _ref = shop.languages;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        language = _ref[_i];
        json = EJSON.parse(Assets.getText("private/data/i18n/" + language.i18n + ".json"));
        for (_j = 0, _len1 = json.length; _j < _len1; _j++) {
          item = json[_j];
          collection._collection.insert(item, function(error, result) {
            if (error) {
              ReactionCore.Events.info(error + "Error adding " + language.i18n + " items to " + collection._name);
            }
          });
          ReactionCore.Events.info("Success adding " + language.i18n + " to " + collection._name);
        }
      }
    }
  };
};

this.Fixtures = new PackageFixture;

getDomain = function(url) {
  var domain;
  if (!url) {
    url = process.env.ROOT_URL;
  }
  domain = url.match(/^https?\:\/\/([^\/:?#]+)(?:[\/:?#]|$)/i)[1];
  return domain;
};


/*
 * Three methods to create users default (empty db) admin user
 */

createDefaultAdminUser = function() {
  var accountId, domain, options, shopId, url, _ref, _ref1, _ref2, _ref3, _ref4, _ref5;
  options = {};
  options.email = process.env.METEOR_EMAIL;
  options.username = process.env.METEOR_USER;
  options.password = process.env.METEOR_AUTH;
  domain = getDomain();
  if (process.env.METEOR_EMAIL) {
    url = process.env.MONGO_URL;
    options.username = "Administrator";
    if (!options.password) {
      options.password = url.substring(url.indexOf("/") + 2, url.indexOf("@")).split(":")[1];
    }
    ReactionCore.Events.warn("\nIMPORTANT! DEFAULT USER INFO (ENV)\n  EMAIL/LOGIN: " + options.email + "\n  PASSWORD: " + options.password + "\n");
  } else {
    options.username = ((_ref = Meteor.settings) != null ? (_ref1 = _ref.reaction) != null ? _ref1.METEOR_USER : void 0 : void 0) || "Administrator";
    options.password = ((_ref2 = Meteor.settings) != null ? (_ref3 = _ref2.reaction) != null ? _ref3.METEOR_AUTH : void 0 : void 0) || Random.secret(8);
    options.email = ((_ref4 = Meteor.settings) != null ? (_ref5 = _ref4.reaction) != null ? _ref5.METEOR_EMAIL : void 0 : void 0) || Random.id(8).toLowerCase() + "@" + domain;
    ReactionCore.Events.warn("\nIMPORTANT! DEFAULT USER INFO (RANDOM)\n  EMAIL/LOGIN: " + options.email + "\n  PASSWORD: " + options.password + "\n");
  }
  accountId = Accounts.createUser(options);
  Roles.addUsersToRoles(accountId, ['manage-users', 'owner', 'admin']);
  shopId = Shops.findOne()._id;
  return Shops.update(shopId, {
    $set: {
      ownerId: accountId
    },
    $addToSet: {
      emails: {
        'address': options.email,
        'verified': true
      },
      domains: Meteor.settings.ROOT_URL
    },
    $push: {
      members: {
        isAdmin: true,
        userId: accountId,
        permissions: ["dashboard/customers", "dashboard/products", "dashboard/settings", "dashboard/settings/account", "dashboard/orders"]
      }
    }
  });
};


/*
 * load core fixture data
 */

loadFixtures = function() {
  var currentDomain, _ref, _ref1;
  Fixtures.loadData(ReactionCore.Collections.Shops);
  Fixtures.loadData(ReactionCore.Collections.Products);
  Fixtures.loadData(ReactionCore.Collections.Tags);
  Fixtures.loadI18n(ReactionCore.Collections.Translations);
  currentDomain = Shops.findOne().domains[0];
  if (currentDomain !== getDomain()) {
    ReactionCore.Events.info("Updating domain to " + getDomain());
    Shops.update({
      domains: currentDomain
    }, {
      $set: {
        "domains.$": getDomain()
      }
    });
  }
  if (!Accounts.loginServiceConfiguration.find().count()) {
    if ((_ref = Meteor.settings["public"]) != null ? (_ref1 = _ref.facebook) != null ? _ref1.appId : void 0 : void 0) {
      Accounts.loginServiceConfiguration.insert({
        service: "facebook",
        appId: Meteor.settings["public"].facebook.appId,
        secret: Meteor.settings.facebook.secret
      });
    }
  }
  if (ReactionCore.Collections.Packages.find().count() !== Object.keys(ReactionRegistry.Packages).length) {
    _.each(ReactionRegistry.Packages, function(config, pkgName) {
      return Shops.find().forEach(function(shop) {
        ReactionCore.Events.info("Initializing " + pkgName);
        return ReactionCore.Collections.Packages.upsert({
          shopId: shop._id,
          name: pkgName
        }, {
          $setOnInsert: {
            enabled: !!config.autoEnable,
            settings: config.settings,
            registry: config.registry,
            shopPermissions: config.permissions,
            services: config.services
          }
        });
      });
    });
    Shops.find().forEach(function(shop) {
      return ReactionCore.Collections.Packages.find().forEach(function(pkg) {
        if (!_.has(ReactionRegistry.Packages, pkg.name)) {
          ReactionCore.Events.info("Removing " + pkg.name);
          return ReactionCore.Collections.Packages.remove({
            shopId: shop._id,
            name: pkg.name
          });
        }
      });
    });
  }
  if (!Meteor.users.find().count()) {
    return createDefaultAdminUser();
  }
};


/*
 * Execute start up fixtures
 */

Meteor.startup(function() {
  loadFixtures();
  return ReactionCore.Events.info("Reaction Commerce initialization finished. ");
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/reactioncommerce:core/server/factories.coffee.js                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
Factory.define('shop', ReactionCore.Collections.Shops, {
  name: function() {
    return Fake.sentence(2);
  },
  description: function() {
    return Fake.paragraph(20);
  },
  keywords: function() {
    return Fake.sentence(20);
  },
  addressBook: function() {
    return [
      {
        fullName: Fake.sentence(2),
        address1: Fake.sentence(2),
        address2: Fake.sentence(2),
        city: Fake.word(),
        company: Fake.word(),
        phone: "Phone",
        region: Fake.word(),
        postal: _.random(10000, 100000),
        country: "USA",
        isCommercial: false,
        isShippingDefault: true,
        isBillingDefault: true,
        metafields: void 0
      }
    ];
  },
  domains: ["localhost"],
  email: 'root@localhost',
  currency: "USD",
  currencies: [],
  "public": true,
  timezone: '1',
  baseUOM: "OZ",
  ownerId: '1',
  members: [],
  metafields: [],
  createdAt: function() {
    return new Date();
  },
  updatedAt: function() {
    return new Date();
  }
});

Factory.define('product', ReactionCore.Collections.Products, {
  shopId: Factory.get('shop'),
  title: Fake.word,
  pageTitle: function() {
    return Fake.sentence(5);
  },
  description: function() {
    return Fake.paragraph(20);
  },
  productType: function() {
    return Fake.sentence(2);
  },
  vendor: '',
  variants: function() {
    return [
      {
        _id: 1,
        compareAtPrice: _.random(0, 1000),
        weight: _.random(0, 10),
        inventoryManagement: false,
        inventoryPolicy: false,
        lowInventoryWarningThreshold: 1,
        price: _.random(10, 1000),
        title: Fake.word(),
        optionTitle: Fake.word(),
        createdAt: new Date,
        updatedAt: new Date
      }
    ];
  },
  requiresShipping: true,
  hashtags: [],
  isVisible: true,
  publishedAt: function() {
    return new Date;
  },
  createdAt: function() {
    return new Date;
  },
  updatedAt: function() {
    return new Date;
  }
});

Factory.define('productVariants', new Meteor.Collection('ProductVariants'), {
  compareAtPrice: function() {
    return _.random(0, 1000);
  },
  weight: function() {
    return _.random(0, 1000);
  },
  inventoryManagement: false,
  inventoryPolicy: false,
  lowInventoryWarningThreshold: 1,
  inventoryQuantity: function() {
    return _.random(0, 100);
  },
  price: function() {
    return _.random(10, 1000);
  },
  title: Fake.word,
  optionTitle: Fake.word,
  createdAt: function() {
    return new Date;
  },
  updatedAt: function() {
    return new Date;
  }
});

Factory.define('tag', ReactionCore.Collections.Tags, {
  name: Fake.word,
  slug: Fake.word,
  position: function() {
    return _.random(0, 100000);
  },
  isTopLevel: true,
  shopId: Factory.get('shop'),
  createdAt: function() {
    return new Date;
  },
  updatedAt: function() {
    return new Date;
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/reactioncommerce:core/server/methods/methods.coffee.js                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var Packages;

Packages = ReactionCore.Collections.Packages;

Meteor.methods({

  /*
   * determine user's countryCode and return locale object
   */
  getLocale: function() {
    var countryCode, currency, exchangeRate, geo, ip, localeCurrency, rateUrl, result, shop, _i, _len;
    this.unblock();
    result = {};
    ip = this.connection.httpHeaders['x-forwarded-for'];
    try {
      geo = new GeoCoder({
        geocoderProvider: "freegeoip"
      });
      countryCode = geo.geocode(ip)[0].countryCode.toUpperCase();
    } catch (_error) {}
    shop = ReactionCore.Collections.Shops.findOne(ReactionCore.getShopId());
    if (!shop) {
      return result;
    }
    if (!countryCode || countryCode === 'RD') {
      if (shop.addressBook) {
        countryCode = shop.addressBook[0].country;
      } else {
        countryCode = 'US';
      }
    }
    try {
      result.locale = shop.locales.countries[countryCode];
      result.currency = {};
      localeCurrency = shop.locales.countries[countryCode].currency.split(',');
      for (_i = 0, _len = localeCurrency.length; _i < _len; _i++) {
        currency = localeCurrency[_i];
        if (shop.currencies[currency]) {
          result.currency = shop.currencies[currency];
          if (shop.currency !== currency) {
            rateUrl = "http://rate-exchange.herokuapp.com/fetchRate?from=" + shop.currency + "&to=" + currency;
            exchangeRate = HTTP.get(rateUrl);
            result.currency.exchangeRate = exchangeRate.data;
          }
          return result;
        }
      }
    } catch (_error) {}
    return result;
  },

  /*
   * determine user's full location for autopopulating addresses
   */
  locateAddress: function(latitude, longitude) {
    var address, error, geo, ip;
    check(latitude, Match.Optional(Number));
    check(longitude, Match.Optional(Number));
    try {
      if ((latitude != null) && (longitude != null)) {
        geo = new GeoCoder();
        address = geo.reverse(latitude, longitude);
      } else {
        ip = this.connection.httpHeaders['x-forwarded-for'];
        if (ip) {
          geo = new GeoCoder({
            geocoderProvider: "freegeoip"
          });
          address = geo.geocode(ip);
        }
      }
    } catch (_error) {
      error = _error;
      if ((latitude != null) && (longitude != null)) {
        ReactionCore.Events.info("Error in locateAddress for latitude/longitude lookup (" + latitude + "," + longitude + "):" + error.message);
      } else {
        ReactionCore.Events.info("Error in locateAddress for IP lookup (" + ip + "):" + error.message);
      }
    }
    if (address != null ? address.length : void 0) {
      return address[0];
    } else {
      return {
        latitude: null,
        longitude: null,
        country: "United States",
        city: null,
        state: null,
        stateCode: null,
        zipcode: null,
        streetName: null,
        streetNumber: null,
        countryCode: "US"
      };
    }
  },

  /*
   * method to insert or update tag with hierarchy
   * tagName will insert
   * tagName + tagId will update existing
   * currentTagId will update related/hierarchy
   */
  updateHeaderTags: function(tagName, tagId, currentTagId) {
    var existingTag, newTag, newTagId;
    check(tagName, String);
    check(tagId, Match.OneOf(String, null, void 0));
    check(currentTagId, Match.Optional(String));
    if (!Roles.userIsInRole(Meteor.userId(), ['admin'])) {
      throw new Meteor.Error(403, "Access Denied");
    }
    newTag = {
      slug: getSlug(tagName),
      name: tagName
    };
    if (tagId) {
      Tags.update(tagId, {
        $set: newTag
      });
      ReactionCore.Events.info("Changed name of tag " + tagId + " to " + tagName);
    } else {
      existingTag = Tags.findOne({
        "name": tagName
      });
      if (existingTag) {
        if (currentTagId) {
          Tags.update(currentTagId, {
            $addToSet: {
              "relatedTagIds": existingTag._id
            }
          });
          ReactionCore.Events.info('Added tag "' + existingTag.name + '" to the related tags list for tag ' + currentTagId);
        } else {
          Tags.update(existingTag._id, {
            $set: {
              "isTopLevel": true
            }
          });
          ReactionCore.Events.info('Marked tag "' + existingTag.name + '" as a top level tag');
        }
      } else {
        newTag.isTopLevel = !currentTagId;
        newTag.shopId = ReactionCore.getShopId();
        newTag.updatedAt = new Date();
        newTag.createdAt = new Date();
        newTagId = Tags.insert(newTag);
        ReactionCore.Events.info('Created tag "' + newTag.name + '"');
        if (currentTagId) {
          Tags.update(currentTagId, {
            $addToSet: {
              "relatedTagIds": newTagId
            }
          });
          ReactionCore.Events.info('Added tag "' + newTag.name + '" to the related tags list for tag ' + currentTagId);
        }
      }
    }
  },
  removeHeaderTag: function(tagId, currentTagId) {
    var productCount, relatedTagsCount;
    check(tagId, String);
    check(currentTagId, String);
    if (!Roles.userIsInRole(Meteor.userId(), ['admin'])) {
      throw new Meteor.Error(403, "Access Denied");
    }
    Tags.update(currentTagId, {
      $pull: {
        "relatedTagIds": tagId
      }
    });
    productCount = Products.find({
      "hashtags": {
        $in: [tagId]
      }
    }).count();
    relatedTagsCount = Tags.find({
      "relatedTagIds": {
        $in: [tagId]
      }
    }).count();
    if ((productCount === 0) && (relatedTagsCount === 0)) {
      return Tags.remove(tagId);
    }
  },

  /*
   * Helper method to remove all translations, and reload from jsonFiles
   */
  flushTranslations: function() {
    if (!Roles.userIsInRole(Meteor.userId(), ['admin'])) {
      throw new Meteor.Error(403, "Access Denied");
    }
    ReactionCore.Collections.Translations.remove({});
    Fixtures.loadI18n();
    return ReactionCore.Events.info(Meteor.userId() + " Flushed Translations.");
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/reactioncommerce:core/server/methods/cart/cart.coffee.js                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
Match.OptionalOrNull = function(pattern) {
  return Match.OneOf(void 0, null, pattern);
};


/*
 *  getCurrentCart(sessionId)
 *  create, merge the session and user carts and return cart cursor
 *
 * There should be one cart for each independent, non logged in user session
 * When a user logs in that cart now belongs to that user and we use the a single user cart.
 * If they are logged in on more than one devices, regardless of session, the user cart will be used
 * If they had more than one cart, on more than one device,logged in at seperate times then merge the carts
 *
 */

this.getCurrentCart = function(sessionId, shopId, userId) {
  var Cart, cart, currentCart, currentCarts, newCartId, shopid;
  check(sessionId, String);
  check(shopId, Match.OptionalOrNull(String));
  check(userId, Match.OptionalOrNull(String));
  shopid = shopId || ReactionCore.getShopId(this);
  userId = userId || "";
  Cart = ReactionCore.Collections.Cart;
  currentCarts = Cart.find({
    'shopId': shopId,
    'sessions': {
      $in: [sessionId]
    }
  });
  if (currentCarts.count() === 0) {
    newCartId = Cart.insert({
      sessions: [sessionId],
      shopId: shopId,
      userId: userId
    });
    ReactionCore.Events.debug("Created new session cart", newCartId);
    currentCart = Cart.find(newCartId);
    return currentCart;
  }
  currentCarts.forEach(function(cart) {
    var userCart;
    if (cart.userId && !userId) {
      Cart.update(cart._id, {
        $pull: {
          'sessions': sessionId
        }
      });
      ReactionCore.Events.debug("Logging out. Removed session from cart.");
    }
    if (userId) {
      userCart = Cart.findOne({
        'userId': userId,
        'shopId': shopId,
        'sessions': {
          $nin: [sessionId]
        }
      });
      if (userCart && !cart.userId) {
        if (!cart.items) {
          cart.items = [];
        }
        Cart.update(userCart._id, {
          $set: {
            userId: userId
          },
          $addToSet: {
            items: {
              $each: cart.items
            },
            sessions: {
              $each: cart.sessions
            }
          }
        });
        Cart.remove(cart._id);
        ReactionCore.Events.debug("Updated user cart", cart._id, "with sessionId: " + sessionId);
        return Cart.find(userCart._id);
      } else if (!userCart && !cart.userId) {
        Cart.update(cart._id, {
          $set: {
            userId: userId
          }
        });
        return Cart.find(cart._id);
      }
    }
  });
  if (currentCarts.count() === 1) {
    cart = currentCarts.fetch();
    ReactionCore.Events.debug("getCurrentCart returned sessionId:" + sessionId + " cartId: " + cart[0]._id);
    currentCarts = Cart.find(cart[0]._id);
    return currentCarts;
  }
  ReactionCore.Events.debug("getCurrentCart error:", currentCarts);
  return currentCarts;
};


/*
 *  Cart Methods
 */

Meteor.methods({

  /*
   * when we add an item to the cart, we want to break all relationships
   * with the existing item. We want to fix price, qty, etc into history
   * however, we could check reactively for price /qty etc, adjustments on
   * the original and notify them
   */
  addToCart: function(cartId, productId, variantData, quantity) {
    var cartVariantExists, currentCart, product, shopId;
    check(cartId, String);
    check(productId, String);
    check(variantData, Object);
    check(quantity, String);
    shopId = ReactionCore.getShopId(this);
    currentCart = Cart.findOne(cartId);
    cartVariantExists = Cart.findOne({
      _id: currentCart._id,
      "items.variants._id": variantData._id
    });
    if (cartVariantExists) {
      Cart.update({
        _id: currentCart._id,
        "items.variants._id": variantData._id
      }, {
        $set: {
          updatedAt: new Date()
        },
        $inc: {
          "items.$.quantity": quantity
        }
      });
      return function(error, result) {
        if (error) {
          ReactionCore.Events.info("error adding to cart");
        }
        if (error) {
          return ReactionCore.Events.info(Cart.simpleSchema().namedContext().invalidKeys());
        }
      };
    } else {
      product = ReactionCore.Collections.Products.findOne(productId);
      return Cart.update({
        _id: currentCart._id
      }, {
        $addToSet: {
          items: {
            _id: Random.id(),
            shopId: product.shopId,
            productId: productId,
            quantity: quantity,
            variants: variantData
          }
        }
      }, function(error, result) {
        if (error) {
          ReactionCore.Events.info("error adding to cart");
        }
        if (error) {
          return ReactionCore.Events.warn(error);
        }
      });
    }
  },

  /*
   * removes a variant from the cart
   */
  removeFromCart: function(sessionId, cartId, variantData) {
    check(sessionId, String);
    check(cartId, String);
    check(variantData, Object);
    return Cart.update({
      _id: cartId,
      $or: [
        {
          userId: this.userId
        }, {
          sessionId: sessionId
        }
      ]
    }, {
      $pull: {
        "items": {
          "variants": variantData
        }
      }
    });
  },

  /*
   * adjust inventory when an order is placed
   */
  inventoryAdjust: function(orderId) {
    var order, product, _i, _len, _ref;
    check(orderId, String);
    order = Orders.findOne(orderId);
    if (!order) {
      return false;
    }
    _ref = order.items;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      product = _ref[_i];
      Products.update({
        _id: product.productId,
        "variants._id": product.variants._id
      }, {
        $inc: {
          "variants.$.inventoryQuantity": -product.quantity
        }
      });
    }
  },

  /*
   * when a payment is processed we want to copy the cart
   * over to an order object, and give the user a new empty
   * cart. reusing the cart schema makes sense, but integrity of
   * the order, we don't want to just make another cart item
   *
   * TODO:  Partial order processing, shopId processing
   *
   */
  copyCartToOrder: function(cartId) {
    var cart, error, invoice, now, orderId;
    check(cartId, String);
    cart = ReactionCore.Collections.Cart.findOne(cartId);
    invoice = {};
    invoice.shipping = cart.cartShipping();
    invoice.subtotal = cart.cartSubTotal();
    invoice.taxes = cart.cartTaxes();
    invoice.discounts = cart.cartDiscounts();
    invoice.total = cart.cartTotal();
    cart.payment.invoices = [invoice];
    if (cart.userId && !cart.email) {
      cart.email = Meteor.user(cart.userId).emails[0].address;
    }
    now = new Date();
    cart.createdAt = now;
    cart.updatedAt = now;
    cart.state = "orderCreated";
    cart.status = "new";
    cart._id = Random.id();
    cart.cartId = cartId;

    /*
     * final sanity check
     * todo add `check cart, ReactionCore.Schemas.Order`
     * and add some additional validation that all is good
     * and no tampering has occurred
     */
    try {
      orderId = Orders.insert(cart);
      if (orderId) {
        Cart.remove({
          _id: cartId
        });
        ReactionCore.Events.info("Completed cart for " + cartId);
      }
    } catch (_error) {
      error = _error;
      ReactionCore.Events.info("error in order insert");
      ReactionCore.Events.warn(error, Orders.simpleSchema().namedContext().invalidKeys());
      return error;
    }
    return orderId;
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/reactioncommerce:core/server/methods/cart/shipping.coffee.js                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;

/*
 * methods typically used for checkout (shipping, taxes, etc)
 */
var __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

Meteor.methods({

  /*
   * gets shipping rates and updates the users cart methods
   * TODO: add orderId argument/fallback
   */
  updateShipmentQuotes: function(cartId) {
    var cart, rates;
    if (!cartId) {
      return;
    }
    check(cartId, String);
    this.unblock;
    cart = ReactionCore.Collections.Cart.findOne(cartId);
    if (cart) {
      rates = Meteor.call("getShippingRates", cart);
      if (rates.length > 0) {
        ReactionCore.Collections.Cart.update({
          '_id': cartId
        }, {
          $set: {
            'shipping.shipmentQuotes': rates
          }
        });
      }
      ReactionCore.Events.debug(rates);
    }
  },

  /*
   *  just gets rates, without updating anything
   */
  getShippingRates: function(options) {
    var product, rates, selector, shipping, shops, _i, _len, _ref, _ref1, _ref2;
    check(options, Object);
    rates = [];
    selector = {
      shopId: ReactionCore.getShopId()
    };
    shops = [];
    _ref = options.items;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      product = _ref[_i];
      if (_ref1 = product.shopId, __indexOf.call(shops, _ref1) < 0) {
        shops.push(product.shopId);
      }
    }
    if (_ref2 = ReactionCore.getShopId(), __indexOf.call(shops, _ref2) < 0) {
      shops.push(ReactionCore.getShopId());
    }
    if ((shops != null ? shops.length : void 0) > 0) {
      selector = {
        shopId: {
          $in: shops
        }
      };
    }
    shipping = ReactionCore.Collections.Shipping.find(selector);
    shipping.forEach(function(shipping) {
      var index, method, rate, _j, _len1, _ref3, _results;
      _ref3 = shipping.methods;
      _results = [];
      for (index = _j = 0, _len1 = _ref3.length; _j < _len1; index = ++_j) {
        method = _ref3[index];
        if (!(method.enabled === true)) {
          continue;
        }
        if (!method.rate) {
          method.rate = 0;
        }
        if (!method.handling) {
          method.handling = 0;
        }
        rate = method.rate + method.handling;
        _results.push(rates.push({
          carrier: shipping.provider.label,
          method: method,
          rate: rate,
          shopId: shipping.shopId
        }));
      }
      return _results;
    });
    ReactionCore.Events.info("getShippingrates returning rates");
    ReactionCore.Events.debug("rates", rates);
    return rates;
  },

  /*
   * add payment method
   */
  paymentMethod: function(cartId, paymentMethod) {
    check(cartId, String);
    check(paymentMethod, Object);
    return Cart.update({
      _id: cartId
    }, {
      $addToSet: {
        "payment.paymentMethod": paymentMethod
      }
    });
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/reactioncommerce:core/server/methods/orders/orders.coffee.js                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
Meteor.methods({

  /*
   * Adds tracking information to order
   * Call after any tracking code is generated
   */
  addTracking: function(orderId, tracking) {
    check(orderId, String);
    check(tracking, String);
    return Orders.update(orderId, {
      $set: {
        "shipping.shipmentMethod.tracking": tracking
      }
    });
  },

  /*
   * adds email to existing order
   */
  addOrderEmail: function(orderId, email) {
    check(orderId, String);
    check(email, String);
    return Orders.update(orderId, {
      $set: {
        "email": email
      }
    });
  },

  /*
   * Save supplied order workflow state
   */
  updateWorkflow: function(orderId, currentState) {
    check(orderId, String);
    check(currentState, String);
    Orders.update(orderId, {
      $set: {
        "state": currentState
      }
    });
    return Meteor.call("updateHistory", orderId, currentState);
  },

  /*
   * Add files/documents to order
   * use for packing slips, labels, customs docs, etc
   */
  updateDocuments: function(orderId, docId, docType) {
    check(orderId, String);
    check(docId, String);
    check(docType, String);
    return Orders.update(orderId, {
      $addToSet: {
        "documents": {
          docId: docId,
          docType: docType
        }
      }
    });
  },

  /*
   * Add to order event history
   */
  updateHistory: function(orderId, event, value) {
    check(orderId, String);
    check(event, String);
    check(value, String);
    return Orders.update(orderId, {
      $addToSet: {
        "history": {
          event: event,
          value: value,
          userId: Meteor.userId(),
          updatedAt: new Date()
        }
      }
    });
  },

  /*
   * Finalize any payment where mode is "authorize"
   * and status is "approved", reprocess as "capture"
   * TODO: add tests working with new payment methods
   * TODO: refactor to use non Meteor.namespace
   */
  processPayments: function(orderId) {
    var index, order, paymentMethod, _i, _len, _ref;
    check(orderId, String);
    order = Orders.findOne(orderId);
    _ref = order.payment.paymentMethod;
    for (index = _i = 0, _len = _ref.length; _i < _len; index = ++_i) {
      paymentMethod = _ref[index];
      if (paymentMethod.mode === 'authorize' && paymentMethod.status === 'approved') {
        Meteor[paymentMethod.processor].capture(paymentMethod.transactionId, paymentMethod.amount, function(error, result) {
          var transactionId;
          if (result.capture != null) {
            transactionId = paymentMethod.transactionId;
            Orders.update({
              "_id": orderId,
              "payment.paymentMethod.transactionId": transactionId
            }, {
              $set: {
                "payment.paymentMethod.$.transactionId": result.capture.id,
                "payment.paymentMethod.$.mode": "capture",
                "payment.paymentMethod.$.status": "completed"
              }
            });
          }
        });
      }
    }
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/reactioncommerce:core/server/methods/products/products.coffee.js                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var Media;

Media = ReactionCore.Collections.Media;

Meteor.methods({

  /*
   * the cloneVariant method copies variants, but will also create and clone child variants (options)
   * productId,variantId to clone
   * add parentId to create children
   */
  cloneVariant: function(productId, variantId, parentId) {
    var childClone, children, clone, product, variant, _i, _len;
    check(productId, String);
    check(variantId, String);
    check(parentId, Match.Optional(String));
    if (!Roles.userIsInRole(Meteor.userId(), ['admin'])) {
      throw new Meteor.Error(403, "Access Denied");
    }
    product = Products.findOne(productId);
    variant = (function() {
      var _i, _len, _ref, _results;
      _ref = product.variants;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        variant = _ref[_i];
        if (variant._id === variantId) {
          _results.push(variant);
        }
      }
      return _results;
    })();
    if (!(variant.length > 0)) {
      return false;
    }
    clone = variant[0];
    clone._id = Random.id();
    if (parentId) {
      ReactionCore.Events.debug("create child clone");
      clone.parentId = variantId;
      delete clone.inventoryQuantity;
      Products.update({
        _id: productId
      }, {
        $push: {
          variants: clone
        }
      }, {
        validate: false
      });
      return clone._id;
    }
    clone.cloneId = productId;
    delete clone.updatedAt;
    delete clone.createdAt;
    delete clone.inventoryQuantity;
    delete clone.title;
    Products.update({
      _id: productId
    }, {
      $push: {
        variants: clone
      }
    }, {
      validate: false
    });
    children = (function() {
      var _i, _len, _ref, _results;
      _ref = product.variants;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        variant = _ref[_i];
        if (variant.parentId === variantId) {
          _results.push(variant);
        }
      }
      return _results;
    })();
    if (children.length > 0) {
      ReactionCore.Events.debug("clone children");
      for (_i = 0, _len = children.length; _i < _len; _i++) {
        childClone = children[_i];
        childClone._id = Random.id();
        childClone.parentId = clone._id;
        Products.update({
          _id: productId
        }, {
          $push: {
            variants: childClone
          }
        }, {
          validate: false
        });
      }
    }
    return clone._id;
  },

  /*
   * initializes empty variant template (all others are clones)
   * should only be seen when all variants have been deleted from a product.
   */
  createVariant: function(productId, newVariant) {
    var newVariantId;
    check(productId, String);
    check(newVariant, Match.OneOf(Object, void 0));
    if (!Roles.userIsInRole(Meteor.userId(), ['admin'])) {
      throw new Meteor.Error(403, "Access Denied");
    }
    newVariantId = Random.id();
    if (newVariant) {
      newVariant._id = newVariantId;
      check(newVariant, ReactionCore.Schemas.ProductVariant);
    } else {
      newVariant = {
        "_id": newVariantId,
        "title": "",
        "price": "0.00"
      };
    }
    Products.update({
      "_id": productId
    }, {
      $addToSet: {
        "variants": newVariant
      }
    }, {
      validate: false
    });
    return newVariantId;
  },

  /*
   * update individual variant with new values, merges into original
   * only need to supply updated information
   */
  updateVariant: function(variant, updateDoc, currentDoc) {
    var newVariant, product, value, variants, _i, _len, _ref;
    check(variant, Object);
    check(updateDoc, Match.OptionalOrNull(Object));
    check(currentDoc, Match.OptionalOrNull(String));
    if (!Roles.userIsInRole(Meteor.userId(), ['admin'])) {
      throw new Meteor.Error(403, "Access Denied");
    }
    product = Products.findOne({
      "variants._id": variant._id
    });
    if (product != null ? product.variants : void 0) {
      _ref = product.variants;
      for (value = _i = 0, _len = _ref.length; _i < _len; value = ++_i) {
        variants = _ref[value];
        if (variants._id === variant._id) {
          newVariant = _.extend(variants, variant);
        }
      }
      return Products.update({
        "_id": product._id,
        "variants._id": variant._id
      }, {
        $set: {
          "variants.$": newVariant
        }
      }, {
        validate: false
      });
    }
  },

  /*
   * update whole variants array
   */
  updateVariants: function(variants) {
    var product;
    check(variants, [Object]);
    if (!Roles.userIsInRole(Meteor.userId(), ['admin'])) {
      throw new Meteor.Error(403, "Access Denied");
    }
    product = Products.findOne({
      "variants._id": variants[0]._id
    });
    return Products.update(product._id, {
      $set: {
        variants: variants
      }
    }, {
      validate: false
    });
  },

  /*
   * delete variant, which should also delete child variants
   */
  deleteVariant: function(variantId) {
    var deleted;
    check(variantId, String);
    if (!Roles.userIsInRole(Meteor.userId(), ['admin'])) {
      throw new Meteor.Error(403, "Access Denied");
    }
    deleted = Products.find({
      $or: [
        {
          "variants.parentId": variantId
        }, {
          "variants._id": variantId
        }
      ]
    }).fetch();
    Products.update({
      "variants.parentId": variantId
    }, {
      $pull: {
        'variants': {
          'parentId': variantId
        }
      }
    });
    Products.update({
      "variants._id": variantId
    }, {
      $pull: {
        'variants': {
          '_id': variantId
        }
      }
    });
    _.each(deleted, function(product) {
      return _.each(product.variants, function(variant) {
        if (variant.parentId === variantId || variant._id === variantId) {
          return Media.update({
            'metadata.variantId': variant._id
          }, {
            $unset: {
              'metadata.productId': "",
              'metadata.variantId': "",
              'metadata.priority': ""
            }
          }, {
            multi: true
          });
        }
      });
    });
    return true;
  },

  /*
   * clone a whole product, defaulting visibility, etc
   * in the future we are going to do an inheritance product
   * that maintains relationships with the cloned
   * product tree
   */
  cloneProduct: function(product) {
    var handleCount, i, newVariantId, oldVariantId;
    check(product, Object);
    if (!Roles.userIsInRole(Meteor.userId(), ['admin'])) {
      throw new Meteor.Error(403, "Access Denied");
    }
    i = 0;
    handleCount = Products.find({
      "cloneId": product._id
    }).count() + 1;
    product.cloneId = product._id;
    product._id = Random.id();
    delete product.updatedAt;
    delete product.createdAt;
    delete product.publishedAt;
    delete product.handle;
    product.isVisible = false;
    if (product.title) {
      product.title = product.title + handleCount;
    }
    while (i < product.variants.length) {
      newVariantId = Random.id();
      oldVariantId = product.variants[i]._id;
      product.variants[i]._id = newVariantId;
      Media.find({
        'metadata.variantId': oldVariantId
      }).forEach(function(fileObj) {
        var newFile;
        newFile = fileObj.copy();
        return newFile.update({
          $set: {
            'metadata.productId': product._id,
            'metadata.variantId': newVariantId
          }
        });
      });
      if (!product.variants[i].parentId) {
        while (i < product.variants.length) {
          if (product.variants[i].parentId === oldVariantId) {
            product.variants[i].parentId = newVariantId;
          }
          i++;
        }
      }
      i++;
    }
    return Products.insert(product, {
      validate: false
    });
  },

  /*
   * when we create a new product, we create it with
   * an empty variant. all products have a variant
   * with pricing and details
   */
  createProduct: function() {
    if (!Roles.userIsInRole(Meteor.userId(), ['admin'])) {
      throw new Meteor.Error(403, "Access Denied");
    }
    return Products.insert({
      _id: Random.id(),
      title: "",
      variants: [
        {
          _id: Random.id(),
          title: "",
          price: 0.00
        }
      ]
    }, {
      validate: false
    });
  },

  /*
   * delete a product and unlink it from all media
   */
  deleteProduct: function(productId) {
    var numRemoved;
    check(productId, String);
    if (!Roles.userIsInRole(Meteor.userId(), ['admin'])) {
      throw new Meteor.Error(403, "Access Denied");
    }
    numRemoved = Products.remove(productId);
    if (numRemoved > 0) {
      Media.update({
        'metadata.productId': productId
      }, {
        $unset: {
          'metadata.productId': "",
          'metadata.variantId': "",
          'metadata.priority': ""
        }
      }, {
        multi: true
      });
      return true;
    } else {
      return false;
    }
  },

  /*
   * update single product field
   */
  updateProductField: function(productId, field, value) {
    var update;
    check(productId, String);
    check(field, String);
    check(value, String);
    if (!Roles.userIsInRole(Meteor.userId(), ['admin'])) {
      throw new Meteor.Error(403, "Access Denied");
    }
    value = EJSON.stringify(value);
    update = EJSON.parse("{\"" + field + "\":" + value + "}");
    return Products.update(productId, {
      $set: update
    });
  },

  /*
   * method to insert or update tag with hierachy
   * tagName will insert
   * tagName + tagId will update existing
   */
  updateProductTags: function(productId, tagName, tagId, currentTagId) {
    var existingTag, newTag, productCount;
    check(productId, String);
    check(tagName, String);
    check(tagId, Match.OneOf(String, null));
    check(currentTagId, Match.Optional(String));
    if (!Roles.userIsInRole(Meteor.userId(), ['admin'])) {
      throw new Meteor.Error(403, "Access Denied");
    }
    newTag = {
      slug: getSlug(tagName),
      name: tagName
    };
    existingTag = Tags.findOne({
      "name": tagName
    });
    if (existingTag) {
      productCount = Products.find({
        "_id": productId,
        "hashtags": {
          $in: [existingTag._id]
        }
      }).count();
      if (productCount > 0) {
        return false;
      }
      Products.update(productId, {
        $push: {
          "hashtags": existingTag._id
        }
      });
    } else if (tagId) {
      Tags.update(tagId, {
        $set: newTag
      });
    } else {
      newTag.isTopLevel = false;
      newTag.shopId = ReactionCore.getShopId();
      newTag.updatedAt = new Date();
      newTag.createdAt = new Date();
      newTag._id = Tags.insert(newTag);
      Products.update(productId, {
        $push: {
          "hashtags": newTag._id
        }
      });
    }
  },

  /*
   * remove product tag
   */
  removeProductTag: function(productId, tagId) {
    var productCount, relatedTagsCount;
    check(productId, String);
    check(tagId, String);
    if (!Roles.userIsInRole(Meteor.userId(), ['admin'])) {
      throw new Meteor.Error(403, "Access Denied");
    }
    Products.update(productId, {
      $pull: {
        "hashtags": tagId
      }
    });
    productCount = Products.find({
      "hashtags": {
        $in: [tagId]
      }
    }).count();
    relatedTagsCount = Tags.find({
      "relatedTagIds": {
        $in: [tagId]
      }
    }).count();
    if ((productCount === 0) && (relatedTagsCount === 0)) {
      return Tags.remove(tagId);
    }
  },

  /*
   * set or toggle product handle
   */
  setHandleTag: function(productId, tagId) {
    var currentProduct, existingHandles, product, tag, _i, _len;
    check(productId, String);
    check(tagId, String);
    if (!Roles.userIsInRole(Meteor.userId(), ['admin'])) {
      throw new Meteor.Error(403, "Access Denied");
    }
    product = Products.findOne(productId);
    tag = Tags.findOne(tagId);
    if (productId.handle === tag.slug) {
      Products.update(product._id, {
        $unset: {
          "handle": ""
        }
      });
      return product._id;
    } else {
      existingHandles = Products.find({
        handle: tag.slug
      }).fetch();
      for (_i = 0, _len = existingHandles.length; _i < _len; _i++) {
        currentProduct = existingHandles[_i];
        Products.update(currentProduct._id, {
          $unset: {
            "handle": ""
          }
        });
      }
      Products.update(product._id, {
        $set: {
          "handle": tag.slug
        }
      });
      return tag.slug;
    }
  },

  /*
   * update product grid positions
   * position is an object with tag,position,dimensions
   */
  updateProductPosition: function(productId, positionData) {
    check(productId, String);
    check(positionData, Object);
    if (!Roles.userIsInRole(Meteor.userId(), ['admin'])) {
      throw new Meteor.Error(403, "Access Denied");
    }
    if (!Products.findOne({
      '_id': productId,
      "positions.tag": positionData.tag
    })) {
      return Products.update({
        _id: productId
      }, {
        $addToSet: {
          positions: positionData
        },
        $set: {
          updatedAt: new Date()
        }
      }, function(error, results) {
        if (error) {
          return ReactionCore.Events.warn(error);
        }
      });
    } else {
      return Products.update({
        "_id": productId,
        "positions.tag": positionData.tag
      }, {
        $set: {
          "positions.$.position": positionData.position,
          "positions.$.updatedAt": new Date()
        }
      }, function(error, results) {
        if (error) {
          return ReactionCore.Events.warn(error);
        }
      });
    }
  },
  updateMetaFields: function(productId, updatedMeta, meta) {
    check(productId, String);
    check(updatedMeta, Object);
    check(meta, Match.OptionalOrNull(Object));
    if (!Roles.userIsInRole(Meteor.userId(), ['admin'])) {
      throw new Meteor.Error(403, "Access Denied");
    }
    if (meta) {
      return Products.update({
        "_id": productId,
        "metafields": meta
      }, {
        $set: {
          "metafields.$": updatedMeta
        }
      });
    } else {
      return Products.update({
        "_id": productId
      }, {
        "$addToSet": {
          "metafields": updatedMeta
        }
      });
    }
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/reactioncommerce:core/server/methods/accounts/accounts.coffee.js                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
Accounts.onCreateUser(function(options, user) {
  var account, accountId, userAccount;
  userAccount = ReactionCore.Collections.Accounts.findOne({
    'userId': user._id
  });
  if (!userAccount) {
    account = _.clone(user);
    account.userId = user._id;
    accountId = ReactionCore.Collections.Accounts.insert(account);
    ReactionCore.Events.info("Created account: " + accountId + " for user: " + user._id);
  }
  return user;
});

this.setMailUrlForShop = function(shop) {
  var coreMail, mailUrl;
  coreMail = ReactionCore.Collections.Packages.findOne({
    name: "core"
  }).settings.mail;
  if (coreMail.user && coreMail.password) {
    mailUrl = "smtp://" + coreMail.user + ":" + coreMail.password + "@" + coreMail.host + ":" + coreMail.port + "/";
    return process.env.MAIL_URL = process.env.MAIL_URL || mailUrl;
  } else {
    ReactionCore.Events.warn('Core Mail Settings not set. Unable to send email.');
    throw new Meteor.Error(403, '<a href="/dashboard/settings/shop#mail">Core Mail Settings</a> not set. Unable to send email.');
  }
};

Meteor.methods({

  /*
   * add new addresses to an account
   */
  addressBookAdd: function(doc, accountId) {
    this.unblock();
    check(doc, ReactionCore.Schemas.Address);
    check(accountId, String);
    ReactionCore.Schemas.Address.clean(doc);
    if (doc.isShippingDefault || doc.isBillingDefault) {
      if (doc.isShippingDefault) {
        ReactionCore.Collections.Accounts.update({
          "_id": accountId,
          "profile.addressBook.isShippingDefault": true
        }, {
          $set: {
            "profile.addressBook.$.isShippingDefault": false
          }
        });
      }
      if (doc.isBillingDefault) {
        ReactionCore.Collections.Accounts.update({
          '_id': accountId,
          "profile.addressBook.isBillingDefault": true
        }, {
          $set: {
            "profile.addressBook.$.isBillingDefault": false
          }
        });
      }
    }
    ReactionCore.Collections.Accounts.upsert(accountId, {
      $addToSet: {
        "profile.addressBook": doc
      }
    });
    return doc;
  },

  /*
   * update existing address in user's profile
   */
  addressBookUpdate: function(doc, accountId) {
    this.unblock();
    check(doc, ReactionCore.Schemas.Address);
    check(accountId, String);
    if (doc.isShippingDefault || doc.isBillingDefault) {
      if (doc.isShippingDefault) {
        ReactionCore.Collections.Accounts.update({
          "_id": accountId,
          "profile.addressBook.isShippingDefault": true
        }, {
          $set: {
            "profile.addressBook.$.isShippingDefault": false
          }
        });
      }
      if (doc.isBillingDefault) {
        ReactionCore.Collections.Accounts.update({
          "_id": accountId,
          "profile.addressBook.isBillingDefault": true
        }, {
          $set: {
            "profile.addressBook.$.isBillingDefault": false
          }
        });
      }
    }
    ReactionCore.Collections.Accounts.update({
      "_id": accountId,
      "profile.addressBook._id": doc._id
    }, {
      $set: {
        "profile.addressBook.$": doc
      }
    });
    return doc;
  },

  /*
   * invite new admin users
   * (not consumers) to secure access in the dashboard
   * to permissions as specified in packages/roles
   */
  inviteShopMember: function(shopId, email, name) {
    var currentUserName, shop, token, user, userId, _ref, _ref1, _ref2;
    check(shopId, String);
    check(email, String);
    check(name, String);
    this.unblock();
    shop = Shops.findOne(shopId);
    if (shop && email && name) {
      if (ReactionCore.hasOwnerAccess(shop)) {
        currentUserName = ((_ref = Meteor.user()) != null ? (_ref1 = _ref.profile) != null ? _ref1.name : void 0 : void 0) || ((_ref2 = Meteor.user()) != null ? _ref2.username : void 0) || "Admin";
        user = Meteor.users.findOne({
          "emails.address": email
        });
        if (!user) {
          userId = Accounts.createUser({
            email: email,
            profile: {
              name: name
            }
          });
          user = Meteor.users.findOne(userId);
          if (!user) {
            throw new Error("Can't find user");
          }
          token = Random.id();
          Meteor.users.update(userId, {
            $set: {
              "services.password.reset": {
                token: token,
                email: email,
                when: new Date()
              }
            }
          });
          setMailUrlForShop(shop);
          SSR.compileTemplate('shopMemberInvite', Assets.getText('server/emailTemplates/shopMemberInvite.html'));
          Email.send({
            to: email,
            from: currentUserName + " <" + shop.email + ">",
            subject: "You have been invited to join " + shop.name,
            html: SSR.render('shopMemberInvite', {
              homepage: Meteor.absoluteUrl(),
              shop: shop,
              currentUserName: currentUserName,
              invitedUserName: name,
              url: Accounts.urls.enrollAccount(token)
            })
          });
        } else {
          setMailUrlForShop(shop);
          SSR.compileTemplate('shopMemberInvite', Assets.getText('server/emailTemplates/shopMemberInvite.html'));
          Email.send({
            to: email,
            from: currentUserName + " <" + shop.email + ">",
            subject: "You have been invited to join the " + shop.name,
            html: SSR.render('shopMemberInvite', {
              homepage: Meteor.absoluteUrl(),
              shop: shop,
              currentUserName: currentUserName,
              invitedUserName: name,
              url: Meteor.absoluteUrl()
            })
          });
        }
        return Shops.update(shopId, {
          $addToSet: {
            members: {
              userId: user._id,
              isAdmin: true
            }
          }
        });
      }
    }
  },

  /*
   * send an email to consumers on sign up
   */
  sendWelcomeEmail: function(shop) {
    var email;
    check(shop, Object);
    this.unblock();
    email = Meteor.user().emails[0].address;
    setMailUrlForShop(shop);
    SSR.compileTemplate('welcomeNotification', Assets.getText('server/emailTemplates/welcomeNotification.html'));
    return Email.send({
      to: email,
      from: shop.email,
      subject: "Welcome to " + shop.name + "!",
      html: SSR.render('welcomeNotification', {
        homepage: Meteor.absoluteUrl(),
        shop: shop,
        user: Meteor.user()
      })
    });
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['reactioncommerce:core'] = {
  ReactionCore: ReactionCore,
  ReactionRegistry: ReactionRegistry,
  currentProduct: currentProduct
};

})();

//# sourceMappingURL=reactioncommerce_core.js.map
