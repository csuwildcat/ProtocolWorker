
(function(){

  var connections = {}

  ProtocolWorker = function(protocol){
    return Object.defineProperties(this, {
      protocol: { value: protocol }
    });
  }

  ProtocolWorker.prototype.request = function(obj){
    var protocol = this.protocol;
    if (!connections[protocol]) establishConnection(protocol);
    return createRequest(protocol, obj);
  }

  function establishConnection(protocol){
    var connection = connections[protocol] = {
      protocol: protocol,
      transactions: {},
      connected: false
    };
    var frame = connection.frame = document.createElement('iframe');
        frame.style.position = 'absolute';
        frame.style.top = '0';
        frame.style.left = '0';
        frame.style.width = '0';
        frame.style.height = '0';
        frame.style.opacity = '0';
        frame.style.border = 'none';
        frame.onload = function(event){
          connection.connected = true;
          var transactions = connection.transactions;
          for (var z in transactions) messageFrame(connection, transactions[z]);
        };
    frame.src = protocol + ':#';
    document.body.appendChild(frame);
  }

  function createRequest(protocol, obj){
    var transaction = {};
    transaction.data = obj || {};
    return new Promise(function(resolve, reject){
      var connection = connections[protocol];
      var id = transaction.data.__protocolRequestID__ = Math.random().toString(36).substr(2, 16);
      transaction.data.__protocolRequestType__ = protocol;
      transaction.resolve = resolve;
      transaction.reject = reject;
      connection.transactions[id] = transaction;
      if (connection.connected) messageFrame(connection, transaction);
    }).then(function(response){
      return response.data;
    }).catch(function(response){
      return response.data;
    });
  }

  function messageFrame(connection, transaction){
    if (!transaction.posted) {
      connection.frame.contentWindow.postMessage(JSON.stringify(transaction.data), '*');
      transaction.posted = true;
    }
  }

  window.addEventListener('message', function(event){
    var data = JSON.parse(event.data);
    if (window == window.top && !window.opener) { // this is an indication the script is running in the host page
      connections[data.__protocolRequestType__].transactions[data.__protocolRequestID__][data.status == 'success' ? 'resolve' : 'reject'](data);
    }
    else if (data.__protocolRequestID__) { // this is for messages arriving in the frame
      var protocol = data.__protocolRequestType__;
      var id = data.__protocolRequestID__;
      delete data.__protocolRequestType__;
      delete data.__protocolRequestID__;
      fireEvent(window, 'protocolrequest', Object.create(data, {
        respond: {
          value: function(response){
            var message = { data: response };
            sendMessage('success', event, message, protocol, id);
        }},
        reject: {
          value: function(response){
            var message = { data: response };
            sendMessage('rejected', event, message, protocol, id);
        }}
      }));
    }
  });

  function sendMessage(status, event, message, protocol, id){
    message.__protocolRequestType__ = protocol;
    message.__protocolRequestID__ = id;
    message.status = status;
    event.source.postMessage(JSON.stringify(message), '*');
  }

  function fireEvent(element, type, detail){
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent(type, false, false, detail);
    element.dispatchEvent(event);
  }

})();
