
(function(){

  var workers = {}

  ProtocolWorker = function(protocol){
    var id = guid();
    return workers[id] = Object.defineProperties(this, {
      id: { value: id },
      push: { value: false, writable: true },
      connected: { value: false, writable: true },
      transactions: { value: {} },
      protocol: { value: protocol }
    });
  }

  ProtocolWorker.prototype.request = function(obj){
    if (!this.frame) establishConnection(this);
    return createRequest(this, createTransaction(this, obj));
  }

  ProtocolWorker.prototype.subscribe = function(){
    var protocol = this.protocol;
    if (!this.frame) establishConnection(this);
    this.push = true;
    var transaction = createTransaction(this);
    transaction.data.__pwtxn__.type = 'subscribe';
    createRequest(this, transaction);
  }

  ProtocolWorker.prototype.unsubscribe = function(){
    this.push = false;
    var transaction = createTransaction(this);
    transaction.data.__pwtxn__.type = 'unsubscribe';
    createRequest(this, transaction);
  }

  function establishConnection(worker){
    var frame = worker.frame = document.createElement('iframe');
        frame.style.position = 'absolute';
        frame.style.top = '0';
        frame.style.left = '0';
        frame.style.width = '0';
        frame.style.height = '0';
        frame.style.opacity = '0';
        frame.style.border = 'none';
        frame.onload = function(event){
          worker.connected = true;
          var transactions = worker.transactions;
          for (var z in transactions) messageFrame(worker, transactions[z]);
        };
    frame.src = worker.protocol + ':#';
    document.body.appendChild(frame);
  }

  function createTransaction(worker, obj){
    var transaction = { data: obj || {} };
    var internal = transaction.data.__pwtxn__ = {
      worker: worker.id,
      id: guid()
    };
    return worker.transactions[internal.id] = transaction;
  }

  function guid(){
    return Math.random().toString(36).substr(2, 16);
  }

  function createRequest(worker, transaction){
    return new Promise(function(resolve, reject){
      transaction.resolve = resolve;
      transaction.reject = reject;
      if (worker.connected) messageFrame(worker, transaction);
    }).then(function(response){
      return response.data;
    }).catch(function(response){
      return response.data;
    });
  }

  function messageFrame(worker, transaction){
    if (!transaction.posted) {
      worker.frame.contentWindow.postMessage(JSON.stringify(transaction.data), '*');
      transaction.posted = true;
    }
  }

  window.addEventListener('message', function(event){
    var data = JSON.parse(event.data);
    var transaction = data.__pwtxn__;
    if (transaction) {
      if (window == window.top && !window.opener) { // this is an indication the script is running in the parent page
        var worker = workers[transaction.worker];
        var transactions = worker.transactions;
        delete data.__pwtxn__;
        if (transaction.status == 'push' && worker.push && worker.onpush) worker.onpush(data.data);
        else if (transactions[transaction.id]) {
          transactions[transaction.id][data.status == 'success' ? 'resolve' : 'reject'](data);
          delete transactions[transaction.id];
        }
      }
      else { // this is for messages arriving in the frame
        var workerID = transaction.worker;
        var type = transaction.type;
        var id = transaction.id;
        delete data.__pwtxn__;

        switch (type) {
          case 'subscribe':
            data.worker = {
              push: function(payload){
                var message = { data: payload };
                messageParent('push', event, message, workerID, id);
              }
            };
            fireEvent(window, 'protocolsubscribed', data);
            break;

          case 'unsubscribe':
            fireEvent(window, 'protocolunsubscribed');
            break;

          default:
            fireEvent(window, 'protocolrequest', Object.create(data, {
              resolve: {
                value: function(response){
                  var message = { data: response };
                  messageParent('success', event, message, workerID, id);
              }},
              reject: {
                value: function(response){
                  var message = { data: response };
                  messageParent('rejected', event, message, workerID, id);
              }}
            }));
          }
      }
    }
  });

  function messageParent(status, event, message, workerID, id){
    message.__pwtxn__ = {
      id: id,
      worker: workerID,
      status: status
    }
    event.source.postMessage(JSON.stringify(message), '*');
  }

  function fireEvent(element, type, detail){
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent(type, false, false, detail);
    element.dispatchEvent(event);
  }

})();
