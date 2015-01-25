PayPal = Npm.require("paypal-rest-sdk")
Fiber = Npm.require("fibers")
Future = Npm.require("fibers/future")

Meteor.methods
  #submit (sale, authorize)
  paypalSubmit: (transactionType, cardData, paymentData) ->
    PayPal.configure Meteor.Paypal.accountOptions()
    paymentObj = Meteor.Paypal.paymentObj()
    paymentObj.intent = transactionType
    paymentObj.payer.funding_instruments.push Meteor.Paypal.parseCardData(cardData)
    paymentObj.transactions.push Meteor.Paypal.parsePaymentData(paymentData)

    fut = new Future()
    @unblock()
    PayPal.payment.create paymentObj, Meteor.bindEnvironment((err, payment) ->
      if err
        fut.return
          saved: false
          error: err
      else
        fut.return
          saved: true
          payment: payment
      return
    , (e) ->
      ReactionCore.Events.warn e
      return
    )
    fut.wait()


  # capture (existing authorization)
  paypalCapture: (transactionId, captureDetails) ->
    PayPal.configure Meteor.Paypal.accountOptions()

    fut = new Future()
    @unblock()
    PayPal.authorization.capture transactionId, captureDetails, (error, capture) ->
      if error
        fut.return
          saved: false
          error: error
      else
        fut.return
          saved: true
          capture: capture
      return
    fut.wait()
