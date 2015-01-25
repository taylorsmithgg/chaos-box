/**
 * Created by taylor on 1/24/15.
 */
Houston.methods("users", {
  "Promote to Admin": function (user) {
    Roles.addUsersToRoles(user._id, ['admin'])
    return user.profile.name + " successfully promoted to admin.";
  },
  "Promote to Vendor": function (user) {
    Roles.addUsersToRoles(user._id, ['vendor'])
    return user.profile.name + " successfully promoted to vendor.";
  }
});
Meteor.publish(null, function (){
  return Meteor.roles.find({})
})
Houston.add_collection(Meteor.users);
Houston.add_collection(Houston._admins);
Houston.add_collection(Meteor.roles);
Houston.add_collection(ReactionCore.Collections.Orders);
