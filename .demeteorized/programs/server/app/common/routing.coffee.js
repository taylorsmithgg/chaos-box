(function(){__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var ReactionController, staticPages;

ReactionController = ShopController.extend;

staticPages = ["about", "team", "faqs", "terms", "privacy"];


/*
 * router path maps
 */

Router.map(function() {
  var page, _i, _len;
  for (_i = 0, _len = staticPages.length; _i < _len; _i++) {
    page = staticPages[_i];
    this.route(page, {
      controller: ReactionController,
      name: page
    });
  }
  return this.route("notFound", {
    path: "/(.*)"
  });
});

})();

//# sourceMappingURL=routing.coffee.js.map
