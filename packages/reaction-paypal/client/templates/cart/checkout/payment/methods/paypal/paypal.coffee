getCardType = (number) ->
  re = new RegExp("^4")
  return "visa"  if number.match(re)?
  re = new RegExp("^(34|37)")
  return "amex"  if number.match(re)?
  re = new RegExp("^5[1-5]")
  return "mastercard"  if number.match(re)?
  re = new RegExp("^6011")
  return "discover"  if number.match(re)?
  ""

uiEnd = (template, buttonText) ->
  template.$(":input").removeAttr("disabled")
  template.$("#btn-complete-order").text(buttonText)
  template.$("#btn-processing").addClass("hidden")

paymentAlert = (errorMessage) ->
  $(".alert").removeClass("hidden").text(errorMessage)

hidePaymentAlert = () ->
  $(".alert").addClass("hidden").text('')

handlePaypalSubmitError = (error) ->
  # Depending on what they are, errors come back from PayPal in various formats
  singleError = error?.response?.error_description
  serverError = error?.response?.message
  errors = error?.response?.details || []
  if singleError
    paymentAlert("Oops! " + singleError)
  else if errors.length
    for error in errors
      formattedError = "Oops! " + error.issue + ": " + error.field.split(/[. ]+/).pop().replace(/_/g,' ')
      paymentAlert(formattedError)
  else if serverError
    paymentAlert("Oops! " + serverError)


# used to track asynchronous submitting for UI changes
submitting = false

AutoForm.addHooks "paypal-payment-form",
  onSubmit: (doc) ->
    # Process form (pre-validated by autoform)
    submitting = true
    template = this.template
    hidePaymentAlert()

    # regEx in the schema ensures that there will be exactly two names with one space between
    payerNamePieces = doc.payerName.split " "

    # Format data for paypal
    form = {
      first_name: payerNamePieces[0]
      last_name: payerNamePieces[1]
      number: doc.cardNumber
      expire_month: doc.expireMonth
      expire_year: doc.expireYear
      cvv2: doc.cvv
      type: getCardType(doc.cardNumber)
    }

    # Reaction only stores type and 4 digits
    storedCard = form.type.charAt(0).toUpperCase() + form.type.slice(1) + " " + doc.cardNumber.slice(-4)

    # Order Layout
    $(".list-group a").css("text-decoration", "none")
    $(".list-group-item").removeClass("list-group-item")

    # Submit for processing
    Meteor.Paypal.authorize form,
      total: Session.get "cartTotal"
      currency: Shops.findOne().currency
    , (error, transaction) ->
      submitting = false
      if error
        # this only catches connection/authentication errors
        handlePaypalSubmitError(error)
        # Hide processing UI
        uiEnd(template, "Resubmit payment")
        return
      else
        if transaction.saved is true #successful transaction
          # Format the transaction to store with order and submit to CartWorkflow
          paymentMethod =
            processor: "Paypal"
            storedCard: storedCard
            method: transaction.payment.payer.payment_method
            transactionId: transaction.payment.transactions[0].related_resources[0].authorization.id
            amount: transaction.payment.transactions[0].amount.total
            status: transaction.payment.state
            mode: transaction.payment.intent
            createdAt: new Date(transaction.payment.create_time)
            updatedAt: new Date(transaction.payment.update_time)

          # Store transaction information with order
          # paymentMethod will auto transition to
          # CartWorkflow.paymentAuth() which
          # will create order, clear the cart, and update inventory,
          # and goto order confirmation page
          CartWorkflow.paymentMethod(paymentMethod)
          return
        else # card errors are returned in transaction
          handlePaypalSubmitError(transaction.error)
          # Hide processing UI
          uiEnd(template, "Resubmit payment")
          return

    return false;

  beginSubmit: (formId, template) ->
    # Show Processing
    template.$(":input").attr("disabled", true)
    template.$("#btn-complete-order").text("Submitting ")
    template.$("#btn-processing").removeClass("hidden")
  endSubmit: (formId, template) ->
    # Hide processing UI here if form was not valid
    uiEnd(template, "Complete your order") if not submitting