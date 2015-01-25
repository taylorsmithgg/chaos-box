Meteor.Paypal =
  accountOptions: ->
    settings = ReactionCore.Collections.Packages.findOne(name: "reaction-paypal").settings
    if settings?.mode is true then mode = "live" else mode = "sandbox"
    options =
      mode: mode
      client_id: settings?.client_id || Meteor.settings.paypal.client_id
      client_secret: settings?.client_secret || Meteor.settings.paypal.client_secret
    return options

  #authorize submits a payment authorization to Paypal
  authorize: (cardInfo, paymentInfo, callback) ->
    Meteor.call "paypalSubmit", "authorize", cardInfo, paymentInfo, callback
    return

  # purchase: function(card_info, payment_info, callback){
  #   Meteor.call('paypalSubmit', 'sale', card_info, payment_info, callback);
  # },
  capture: (transactionId, amount, callback) ->
    captureDetails =
      amount:
        currency: "USD"
        total: amount
      is_final_capture: true

    Meteor.call "paypalCapture", transactionId, captureDetails, callback
    return

  #config is for the paypal configuration settings.
  config: (options) ->
    @accountOptions = options
    return

  paymentObj: ->
    intent: "sale"
    payer:
      payment_method: "credit_card"
      funding_instruments: []
    transactions: []

  #parseCardData splits up the card data and puts it into a paypal friendly format.
  parseCardData: (data) ->
    credit_card:
      type: data.type
      number: data.number
      first_name: data.first_name
      last_name: data.last_name
      cvv2: data.cvv2
      expire_month: data.expire_month
      expire_year: data.expire_year

  #parsePaymentData splits up the card data and gets it into a paypal friendly format.
  parsePaymentData: (data) ->
    amount:
      total: data.total
      currency: data.currency
