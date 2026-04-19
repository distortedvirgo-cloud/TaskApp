const https = require('https');
const req = https.request('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer dummy',
    'Content-Type': 'application/json'
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'BODY:', body));
});
req.write(JSON.stringify({ model: 'gemini-3.1-flash-lite-preview', messages: [{role: 'user', content: 'hi'}] }));
req.end();
