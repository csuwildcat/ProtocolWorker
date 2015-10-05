# ProtocolWorker
*An API in the spirit of Web Workers that allows dynamic, app-to-app interaction via custom protocol handlers*

### Preface

The battle ground of app-to-app interaction history is littered with abandoned ideas, half-solutions, and unevenly implemented APIs.

The following is a (working) prototype of one way we can do app-to-app service interactions based on a user's preferred service providers. It not intended to be a final statement on how an API like this should be surfaced. Instead, it is intended as a conversation starter to refocus efforts on making possible the use-cases and requirements it fulfills.

###### Note: _There have been other forays into solving this family of issues, like Web Intents/Activities, but they have not been implemented widely and lack various features that degrade their utility. That's not to say these past implementation ideas are bad, or cannot be used as the vehicle for solving this area of developer need - they can, and I'd love to discuss that route as an option._

### What is a ProtocolWorker?

Ever want to open a programmatic connection within your app to the user's preferred provider of some common service? This could be an interaction, submission, or exchange with the user's identity, storage, social network providers, etc. Now you might say this is already solved - after all, we have 50 million service-specific social, identity, and storage icons/libraries hard-coded on every site to do just that! Oh wait, that right there, that sucks. There must be some way to provide a simple API that doesn't require you to know of, integrate, and manage specific bits of UI and code for every service a user may want to leverage within your app. Turns out, there is, and it has been with us for a long, long time.

Imagine if you could have a client-side connection to a user's services that allowed you to transact any number of complex activities, all without having to know who the user's provider is, or having to include any provider-specific code in your app. Sounds great, right? So how do we do this thang!? Answer: custom protocol handlers.

A protocol handler is the registration of a web page or app to act on activations of a protocol. One well-known protocol is `mailto:`. If you register Outlook as your `mailto:` handler, any time a `mailto:` resource is activated, it will hand off to Outlook to handle the activity. In most cases that can be seen by clicking a `mailto:` link, which brings up the "New Email" view of your preferred email app/site. Firefox and Chrome currently support the long-time standard API that makes it possible: `navigator.registerProtocolHandler()`. See the docs for further details: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/registerProtocolHandler

Here's where things get interesting: Turns out you can hack the handling of custom protocols to create a programmatic channel for app-to-app service APIs. How? An oldie but goodie: the `<iframe>`. I found that loading a custom protocol (any handler registered with the `web+` prefix) in an iframe will redirect to to the handler's target page. From there, with a bit of `postMessage()` magic, we have ourselves an active, two-way connection between an app and the user's preferred service provider. Think of it as a cross between a Web Worker and Background Page (as they're known in browser extension land). With this connection, we can do amazing things.

### What can ProtocolWorkers do?

I'm so glad you asked, this is the fun part:
- Eliminates the seemingly endless hordes of performance-destroying service buttons (think: like buttons, login buttons, share buttons, count buttons, etc.)
- Enables a provider-agnostic authentication channel between providers and apps
- Allows developers to code against shared, community-defined, semantic APIs for each protocol flavor (think: web+share, web+store, web+pay, etc.)

If you don't find that exciting, check to make sure you have a pulse.

### Talk codey to me

Let's imagine for a second we wanted to make it possible to share a social post to whatever provider the user preferred, all without knowing the provider, including buttons and scripts for each possible provider option, or forcing the user out of your app experience by opening a completely different app/browser window.

##### *Providers register protocol handlers...*

The first thing a web app needs to do is register itself as a possible handler for the protocol it would like to provide services for. Here's how you do that:

```javascript
navigator.registerProtocolHandler('web+share', TARGET_URL + '?%s', 'Book of Faces');
```

##### *...which point to a ProtocolWorker Page*

At the other end of that `TARGET_URL` you should include an HTML page that is not intended for display, we'll be treating it as more of a DOM-enhanced Web Worker environment. In this page you include a couple event listeners and whatever code you want to deal with the requests you'll receive from other apps. Here's what a light HTML ProtocolWorker page might look like:

```html
<script src="js/ProtocolWorker.js"></script>

<script>

(function(){

  window.addEventListener('protocolrequest', function(event){
    if (event.detail['@type'] = 'SocialMediaPosting') {
      // code here to process the social media post
      event.detail.resolve(RESPONSE_VALUE);
    }
    else event.detail.reject();
  });

})();

</script>
```

That's it! Nifty, huh?

##### *Consuming apps use ProtocolWorkers to connect to providers*

Once you register your web app to handle the service you'd like to provide, other apps can open connections to your service. Let's imagine your app has a button for sharing a post + picture of your dinner:

```html
<script>

var socialWorker = new ProtocolWorker('web+share');

document.getElementById('share_button').addEventListener('click', function(){

  socialWorker.request({
    '@context': 'http://schema.org',
    '@type': 'SocialMediaPosting',
    articleBody: "OMG look at this mediocre dinner I made, I'm Bobby Flay status!",
    sharedContent: {...}
  }).then(function(){
    alert('Your very original, extremely interesting post was a success!')
  }).catch(function(){
    alert('The system has been overloaded by cat pictures, try again.')
  });

})

</script>
```

### Why reuse protocol handlers?

#### *Pros*
- They already exist
- They already manage user preferences in the trusted chrome UI of the User Agent
- They are a natural extension of existing paradigms

#### *Cons*
- Currently, User Agents force the user to choose a service provider to handle a protocol request on either a per-use basis (every call) or the option to set a specific provider as the global default. Many protocol types would require the addition of another level of default: domain scoped.
- The trusted chrome UIs of User Agents who currently support the required APIs are lackluster and missing features that would make the choice/management experience friendly for non-technical users.

### Where do we go from here?

As I mentioned in the preface, there are past API attempts that could be modified to do this, or we could even extend new APIs, like ServiceWorker, to handle these cases. Regardless of what the solution ends up looking like, let's come together as a community of developer and platform implementers to serve these needs and move the web forward.
