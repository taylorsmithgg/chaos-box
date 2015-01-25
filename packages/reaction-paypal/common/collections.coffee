###
#  Meteor.settings.paypal =
#    mode: false  #sandbox
#    client_id: ""
#    client_secret: ""
#  see: https://developer.paypal.com/webapps/developer/docs/api/
#  see: https://github.com/paypal/rest-api-sdk-nodejs
###

ReactionCore.Schemas.PaypalPackageConfig = new SimpleSchema([
  ReactionCore.Schemas.PackageConfig
  {
    "settings.mode":
      type: Boolean
      defaultValue: false
    "settings.client_id":
      type: String
      label: "API Client ID"
      min: 60
    "settings.client_secret":
      type: String
      label: "API Secret"
      min: 60
  }
])

ReactionCore.Schemas.PaypalPayment = new SimpleSchema
  payerName:
    type: String
    label: "Cardholder name",
    regEx: /^\w+\s\w+$/
  cardNumber:
    type: String
    min: 16
    label: "Card number"
  expireMonth:
    type: String
    max: 2
    label: "Expiration month"
  expireYear:
    type: String
    max: 4
    label: "Expiration year"
  cvv:
    type: String
    max: 4
    label: "CVV"

ReactionCore.Schemas.PaypalPayment.messages
  "regEx payerName": "[label] must include both first and last name"
