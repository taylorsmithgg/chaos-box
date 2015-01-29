(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var Accounts = Package['accounts-base'].Accounts;
var HTTP = Package.http.HTTP;
var _ = Package.underscore._;
var Blaze = Package.ui.Blaze;
var UI = Package.ui.UI;
var Handlebars = Package.ui.Handlebars;
var Email = Package.email.Email;
var d3 = Package['d3js:d3'].d3;
var _s = Package['mrt:underscore-string-latest']._s;
var GeoCoder = Package['aldeed:geocoder'].GeoCoder;
var SimpleSchema = Package['aldeed:simple-schema'].SimpleSchema;
var MongoObject = Package['aldeed:simple-schema'].MongoObject;
var Router = Package['iron:router'].Router;
var RouteController = Package['iron:router'].RouteController;
var AccountsGuest = Package['prinzdezibel:accounts-guest'].AccountsGuest;
var getSlug = Package['ongoworks:speakingurl'].getSlug;
var logger = Package['ongoworks:bunyan-logger'].logger;
var Factory = Package['dburles:factory'].Factory;
var Fake = Package['anti:fake'].Fake;
var CollectionHooks = Package['matb33:collection-hooks'].CollectionHooks;
var Roles = Package['alanning:roles'].Roles;
var OriginalHandlebars = Package['cmather:handlebars-server'].OriginalHandlebars;
var gm = Package['cfs:graphicsmagick'].gm;
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
var check = Package.check.check;
var Match = Package.check.Match;
var Random = Package.random.Random;
var EJSON = Package.ejson.EJSON;
var HTML = Package.htmljs.HTML;
var Iron = Package['iron:core'].Iron;
var FS = Package['cfs:base-package'].FS;

/* Package-scope variables */
var ReactionCore, currentProduct, ShopController, Products, Cart, Tags, exports, Alerts, Schemas, __coffeescriptShare;

(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/reactioncommerce:core/lib/statemachine/state-machine.js                                                 //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
/*                                                                                                                  // 1
                                                                                                                    // 2
  Javascript State Machine Library - https://github.com/jakesgordon/javascript-state-machine                        // 3
                                                                                                                    // 4
  Copyright (c) 2012, 2013, 2014, 2015, Jake Gordon and contributors                                                // 5
  Released under the MIT license - https://github.com/jakesgordon/javascript-state-machine/blob/master/LICENSE      // 6
                                                                                                                    // 7
*/                                                                                                                  // 8
                                                                                                                    // 9
(function () {                                                                                                      // 10
                                                                                                                    // 11
  var StateMachine = {                                                                                              // 12
                                                                                                                    // 13
    //---------------------------------------------------------------------------                                   // 14
                                                                                                                    // 15
    VERSION: "2.3.5",                                                                                               // 16
                                                                                                                    // 17
    //---------------------------------------------------------------------------                                   // 18
                                                                                                                    // 19
    Result: {                                                                                                       // 20
      SUCCEEDED:    1, // the event transitioned successfully from one state to another                             // 21
      NOTRANSITION: 2, // the event was successfull but no state transition was necessary                           // 22
      CANCELLED:    3, // the event was cancelled by the caller in a beforeEvent callback                           // 23
      PENDING:      4  // the event is asynchronous and the caller is in control of when the transition occurs      // 24
    },                                                                                                              // 25
                                                                                                                    // 26
    Error: {                                                                                                        // 27
      INVALID_TRANSITION: 100, // caller tried to fire an event that was innapropriate in the current state         // 28
      PENDING_TRANSITION: 200, // caller tried to fire an event while an async transition was still pending         // 29
      INVALID_CALLBACK:   300 // caller provided callback function threw an exception                               // 30
    },                                                                                                              // 31
                                                                                                                    // 32
    WILDCARD: '*',                                                                                                  // 33
    ASYNC: 'async',                                                                                                 // 34
                                                                                                                    // 35
    //---------------------------------------------------------------------------                                   // 36
                                                                                                                    // 37
    create: function(cfg, target) {                                                                                 // 38
                                                                                                                    // 39
      var initial      = (typeof cfg.initial == 'string') ? { state: cfg.initial } : cfg.initial; // allow for a simple string, or an object with { state: 'foo', event: 'setup', defer: true|false }
      var terminal     = cfg.terminal || cfg['final'];                                                              // 41
      var fsm          = target || cfg.target  || {};                                                               // 42
      var events       = cfg.events || [];                                                                          // 43
      var callbacks    = cfg.callbacks || {};                                                                       // 44
      var map          = {}; // track state transitions allowed for an event { event: { from: [ to ] } }            // 45
      var transitions  = {}; // track events allowed from a state            { state: [ event ] }                   // 46
                                                                                                                    // 47
      var add = function(e) {                                                                                       // 48
        var from = (e.from instanceof Array) ? e.from : (e.from ? [e.from] : [StateMachine.WILDCARD]); // allow 'wildcard' transition if 'from' is not specified
        map[e.name] = map[e.name] || {};                                                                            // 50
        for (var n = 0 ; n < from.length ; n++) {                                                                   // 51
          transitions[from[n]] = transitions[from[n]] || [];                                                        // 52
          transitions[from[n]].push(e.name);                                                                        // 53
                                                                                                                    // 54
          map[e.name][from[n]] = e.to || from[n]; // allow no-op transition if 'to' is not specified                // 55
        }                                                                                                           // 56
      };                                                                                                            // 57
                                                                                                                    // 58
      if (initial) {                                                                                                // 59
        initial.event = initial.event || 'startup';                                                                 // 60
        add({ name: initial.event, from: 'none', to: initial.state });                                              // 61
      }                                                                                                             // 62
                                                                                                                    // 63
      for(var n = 0 ; n < events.length ; n++)                                                                      // 64
        add(events[n]);                                                                                             // 65
                                                                                                                    // 66
      for(var name in map) {                                                                                        // 67
        if (map.hasOwnProperty(name))                                                                               // 68
          fsm[name] = StateMachine.buildEvent(name, map[name]);                                                     // 69
      }                                                                                                             // 70
                                                                                                                    // 71
      for(var name in callbacks) {                                                                                  // 72
        if (callbacks.hasOwnProperty(name))                                                                         // 73
          fsm[name] = callbacks[name]                                                                               // 74
      }                                                                                                             // 75
                                                                                                                    // 76
      fsm.current     = 'none';                                                                                     // 77
      fsm.is          = function(state) { return (state instanceof Array) ? (state.indexOf(this.current) >= 0) : (this.current === state); };
      fsm.can         = function(event) { return !this.transition && (map[event].hasOwnProperty(this.current) || map[event].hasOwnProperty(StateMachine.WILDCARD)); }
      fsm.cannot      = function(event) { return !this.can(event); };                                               // 80
      fsm.transitions = function()      { return transitions[this.current]; };                                      // 81
      fsm.isFinished  = function()      { return this.is(terminal); };                                              // 82
      fsm.error       = cfg.error || function(name, from, to, args, error, msg, e) { throw e || msg; }; // default behavior when something unexpected happens is to throw an exception, but caller can override this behavior if desired (see github issue #3 and #17)
                                                                                                                    // 84
      if (initial && !initial.defer)                                                                                // 85
        fsm[initial.event]();                                                                                       // 86
                                                                                                                    // 87
      return fsm;                                                                                                   // 88
                                                                                                                    // 89
    },                                                                                                              // 90
                                                                                                                    // 91
    //===========================================================================                                   // 92
                                                                                                                    // 93
    doCallback: function(fsm, func, name, from, to, args) {                                                         // 94
      if (func) {                                                                                                   // 95
        try {                                                                                                       // 96
          return func.apply(fsm, [name, from, to].concat(args));                                                    // 97
        }                                                                                                           // 98
        catch(e) {                                                                                                  // 99
          return fsm.error(name, from, to, args, StateMachine.Error.INVALID_CALLBACK, "an exception occurred in a caller-provided callback function", e);
        }                                                                                                           // 101
      }                                                                                                             // 102
    },                                                                                                              // 103
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
    beforeEvent: function(fsm, name, from, to, args) {                                                              // 116
      if ((false === StateMachine.beforeThisEvent(fsm, name, from, to, args)) ||                                    // 117
          (false === StateMachine.beforeAnyEvent( fsm, name, from, to, args)))                                      // 118
        return false;                                                                                               // 119
    },                                                                                                              // 120
                                                                                                                    // 121
    afterEvent: function(fsm, name, from, to, args) {                                                               // 122
      StateMachine.afterThisEvent(fsm, name, from, to, args);                                                       // 123
      StateMachine.afterAnyEvent( fsm, name, from, to, args);                                                       // 124
    },                                                                                                              // 125
                                                                                                                    // 126
    leaveState: function(fsm, name, from, to, args) {                                                               // 127
      var specific = StateMachine.leaveThisState(fsm, name, from, to, args),                                        // 128
          general  = StateMachine.leaveAnyState( fsm, name, from, to, args);                                        // 129
      if ((false === specific) || (false === general))                                                              // 130
        return false;                                                                                               // 131
      else if ((StateMachine.ASYNC === specific) || (StateMachine.ASYNC === general))                               // 132
        return StateMachine.ASYNC;                                                                                  // 133
    },                                                                                                              // 134
                                                                                                                    // 135
    enterState: function(fsm, name, from, to, args) {                                                               // 136
      StateMachine.enterThisState(fsm, name, from, to, args);                                                       // 137
      StateMachine.enterAnyState( fsm, name, from, to, args);                                                       // 138
    },                                                                                                              // 139
                                                                                                                    // 140
    //===========================================================================                                   // 141
                                                                                                                    // 142
    buildEvent: function(name, map) {                                                                               // 143
      return function() {                                                                                           // 144
                                                                                                                    // 145
        var from  = this.current;                                                                                   // 146
        var to    = map[from] || map[StateMachine.WILDCARD] || from;                                                // 147
        var args  = Array.prototype.slice.call(arguments); // turn arguments into pure array                        // 148
                                                                                                                    // 149
        if (this.transition)                                                                                        // 150
          return this.error(name, from, to, args, StateMachine.Error.PENDING_TRANSITION, "event " + name + " inappropriate because previous transition did not complete");
                                                                                                                    // 152
        if (this.cannot(name))                                                                                      // 153
          return this.error(name, from, to, args, StateMachine.Error.INVALID_TRANSITION, "event " + name + " inappropriate in current state " + this.current);
                                                                                                                    // 155
        if (false === StateMachine.beforeEvent(this, name, from, to, args))                                         // 156
          return StateMachine.Result.CANCELLED;                                                                     // 157
                                                                                                                    // 158
        if (from === to) {                                                                                          // 159
          StateMachine.afterEvent(this, name, from, to, args);                                                      // 160
          return StateMachine.Result.NOTRANSITION;                                                                  // 161
        }                                                                                                           // 162
                                                                                                                    // 163
        // prepare a transition method for use EITHER lower down, or by caller if they want an async transition (indicated by an ASYNC return value from leaveState)
        var fsm = this;                                                                                             // 165
        this.transition = function() {                                                                              // 166
          fsm.transition = null; // this method should only ever be called once                                     // 167
          fsm.current = to;                                                                                         // 168
          StateMachine.enterState( fsm, name, from, to, args);                                                      // 169
          StateMachine.changeState(fsm, name, from, to, args);                                                      // 170
          StateMachine.afterEvent( fsm, name, from, to, args);                                                      // 171
          return StateMachine.Result.SUCCEEDED;                                                                     // 172
        };                                                                                                          // 173
        this.transition.cancel = function() { // provide a way for caller to cancel async transition if desired (issue #22)
          fsm.transition = null;                                                                                    // 175
          StateMachine.afterEvent(fsm, name, from, to, args);                                                       // 176
        }                                                                                                           // 177
                                                                                                                    // 178
        var leave = StateMachine.leaveState(this, name, from, to, args);                                            // 179
        if (false === leave) {                                                                                      // 180
          this.transition = null;                                                                                   // 181
          return StateMachine.Result.CANCELLED;                                                                     // 182
        }                                                                                                           // 183
        else if (StateMachine.ASYNC === leave) {                                                                    // 184
          return StateMachine.Result.PENDING;                                                                       // 185
        }                                                                                                           // 186
        else {                                                                                                      // 187
          if (this.transition) // need to check in case user manually called transition() but forgot to return StateMachine.ASYNC
            return this.transition();                                                                               // 189
        }                                                                                                           // 190
                                                                                                                    // 191
      };                                                                                                            // 192
    }                                                                                                               // 193
                                                                                                                    // 194
  }; // StateMachine                                                                                                // 195
                                                                                                                    // 196
  //===========================================================================                                     // 197
                                                                                                                    // 198
  //======                                                                                                          // 199
  // NODE                                                                                                           // 200
  //======                                                                                                          // 201
  if (typeof exports !== 'undefined') {                                                                             // 202
    if (typeof module !== 'undefined' && module.exports) {                                                          // 203
      exports = module.exports = StateMachine;                                                                      // 204
    }                                                                                                               // 205
    exports.StateMachine = StateMachine;                                                                            // 206
  }                                                                                                                 // 207
  //============                                                                                                    // 208
  // AMD/REQUIRE                                                                                                    // 209
  //============                                                                                                    // 210
  else if (typeof define === 'function' && define.amd) {                                                            // 211
    define(function(require) { return StateMachine; });                                                             // 212
  }                                                                                                                 // 213
  //========                                                                                                        // 214
  // BROWSER                                                                                                        // 215
  //========                                                                                                        // 216
  else if (typeof window !== 'undefined') {                                                                         // 217
    window.StateMachine = StateMachine;                                                                             // 218
  }                                                                                                                 // 219
  //===========                                                                                                     // 220
  // WEB WORKER                                                                                                     // 221
  //===========                                                                                                     // 222
  else if (typeof self !== 'undefined') {                                                                           // 223
    self.StateMachine = StateMachine;                                                                               // 224
  }                                                                                                                 // 225
                                                                                                                    // 226
}());                                                                                                               // 227
                                                                                                                    // 228
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/reactioncommerce:core/common/packageGlobals.js                                                          //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
// exported, global/window scope                                                                                    // 1
ReactionCore = {};                                                                                                  // 2
ReactionCore.Schemas = {};                                                                                          // 3
ReactionCore.Collections = {};                                                                                      // 4
ReactionCore.Helpers = {};                                                                                          // 5
ReactionCore.Packages = {};                                                                                         // 6
ReactionCore.MetaData = {};                                                                                         // 7
ReactionCore.Locale = {};                                                                                           // 8
ReactionCore.Events = {};                                                                                           // 9
                                                                                                                    // 10
if (Meteor.isClient) {                                                                                              // 11
  ReactionCore.Alerts = {};                                                                                         // 12
  ReactionCore.Subscriptions = {};                                                                                  // 13
}                                                                                                                   // 14
                                                                                                                    // 15
// convenience                                                                                                      // 16
Alerts = ReactionCore.Alerts;                                                                                       // 17
Schemas = ReactionCore.Schemas;                                                                                     // 18
                                                                                                                    // 19
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/reactioncommerce:core/common/common.coffee.js                                                           //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;

/*
 * Common settings for CollectionFS
 */
FS.HTTP.setBaseUrl('/assets');

FS.HTTP.setHeadersForGet([['Cache-Control', 'public, max-age=31536000']]);
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/reactioncommerce:core/common/register.coffee.js                                                         //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
ReactionCore.registerPackage = function(packageInfo) {
  return ReactionCore.Packages[packageInfo.name] = packageInfo;
};

ReactionCore.registerPackage({
  name: 'reaction-commerce',
  depends: ['fileUploader', 'staffAccountsManager', 'paymentMethod', 'mailService', 'analytics', 'shipmentMethod'],
  label: 'Core',
  description: 'Reaction Commerce Core',
  icon: 'fa fa-sun-o',
  settingsRoute: 'dashboard/settings/shop',
  overviewRoute: 'dashboard',
  overViewLabel: 'Dashboard',
  overviewIcon: 'fa fa-th',
  priority: '3',
  hidden: false,
  autoEnable: true,
  hasWidget: false,
  shopPermissions: [
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
      label: "General Shop",
      permission: "dashboard/settings",
      group: "Shop Settings"
    }
  ]
});

ReactionCore.registerPackage({
  name: 'reaction-commerce-orders',
  provides: ['orderManager'],
  label: 'Orders',
  description: 'Fulfill your orders',
  icon: 'fa fa-sun-o',
  overviewRoute: 'dashboard/orders',
  settingsRoute: 'dashboard/orders',
  hidden: false,
  autoEnable: true,
  shopPermissions: [
    {
      label: "Orders",
      permission: "dashboard/orders",
      group: "Shop Management"
    }
  ]
});

ReactionCore.registerPackage({
  name: 'reaction-commerce-staff-accounts',
  provides: ['staffAccountsManager'],
  label: 'Administrative Users',
  description: 'Administrative user management',
  icon: 'fa fa-users',
  settingsRoute: 'dashboard/settings/account',
  autoEnable: true,
  shopPermissions: [
    {
      label: "Dashboard Access",
      permission: "dashboard/settings/account",
      group: "Shop Settings"
    }
  ]
}, ReactionCore.registerPackage({
  name: 'reaction-commerce-create-products',
  hidden: true,
  overviewRoute: 'createProduct',
  overViewLabel: 'Create',
  overviewIcon: 'fa fa-plus'
}));
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/reactioncommerce:core/common/routing.coffee.js                                                          //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;

/*
 * Helper method to set default/parameterized product variant
 */
var LandingController, ShopAdminController, setProduct;                

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
 *  Global Reaction Routes
 *  Extend/override in reaction/client/routing.coffee
 */

Router.configure({
  notFoundTemplate: "notFound",
  loadingTemplate: "loading",
  onBeforeAction: function() {
    this.render("loading");
    Alerts.removeSeen();
    this.next();
  }
});

this.LandingController = RouteController.extend({
  onAfterAction: function() {
    ReactionCore.MetaData.refresh(this.route, this.params);
  },
  layoutTemplate: "layout"
});

LandingController = this.LandingController;

this.ShopController = RouteController.extend({
  waitOn: function() {
    this.subscribe("shops");
    return this.subscribe("cart", Session.get("sessionId", Meteor.userId()));
  },
  onBeforeAction: function() {
    if (!(ReactionCore.isVendor(this.route.getName()) || ReactionCore.hasPermission(this.route.getName()))) {
      this.render('unauthorized');
    } else {
      this.next();
    }
  },
  onAfterAction: function() {
    ReactionCore.MetaData.refresh(this.route, this.params);
  },
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
  }
});

