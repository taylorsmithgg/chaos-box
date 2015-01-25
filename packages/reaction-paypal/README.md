reaction-paypal
=============

Meteor/Reaction Package for Paypal integration, installed by default with core packages.

This is a prototype module -> pull requests are celebrated, feedback encouraged.

International user? See: https://github.com/reactioncommerce/reaction/issues/96

### Usage
```console
meteor add reactioncommerce:reaction-paypal
```

### Configuration
In settings/settings.json file, or via dashboard configuration:
```json
  "paypal": {
    "mode:" false, //true is live
    "client_id": "<your paypal client id>",
    "client_secret": "<your paypal client secret>"
  }
```

This overrides the dummy fixture data in common/collections.coffee

```coffeescript
  Meteor.settings.paypal =
    mode: false
    client_id: ""
    client_secret: ""
```

#### Use

Format is `Meteor.Paypal.*transaction_type*({ {/*card data*/}, {/*transaction data*/}, function(err, res){...})`

```javascript
  Meteor.Paypal.authorize({
      name: 'Buster Bluth',
      number: '4111111111111111',
      cvv2: '123',
      expire_year: '2015',
      expire_month: '01'
    },
    {
      total: '100.10',
      currency: 'USD'
    },
    function(error, results){
      if(error)
        //Deal with Error
      else
        //results contains boolean for saved
        // and a payment object with information about the transaction
    });
```

For information on the **payment** object returned see [Paypal's Payment Option Documentation](https://developer.paypal.com/webapps/developer/docs/api/#common-payments-objects)


Thanks to, and much borrowed from David Brear's [meteor-paypal](https://github.com/DavidBrear/meteor-paypal.git)
