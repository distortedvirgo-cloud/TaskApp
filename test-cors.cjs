const https = require('https');
https.request('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', { 
  method: 'OPTIONS',
  headers: {
    'Origin': 'https://ais-dev-4zcyultaokfv3gqwy3km4d-601830032117.asia-east1.run.app',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'content-type, authorization'
  }
}, (res) => {
  console.log(res.headers);
}).end();