ShopController = this.ShopController;

this.ShopAdminController = this.ShopController.extend({
  waitOn: function() {
    return this.subscribe("shops");
  },
  onBeforeAction: function() {
    if (!ReactionCore.hasPermission(this.route.getName())) {
      this.render('unauthorized');
    } else {
      this.next();
    }
  }
});

ShopAdminController = this.ShopAdminController;

Router.map(function() {
  this.route("index", {
    controller: LandingController,
    path: "/",
    name: "index",
    template: "index",
    waitOn: function() {
      return this.subscribe("products");
    }
  });
  this.route("products", {
    controller: ShopController,
    path: "/products",
    name: "products",
    template: "products",
    waitOn: function() {
      return this.subscribe("products");
    }
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
    template: 'settingsGeneral',
    data: function() {
      return Shops.findOne();
    }
  });
  this.route('dashboard/settings/account', {
    controller: ShopAdminController,
    path: '/dashboard/settings/account',
    template: 'settingsAccount'
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
    controller: ShopController,
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
    controller: ShopController,
    path: 'product/:_id/:variant?',
    template: 'productDetail',
    waitOn: function() {
      return Meteor.subscribe('product', this.params._id);
    },
    onBeforeAction: function() {
      var variant;
      variant = this.params.variant || this.params.query.variant;
      setProduct(this.params._id, variant);
      this.next();
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
    subscriptions: function() {
      this.subscribe("shops");
      this.subscribe("products");
      this.subscribe("shipping");
      this.subscribe("packages");
      this.subscribe("userOrders", Meteor.userId());
      return this.subscribe("cart", Session.get("sessionId", Meteor.userId()));
    }
  });
  return this.route('cartCompleted', {
    controller: ShopController,
    path: 'completed/:_id',
    template: 'cartCompleted',
    subscriptions: function() {
      return this.subscribe("userOrders", Meteor.userId());
    },
    data: function() {
      if (this.ready()) {
        if (Orders.findOne(this.params._id)) {
          return Orders.findOne(this.params._id);
        } else {
          return this.render('unauthorized');
        }
      } else {
        return this.render("loading");
      }
    }
  });
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/reactioncommerce:core/common/schemas/packages.coffee.js                                                 //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;

/*
 * Packages
 */
ReactionCore.Schemas.PackageConfig = new SimpleSchema({
  shopId: {
    type: String,
    index: 1,
    autoValue: function() {
      if (this.isInsert) {
        if (Meteor.isClient) {
          return ReactionCore.getShopId() || "1";
        }
        return ReactionCore.getShopId();
      } else {
        return this.unset();
      }
    }
  },
  name: {
    type: String,
    index: 1
  },
  enabled: {
    type: Boolean,
    defaultValue: true
  },
  property: {
    type: String,
    optional: true
  },
  settings: {
    type: Object,
    optional: true,
    blackbox: true
  },
  registry: {
    type: Object,
    optional: true,
    blackbox: true
  }
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/reactioncommerce:core/common/schemas/shops.coffee.js                                                    //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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

ReactionCore.Schemas.Address = new SimpleSchema({
  _id: {
    type: String,
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
    optional: true,
    label: "Company"
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
    label: "This is a commercial address",
    type: Boolean
  },
  isDefault: {
    label: "This is my default address",
    type: Boolean
  },
  metafields: {
    type: [ReactionCore.Schemas.Metafield],
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

ReactionCore.Schemas.currencyEngine = new SimpleSchema({
  provider: {
    type: String,
    defaultValue: "OXR"
  },
  apiKey: {
    type: String,
    optional: true,
    label: "Open Exchange Rates App ID"
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
  email: {
    type: String
  },
  currency: {
    type: String,
    defaultValue: "USD"
  },
  currencyEngine: {
    type: ReactionCore.Schemas.currencyEngine
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
  canCheckoutAsGuest: {
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
  useCustomEmailSettings: {
    type: Boolean,
    optional: true
  },
  customEmailSettings: {
    type: ReactionCore.Schemas.CustomEmailSettings
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
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/reactioncommerce:core/common/schemas/shipping.coffee.js                                                 //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
ReactionCore.Schemas.Shipping = new SimpleSchema({
  shopId: {
    type: String,
    index: 1,
    autoValue: function() {
      if (this.isInsert) {
        if (Meteor.isClient) {
          return ReactionCore.getShopId() || "1";
        }
        return ReactionCore.getShopId();
      } else {
        return this.unset();
      }
    }
  },
  provider: {
    type: ReactionCore.Schemas.ShippingProvider
  },
  methods: {
    type: [ReactionCore.Schemas.ShippingMethod],
    optional: true
  }
});

ReactionCore.Schemas.ShipmentQuote = new SimpleSchema({
  carrier: {
    type: String
  },
  method: {
    type: ReactionCore.Schemas.ShippingMethod
  },
  rate: {
    type: Number,
    decimal: true
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
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/reactioncommerce:core/common/schemas/products.coffee.js                                                 //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
ReactionCore.Schemas.Social = new SimpleSchema({
  service: {
    type: String
  },
  handle: {
    type: String
  }
});


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
    type: String,
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
  positions: {
    type: [ReactionCore.Schemas.ProductPosition],
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
  },
  minimumQty: {
    label: "Minimum Quantity",
    type: Number,
    min: 1,
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
    type: String
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
  metafields: {
    type: [ReactionCore.Schemas.Metafield],
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
  instagramMsg: {
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
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/reactioncommerce:core/common/schemas/tags.coffee.js                                                     //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
    index: 1
  },
  createdAt: {
    type: Date
  },
  updatedAt: {
    type: Date
  }
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/reactioncommerce:core/common/schemas/cart.coffee.js                                                     //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
    index: 1
  },
  sessionId: {
    type: String,
    optional: true,
    custom: function() {
      var userIdField;
      userIdField = this.siblingField("userId");
      if (this.isInsert && !this.value && !userIdField.value) {
        return "required";
      }
    },
    index: 1
  },
  userId: {
    type: String,
    optional: true,
    index: 1
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
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/reactioncommerce:core/common/schemas/orders.coffee.js                                                   //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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

ReactionCore.Schemas.Payment = new SimpleSchema({
  address: {
    type: ReactionCore.Schemas.Address,
    optional: true
  },
  paymentMethod: {
    type: [ReactionCore.Schemas.PaymentMethod],
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
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/reactioncommerce:core/common/schemas/translations.coffee.js                                             //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
ReactionCore.Collections.Translations = new Mongo.Collection("Translations");
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/reactioncommerce:core/common/schemas/taxes.coffee.js                                                    //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
    type: String
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
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/reactioncommerce:core/common/schemas/shipping.coffee.js                                                 //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
ReactionCore.Schemas.Shipping = new SimpleSchema({
  shopId: {
    type: String,
    index: 1,
    autoValue: function() {
      if (this.isInsert) {
        if (Meteor.isClient) {
          return ReactionCore.getShopId() || "1";
        }
        return ReactionCore.getShopId();
      } else {
        return this.unset();
      }
    }
  },
  provider: {
    type: ReactionCore.Schemas.ShippingProvider
  },
  methods: {
    type: [ReactionCore.Schemas.ShippingMethod],
    optional: true
  }
});

ReactionCore.Schemas.ShipmentQuote = new SimpleSchema({
  carrier: {
    type: String
  },
  method: {
    type: ReactionCore.Schemas.ShippingMethod
  },
  rate: {
    type: Number,
    decimal: true
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
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/reactioncommerce:core/common/schemas/discounts.coffee.js                                                //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
    type: String
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
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/reactioncommerce:core/common/collections/collections.coffee.js                                          //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var Customers, Orders, Shops;                      

ReactionCore.Collections.Cart = Cart = this.Cart = new Mongo.Collection("Cart");

ReactionCore.Collections.Cart.attachSchema(ReactionCore.Schemas.Cart);

ReactionCore.Collections.Customers = Customers = this.Customers = new Mongo.Collection("Customers");

ReactionCore.Collections.Customers.attachSchema(ReactionCore.Schemas.Customer);

ReactionCore.Collections.Orders = Orders = this.Orders = new Mongo.Collection("Orders");

ReactionCore.Collections.Orders.attachSchema([ReactionCore.Schemas.Cart, ReactionCore.Schemas.OrderItems]);

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
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/reactioncommerce:core/common/collections/collectionFS.coffee.js                                         //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
ReactionCore.Collections.FileStorage = new FS.Collection("FileStorage", {
  stores: [new FS.Store.GridFS("docfiles")]
});

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
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/reactioncommerce:core/common/helpers/helpers.coffee.js                                                  //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
ReactionCore.Collections.Packages.helpers({
  info: function() {
    return ReactionCore.Packages[this.name];
  }
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/reactioncommerce:core/common/hooks/hooks.coffee.js                                                      //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var applyVariantDefaults;

applyVariantDefaults = function(variant) {
  return _.defaults(variant, {
    _id: Random.id(),
    inventoryManagement: true,
    inventoryPolicy: true,
    updatedAt: new Date(),
    createdAt: new Date(),
    minimumQty: 1
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
  var addToSet, createdAt, parentVariant, position, qty, updatedAt, variant, _i, _len, _ref, _ref1, _ref2, _ref3;
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
    return modifier.$set.updatedAt = new Date();
  }
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/reactioncommerce:core/server/app.coffee.js                                                              //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;

/*
 * configure bunyan logging module for reaction server
 * See: https://github.com/trentm/node-bunyan#levels
 */
var canCheckoutAsGuest, isDebug, levels;

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
  name: "reactioncommerce:core",
  serializers: logger.bunyan.stdSerializers,
  streams: [
    {
      level: "debug",
      stream: (isDebug !== "DEBUG" ? logger.bunyanPretty() : process.stdout)
    }, {
      level: "error",
      path: "reaction.log"
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
    return this.getCurrentShop(client)._id;
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
}, canCheckoutAsGuest = function(client) {
  return this.getCurrentShop(client).canCheckoutAsGuest || false;
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/reactioncommerce:core/server/publications.coffee.js                                                     //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var AutoSet, Customers, Discounts, FileStorage, Media, Orders, Packages, Security, ServerSessions, Shipping, Shops, Taxes, Translations, addAllowFuncForAll, addDenyFuncForAll;                      

Cart = ReactionCore.Collections.Cart;

Customers = ReactionCore.Collections.Customers;

Discounts = ReactionCore.Collections.Discounts;

FileStorage = ReactionCore.Collections.FileStorage;

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
 * Generic Security Rule Manager
 */

addAllowFuncForAll = function(collections, types, fetch, func) {
  var rules;
  rules = {
    fetch: fetch
  };
  _.each(types, function(t) {
    return rules[t] = func;
  });
  return _.each(collections, function(c) {
    return c.allow(rules);
  });
};

addDenyFuncForAll = function(collections, types, fetch, func) {
  var rules;
  rules = {
    fetch: fetch
  };
  _.each(types, function(t) {
    return rules[t] = func;
  });
  return _.each(collections, function(c) {
    return c.deny(rules);
  });
};

Security = {
  defaultAllow: function(collections) {
    return addAllowFuncForAll(collections, ["insert", "update", "remove"], [], function(userId) {
      return true;
    });
  },
  allowAnonymousFileDownloads: function(collections) {
    return addAllowFuncForAll(collections, ["download"], [], function(userId) {
      return true;
    });
  },
  allowOnlyRoles: function(roles, types, collections) {
    return addDenyFuncForAll(collections, types, [], function(userId) {
      return !Roles.userIsInRole(userId, roles);
    });
  },
  mustMatchShop: function(collections) {
    return addDenyFuncForAll(collections, ["update", "remove"], ["shopId"], function(userId, doc) {
      return doc.shopId !== ReactionCore.getShopId();
    });
  },
  cantChangeShop: function(collections) {
    return addDenyFuncForAll(collections, ["update"], [], function(userId, doc, fields, modifier) {
      var _ref;
      return !!((_ref = modifier.$set) != null ? _ref.shopId : void 0);
    });
  },
  mustMatchUser: function(types, collections) {
    return addDenyFuncForAll(collections, types, ["userId"], function(userId, doc) {
      return (userId != null) && (doc.userId != null) && doc.userId !== userId;
    });
  },
  fileMustBelongToShop: function(collections) {
    return addDenyFuncForAll(collections, ["insert", "update", "remove"], [], function(userId, fileObj) {
      return fileObj.metadata.shopId !== ReactionCore.getShopId(this);
    });
  },
  denyAll: function(types, collections) {
    return addDenyFuncForAll(collections, types, [], function() {
      return true;
    });
  }
};


/*
 * Method to Auto-Set Props on Insert
 */

AutoSet = function(prop, collections, valFunc) {
  return _.each(collections, function(c) {
    return c.deny({
      insert: function(userId, doc) {
        doc[prop] = valFunc();
        return false;
      },
      fetch: []
    });
  });
};

AutoSet("shopId", [Packages, Orders, Cart, Tags, Shipping, Taxes, Discounts], function() {
  return ReactionCore.getShopId();
});


/*
 * We add some common security rules through simple Security methods
 */

Security.defaultAllow([Media, FileStorage, Packages, Products, Orders, Cart, Tags, Translations, Discounts, Taxes, Shipping]);

Security.allowOnlyRoles(['admin'], ["insert", "update", "remove"], [Media, FileStorage, Products, Tags, Translations, Discounts, Taxes, Shipping]);

Security.allowOnlyRoles(['admin'], ["update", "remove"], [Shops]);

Security.allowOnlyRoles(['owner'], ["remove"], [Orders]);

Security.mustMatchShop([Packages, Products, Orders, Cart, Tags, Discounts, Taxes, Shipping]);

Security.cantChangeShop([Packages, Products, Orders, Cart, Tags, Discounts, Taxes, Shipping]);

Security.denyAll(["insert", "remove"], [Cart]);

Security.mustMatchUser(["update"], [Cart]);

Security.fileMustBelongToShop([Media, FileStorage]);

Security.allowAnonymousFileDownloads([Media, FileStorage]);


/*
 * Extra client access rights for shops
 * XXX These should be verified and might be able to be folded into Security above
 */

Shops.allow({
  insert: function(userId, doc) {
    return userId && doc.ownerId === userId;
  },
  update: function(userId, doc, fields, modifier) {
    return doc.ownerId === userId;
  },
  remove: function(userId, doc) {
    return doc.ownerId === userId;
  },
  fetch: ["ownerId"]
});


/*
 * Beyond this point is publication functions
 */


/*
 * Reaction Server / amplify permanent sessions
 * If no id is passed we create a new session
 * Load the session
 * If no session is loaded, creates a new one
 */

ServerSessions = new Mongo.Collection("ReactionSessions");

Meteor.publish('ReactionSessions', function(id) {
  var created, serverSession;
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
 * CollectionFS - Generated Docs (invoices) Publication
 */

Meteor.publish("FileStorage", function() {
  return FileStorage.find();
});


/*
 * i18n - translations
 */

Meteor.publish("Translations", function() {
  return Translations.find();
});


/*
 * get any user name,social profile image
 * should be limited, secure information
 */

Meteor.publish("UserProfile", function(profileId) {
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
    return Packages.find({
      shopId: shop._id
    }, {
      sort: {
        priority: 1
      }
    });
  } else {
    return [];
  }
});


/*
 * shop collection
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
          'profile': 1
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
          'profile': 1
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
 * product collection
 */

Meteor.publish('products', function(userId) {
  var selector, shop;
  shop = ReactionCore.getCurrentShop(this);
  if (shop) {
    selector = {
      shopId: shop._id
    };
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
 * orders collection
 */

Meteor.publish('orders', function() {
  if (Roles.userIsInRole(this.userId, ['admin', 'owner'])) {
    return Orders.find({
      shopId: ReactionCore.getShopId(this)
    });
  } else {
    return [];
  }
});

Meteor.publish('userOrders', function(userId) {
  return Orders.find({
    shopId: ReactionCore.getShopId(this),
    userId: this.userId
  });
});


/*
 * cart collection
 */

Meteor.publish('cart', function(sessionId) {
  var cart, shopId;
  if (!sessionId) {
    return;
  }
  check(sessionId, String);
  shopId = ReactionCore.getShopId(this);
  cart = createCart(sessionId, this.userId, shopId);
  return Cart.find({
    _id: cart._id
  });
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
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/reactioncommerce:core/server/fixtures.coffee.js                                                         //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;

/*
 * Fixtures is a global object that it can be reused in packages
 * assumes collection data in reaction-core/private/data, optionally jsonFile
 * use jsonFile when calling from another package, as we can't read the assets from here
 * ex:
 *   jsonFile =  Assets.getText("private/data/Shipping.json")
 *   Fixtures.loadData ReactionCore.Collections.Shipping, jsonFile
 */
var PackageFixture, createDefaultAdminUser, getDomain, loadFixtures;

PackageFixture = function() {
  return {
    loadData: function(collection, jsonFile) {
      var item, json, value, _i, _len;
      if (collection.find().count() > 0) {
        return;
      }
      ReactionCore.Events.info("Loading fixture data for " + collection._name);
      if (!jsonFile) {
        json = EJSON.parse(Assets.getText("private/data/" + collection._name + ".json"));
      } else {
        json = EJSON.parse(jsonFile);
      }
      for (value = _i = 0, _len = json.length; _i < _len; value = ++_i) {
        item = json[value];
        collection._collection.insert(item, function(error, result) {
          if (error) {
            ReactionCore.Events.info(error + "Error adding " + value + " items to " + collection._name);
            return false;
          }
        });
      }
      if (value > 0) {
        ReactionCore.Events.info("Success adding " + value + " items to " + collection._name);
      } else {
        ReactionCore.Events.info("No data imported to " + collection._name);
      }
    },
    loadI18n: function(collection) {
      var item, json, language, languages, value, _i, _len, _results;
      if (collection.find().count() > 0) {
        return;
      }
      languages = ["ar", "cn", "cs", "de", "en", "es", "fr", "he", "it", "my", "pl", "pt", "ru", "sl", "sv", "vi"];
      ReactionCore.Events.info("Loading fixture data for languages to " + collection._name);
      _results = [];
      for (_i = 0, _len = languages.length; _i < _len; _i++) {
        language = languages[_i];
        json = EJSON.parse(Assets.getText("private/data/i18n/" + language + ".json"));
        _results.push((function() {
          var _j, _len1, _results1;
          _results1 = [];
          for (value = _j = 0, _len1 = json.length; _j < _len1; value = ++_j) {
            item = json[value];
            collection._collection.insert(item, function(error, result) {
              if (error) {
                ReactionCore.Events.info(error + "Error adding " + language + " items to " + collection._name);
              }
            });
            _results1.push(ReactionCore.Events.info("Success adding " + language + " to " + collection._name));
          }
          return _results1;
        })());
      }
      return _results;
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
      ownerId: accountId,
      email: options.email
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
  var _ref, _ref1;
  Fixtures.loadData(ReactionCore.Collections.Products);
  Fixtures.loadData(ReactionCore.Collections.Shops);
  Fixtures.loadData(ReactionCore.Collections.Tags);
  Fixtures.loadI18n(ReactionCore.Collections.Translations);
  if (!Accounts.loginServiceConfiguration.find().count()) {
    if ((_ref = Meteor.settings["public"]) != null ? (_ref1 = _ref.facebook) != null ? _ref1.appId : void 0 : void 0) {
      Accounts.loginServiceConfiguration.insert({
        service: "facebook",
        appId: Meteor.settings["public"].facebook.appId,
        secret: Meteor.settings.facebook.secret
      });
    }
  }
  if (ReactionCore.Collections.Packages.find().count() !== Object.keys(ReactionCore.Packages).length) {
    _.each(ReactionCore.Packages, function(config, pkgName) {
      return Shops.find().forEach(function(shop) {
        ReactionCore.Events.info("Initializing " + pkgName);
        return ReactionCore.Collections.Packages.upsert({
          shopId: shop._id,
          name: pkgName
        }, {
          $setOnInsert: {
            enabled: !!config.autoEnable,
            settings: config.defaultSettings,
            registry: config
          }
        });
      });
    });
    Shops.find().forEach(function(shop) {
      return ReactionCore.Collections.Packages.find().forEach(function(pkg) {
        if (!_.has(ReactionCore.Packages, pkg.name)) {
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
  var currentDomain;
  loadFixtures();
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
  Cart.update({
    userId: {
      $exists: true,
      $ne: null
    },
    sessionId: {
      $exists: true
    }
  }, {
    $unset: {
      sessionId: ""
    }
  }, {
    multi: true
  });
  return ReactionCore.Events.info("Reaction Commerce initialization finished. ");
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/reactioncommerce:core/server/factories.coffee.js                                                        //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
        isDefault: true,
        metafields: void 0
      }
    ];
  },
  domains: ["localhost"],
  email: 'root@localhost',
  currency: "USD",
  currencyEngine: void 0,
  currencies: [],
  "public": true,
  timezone: '1',
  baseUOM: "OZ",
  ownerId: '1',
  members: [],
  metafields: [],
  useCustomEmailSettings: false,
  customEmailSettings: {
    username: '',
    password: '',
    host: '',
    port: 25
  },
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
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/reactioncommerce:core/server/methods/methods.coffee.js                                                  //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
    if (!Roles.userIsInRole(Meteor.userId(), ['admin'])) {
      throw new Meteor.Error(403, "Access Denied");
    }
    if (currentTagId) {
      Tags.update(currentTagId, {
        $pull: {
          "relatedTagIds": tagId
        }
      });
    }
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
    Fixtures.loadI18n(ReactionCore.Collections.Translations);
    return ReactionCore.Events.info(Meteor.userId() + " Flushed Translations.");
  }
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/reactioncommerce:core/server/methods/cart/methods.coffee.js                                             //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
Meteor.methods({

  /*
   * when we add an item to the cart, we want to break all relationships
   * with the existing item. We want to fix price, qty, etc into history
   * however, we could check reactively for price /qty etc, adjustments on
   * the original and notify them
   */
  addToCart: function(cartSession, productId, variantData, quantity) {
    var cartVariantExists, currentCart, shopId;
    shopId = ReactionCore.getShopId(this);
    currentCart = createCart(cartSession.sessionId, this.userId, shopId);
    if (!currentCart) {
      return false;
    }
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
      return Cart.update({
        _id: currentCart._id
      }, {
        $addToSet: {
          items: {
            _id: Random.id(),
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
   * add payment method
   */
  paymentMethod: function(sessionId, cartId, paymentMethod) {
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
      $addToSet: {
        "payment.paymentMethod": paymentMethod
      }
    });
  },

  /*
   * adjust inventory when an order is placed
   */
  inventoryAdjust: function(orderId) {
    var order, product, _i, _len, _ref;
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
   */
  copyCartToOrder: function(cart) {
    var currentCartId, currentUserId, error, now;
    currentUserId = Meteor.userId();
    if (cart.shopId !== ReactionCore.getShopId(this) || cart.userId !== currentUserId) {
      return false;
    }
    currentCartId = cart._id;
    now = new Date();
    cart.createdAt = now;
    cart.updatedAt = now;
    cart._id = Random.id();
    cart.state = "orderCreated";
    cart.status = "new";
    try {
      Orders.insert(cart);
      Cart.remove({
        _id: currentCartId
      });
    } catch (_error) {
      error = _error;
      ReactionCore.Events.info("error in order insert");
      ReactionCore.Events.warn(error, Orders.simpleSchema().namedContext().invalidKeys());
    }
    return cart._id;
  },

  /*
   * method to add new addresses to a user's profile
   */
  addressBookAdd: function(doc) {
    var currentUserId;
    check(doc, ReactionCore.Schemas.Address);
    this.unblock();
    currentUserId = Meteor.userId();
    if (doc.isDefault) {
      Meteor.users.update({
        _id: currentUserId,
        "profile.addressBook.isDefault": true
      }, {
        $set: {
          "profile.addressBook.$.isDefault": false
        }
      });
    }
    doc._id = Random.id();
    return Meteor.users.update({
      _id: currentUserId
    }, {
      $addToSet: {
        "profile.addressBook": doc
      }
    });
  },

  /*
   *method to update existing address in user's profile
   */
  addressBookUpdate: function(doc) {
    var currentUserId;
    check(doc, ReactionCore.Schemas.Address);
    this.unblock();
    currentUserId = Meteor.userId();
    if (doc.isDefault) {
      Meteor.users.update({
        _id: currentUserId,
        "profile.addressBook.isDefault": true
      }, {
        $set: {
          "profile.addressBook.$.isDefault": false
        }
      });
    }
    return Meteor.users.update({
      _id: currentUserId,
      "profile.addressBook._id": doc._id
    }, {
      $set: {
        "profile.addressBook.$": doc
      }
    });
  }
});


/*
 * create a cart
 * create for session if necessary, update user if necessary,
 * sync all user's carts, and return the cart
 *
 * * There should be one cart for each independent, non logged in user session
 * * When a user logs in that cart now belongs to that user
 * * If they are logged in on more than one devices, regardless of session, that cart will be used
 * * If they had more than one cart, on more than one device, and login at seperate times it should merge the carts
 */

this.createCart = function(sessionId, userId, shopId) {
  var error, newCartId, result, sessionCart, userCart;
  try {
    sessionCart = Cart.findOne({
      sessionId: sessionId,
      shopId: shopId
    });
    if (userId != null) {
      userCart = Cart.findOne({
        userId: userId,
        shopId: shopId
      });
      if (sessionCart != null) {
        if (userCart != null) {
          Cart.update(userCart._id, {
            $addToSet: {
              items: {
                $each: sessionCart.items || []
              }
            }
          });
          Cart.remove({
            _id: sessionCart._id
          });
          result = Cart.findOne({
            _id: userCart._id
          });
          ReactionCore.Events.info("Merged session cart", sessionCart._id, "into user cart", userCart._id);
        } else {
          Cart.update(sessionCart._id, {
            $set: {
              userId: userId
            },
            $unset: {
              sessionId: ""
            }
          });
          result = Cart.findOne({
            _id: sessionCart._id
          });
          ReactionCore.Events.info("Converted cart", sessionCart._id, "from session cart to user cart");
        }
      } else {
        if (userCart != null) {
          result = userCart;
          ReactionCore.Events.info("Using existing user cart", userCart._id);
        } else {
          newCartId = Cart.insert({
            userId: userId,
            shopId: shopId
          });
          result = Cart.findOne({
            _id: newCartId
          });
          ReactionCore.Events.info("Created new user cart", newCartId);
        }
      }
    } else {
      if (sessionCart != null) {
        result = sessionCart;
        ReactionCore.Events.info("Using existing session cart", sessionCart._id);
      } else {
        newCartId = Cart.insert({
          sessionId: sessionId,
          shopId: shopId
        });
        result = Cart.findOne({
          _id: newCartId
        });
        ReactionCore.Events.info("Created new session cart", newCartId);
      }
    }
  } catch (_error) {
    error = _error;
    ReactionCore.Events.info("createCart error: ", error);
  }
  return result;
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/reactioncommerce:core/server/methods/cart/checkout/methods.coffee.js                                    //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;

/*
 * methods typically used for checkout (shipping, taxes, etc)
 */
Meteor.methods({

  /*
   * gets shipping rates and updates the users cart methods
   */
  updateShipmentQuotes: function(cartSession) {
    var cart, rates, _ref, _ref1;
    if (!cartSession) {
      ReactionCore.Events.info("no cart passed to update rates, return null.");
      return null;
    }
    if (((_ref = cartSession.shipping) != null ? _ref.address : void 0) && ((_ref1 = cartSession.shipping) != null ? _ref1.shipmentQuotes : void 0)) {
      return;
    }
    cart = Cart.findOne(cartSession._id);
    rates = Meteor.call("getShippingRates");
    if (rates.length > 0) {
      ReactionCore.Collections.Cart.update({
        '_id': cartSession._id
      }, {
        $set: {
          'shipping.shipmentQuotes': rates
        }
      });
    }
    ReactionCore.Events.debug(rates);
    return rates;
  },

  /*
   *  just gets rates, without updating anything
   */
  getShippingRates: function(cartSession) {
    var rates, shipping;
    rates = [];
    shipping = ReactionCore.Collections.Shipping.find({
      'shopId': ReactionCore.getShopId()
    });
    shipping.forEach(function(shipping) {
      var index, method, rate, _i, _len, _ref, _results;
      _ref = shipping.methods;
      _results = [];
      for (index = _i = 0, _len = _ref.length; _i < _len; index = ++_i) {
        method = _ref[index];
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
          rate: rate
        }));
      }
      return _results;
    });
    ReactionCore.Events.info("getShippingrates returning rates");
    return rates;
  }
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/reactioncommerce:core/server/methods/orders/methods.coffee.js                                           //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
Meteor.methods({

  /*
   * Adds tracking information to order
   * Call after any tracking code is generated
   */
  addTracking: function(orderId, tracking, variantId) {
    check(orderId, String);
    return Orders.update(orderId, {
      $set: {
        "shipping.shipmentMethod.tracking": tracking
      }
    });
  },

  /*
   * Save supplied order workflow state
   */
  updateWorkflow: function(orderId, currentState) {
    check(orderId, String);
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
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/reactioncommerce:core/server/methods/products/methods.coffee.js                                         //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
  updateVariant: function(variant) {
    var newVariant, product, value, variants, _i, _len, _ref;
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
   * clone a whole product, defaulting visibility, etc
   * in the future we are going to do an inheritance product
   * that maintains relationships with the cloned
   * product tree
   */
  cloneProduct: function(product) {
    var handleCount, i, newVariantId, oldVariantId;
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
  deleteProduct: function(id) {
    var numRemoved;
    if (!Roles.userIsInRole(Meteor.userId(), ['admin'])) {
      throw new Meteor.Error(403, "Access Denied");
    }
    numRemoved = Products.remove(id);
    if (numRemoved > 0) {
      Media.update({
        'metadata.productId': id
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
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/reactioncommerce:core/server/methods/accounts/accounts.coffee.js                                        //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;

/*
 * add social image to user profile upon registration
 */
var setMailUrlForShop;

Accounts.onCreateUser(function(options, user) {
  user.profile = options.profile || {};
  if (user.services.facebook) {
    options.profile.picture = "http://graph.facebook.com/" + user.services.facebook.id + "/picture/?type=small";
  }
  return user;
});


/*
 * setting defaults of mail from shop configuration
 */

setMailUrlForShop = function(shop) {
  var mailgun, sCES;
  mailgun = ReactionCore.Collections.Packages.findOne({
    shopId: shop._id,
    name: 'reaction-mailgun'
  });
  sCES = null;
  if (mailgun && mailgun.settings) {
    sCES = mailgun.settings;
  } else {
    if (shop.useCustomEmailSettings) {
      sCES = shop.customEmailSettings;
    }
  }
  if (sCES) {
    return process.env.MAIL_URL = "smtp://" + sCES.username + ":" + sCES.password + "@" + sCES.host + ":" + sCES.port + "/";
  }
};

Meteor.methods({

  /*
   * this method is to invite new admin users
   * (not consumers) to secure access in the dashboard
   * to permissions as specified in packages/roles
   */
  inviteShopMember: function(shopId, email, name) {
    var currentUserName, shop, token, user, userId;
    shop = Shops.findOne(shopId);
    if (shop && email && name) {
      if (ReactionCore.hasOwnerAccess(shop)) {
        currentUserName = Meteor.user().profile.name;
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
          Email.send({
            to: email,
            from: currentUserName + " <" + shop.email + ">",
            subject: "[Reaction] You have been invited to join the " + shop.name + " staff",
            html: Spacebars.templates['shopMemberInvite']({
              homepage: Meteor.absoluteUrl(),
              shop: shop,
              currentUserName: currentUserName,
              invitedUserName: name,
              url: Accounts.urls.enrollAccount(token)
            })
          });
        } else {
          setMailUrlForShop(shop);
          Email.send({
            to: email,
            from: currentUserName + " <" + shop.email + ">",
            subject: "[Reaction] You have been invited to join the " + shop.name + " staff",
            html: Spacebars.templates['shopMemberNotification']({
              homepage: Meteor.absoluteUrl(),
              shop: shop,
              currentUserName: currentUserName,
              invitedUserName: name
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
   * this method sends an email to consumers on sign up
   */
  sendWelcomeEmail: function(shop) {
    var email;
    email = Meteor.user().emails[0].address;
    setMailUrlForShop(shop);
    return Email.send({
      to: email,
      from: shop.email,
      subject: "Welcome to " + shop.name + "!",
      html: Spacebars.templates['memberWelcomeNotification']({
        homepage: Meteor.absoluteUrl(),
        shop: shop
      })
    });
  }
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['reactioncommerce:core'] = {
  ReactionCore: ReactionCore,
  currentProduct: currentProduct,
  ShopController: ShopController,
  Products: Products,
  Cart: Cart,
  Tags: Tags
};

})();

//# sourceMappingURL=reactioncommerce_core.js.map
