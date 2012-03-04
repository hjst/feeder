// CONFIG
var bind = '/tmp/feeder_node.socket'; // port or socket

// INCLUDES
var http = require ('http'),
    url  = require ('url');

// EVIL MONOLITHIC FUNCTION
function feeder(request, response) {
  var _req = url.parse(request.url),
      _ip  = request.connection.remoteAddress,
      _agent = request.headers['user-agent'];

  function _log(msg) {
    var now = new Date();
    console.log(now.toISOString() + '['+_ip+'] '+msg+' ['+ _agent+']');
  }

  if (_req.pathname !== '/get') {
    // return 404 for anything we can't handle
    _log('Returning 404 for ' + _req.path);
    response.writeHead(404, {'Content-Type': 'text/plain'});
    response.write('404 - not found');
    response.end();
  } else {
    // we have a /get request, now validate the feed url
    var feed_url = url.parse(request.url, true).query.feed;
    if (
      feed_url === undefined ||
      url.parse(feed_url).hostname !== 'feeds.feedburner.com' ||
      url.parse(feed_url).protocol !== 'http:'
    ) {
      _log('Returning 400 for ' + _req.path);
      response.writeHead(400, {'Content-Type': 'text/plain'});
      response.write('400 - invalid request');
      response.end();
    } else {
      // reasonably sure we have a valid feedburner url, so process
      _log('Request for feed: ' + feed_url);
      var options = {
        host: url.parse(feed_url).hostname,
        path: url.parse(feed_url).path
      };
      http.get(options, function(fb_res) {
        response.writeHead(fb_res.statusCode, '', fb_res.headers);
        fb_res.setEncoding('utf-8');
        fb_res.on('data', function(chunk) {
          // write the chunked fb response data to our own respose
          response.write(chunk);
        });
        fb_res.on('end', function() {
          // close our response when there's no more fb data
          response.end();
        });
      }).on('error', function(e) {
        _log('ERROR: ' + e.message);
      });
    }
  }
}

// START THE HTTP SERVER
http.createServer(feeder).listen(bind);
console.log('Started feeder server on port ' + port);
