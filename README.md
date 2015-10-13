# ProtocolWorker
*An API experiment in the spirit of Web Workers/Background Pages that allows dynamic, app-to-app interaction via custom protocol handlers*

### What is a ProtocolWorker?

Have you ever wanted to open a programmatic connection within your app to the user's preferred provider of a service or activity? Maybe you've wanted to check a user's identity, store data to a user's storage provider, or post to the user's preferred social network, etc. If you're saying to yourself, "Self, this is already solved, there are endless provider-specific social, identity, and storage includes to do just that" <-- I would submit to you, that right there, sucks. There must be some way to provide a common API layer for consumption of these services that doesn't require developers to know of, integrate, and manage specific bits of UI and code for every provider.

ProtocolWorker relies on protocol handlers to do its magic. In some browsers, protocol handlers can be registered by sites so they can be presented as an option for handling activations of a given protocol. One well-known protocol is `mailto:`. If you register Outlook as your `mailto:` handler, any time a `mailto:` resource is activated it will hand off to Outlook to handle the activity. In most cases that can be seen by clicking a `mailto:` link, which brings up the "New Email" view of your preferred email app/site. Firefox, Chrome, and Opera currently support the long-time standard API that makes it possible: `navigator.registerProtocolHandler()`. See the docs for further details: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/registerProtocolHandler

It turns out you can use custom protocols to create a programmatic, background connection for app-to-app interactions. How? By pairing them with an old friend: the iframe. I found that loading a custom protocol (any handler registered with the web+ prefix) in an iframe will redirect to the handler's target page. With a bit of postMessage() magic handled by a prollyfill included on both sides (consumer and provider), you can create an active, two-way connection between your app and the user's preferred service provider.

### How to use ProtocolWorkers

To show how this works I put together a simple demo built on the totally-100%-made-up <code>web+whisper</code> protocol. The hypothetical Web Whisper case I highlight in the code below lets a user store a text string (a <em>whisper</em>) with their provider, or retrieve the last text string the provider stored on their behalf. Any consuming app that desires to store or retrieve the user's whisper must first be permitted to do so via the browser's protocol selection UI. The whole demo uses <code>localStorage</code> to save the user's text string on the provider's domain, so don't expect persistence beyond that of your local machine.

<strong>Note:</strong> though this is a super simple demo, the system would be just as good for sending/retrieving things like: social posts, user profile info, or files from places like OneDrive, Dropbox, Box, etc.

#### *Providers register a protocol handler*

The first thing a site offering a Web Whisper service needs to do is register itself as a handler for the <code>web+whisper</code> protocol. Here's how you do that:

```javascript
navigator.registerProtocolHandler('web+whisper', HANDLER_URL + '?%s', 'Whisper Demo Provider');
```

#### *Protocol handlers point to a ProtocolWorker page*

At the other end of that `HANDLER_URL` should be an HTML page that is not intended for display - we'll be treating it as more of a DOM-enhanced, Web Worker environment. In this page you will include event listeners and whatever code you need to deal with the requests you'll receive from consuming apps. Here's what the handler page looks like for our Web Whisper provider:

```html
<script src="js/ProtocolWorker.js"></script>

<script>

  window.addEventListener('protocolrequest', function(event){
    if (event.detail['@type'] == 'Comment') {
      localStorage.whisper = event.detail.comment;
      event.detail.resolve();
    }
    if (event.detail['@type'] == 'Search') {
      event.detail.resolve(localStorage.whisper);
    }
  });

</script>
```

#### *Consuming apps connect to providers via <code>ProtocolWorker</code>*

After the user adds our Web Whisper provider as a handler for <code>web+whisper</code> requests, consuming apps can ask to open a connection to it. Below is a demo page of what it would look like for a consuming app to interact with the user's Web Whisper provider. Notice the consuming app creates a <code>ProtocolWorker</code> instance and sets up events in which it will attempt to send and retrieve data from the user's Web Whisper provider.

```html
<input placeholder="Whisper something" /><button id="send">Send</button><button id="retrieve">Retrieve</button>

<script src="js/ProtocolWorker.js"></script>
<script>

var retrieveButton = document.querySelector('#retrieve');
var sendButton = document.querySelector('#send');
var input = document.querySelector('input');

var whisperWorker = new ProtocolWorker('web+whisper');

sendButton.addEventListener('click', function(){

  var value = input.value.trim();
  if (value) {
    whisperWorker.request({
      '@context': 'http://schema.org',
      '@type': 'Comment',
      comment: value
    }).then(function(){
      alert('Your message has been whispered to your provider!')
    }).catch(function(){
      alert('You either declined to whisper something to me or don\'t have a web+whisper provider :/')
    });
  }
  else alert('You didn\'t whisper anything.');

});

retrieveButton.addEventListener('click', function(){

  whisperWorker.request({
    '@context': 'http://schema.org',
    '@type': 'Search'
  }).then(function(data){
    alert('You last whispered: ' + data);
  }).catch(function(){
    alert('You either decided not to let this app see your last whisper, or don\'t have a web+whisper provider :/')
  });

});

</script>
```

#### *Transactions should follow shared semantics*

As you may have noticed above, each <code>ProtocolWorker</code> request above is formatted in accordance with a matching data description from Schema.org. Schema.org is a great resource for semantic data descriptors, which I believe are a solid Lingua-franca upon which to transact custom protocol requests. Who knows, maybe browsers could validate and enforce these semantic data structures some day?
