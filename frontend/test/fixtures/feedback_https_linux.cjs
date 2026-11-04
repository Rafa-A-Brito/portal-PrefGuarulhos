// Cliente TLS local dentro do Docker: CA temporária explícita, verificação ativa.
const https = require('node:https'), fs = require('node:fs');
let input = ''; process.stdin.on('data', c => input += c); process.stdin.on('end', () => {
 const q = JSON.parse(input);
 const req = https.request('https://127.0.0.1:8445' + q.rota, { method: q.method || 'GET', headers: q.headers || {}, ca: fs.readFileSync('/f4/cert.pem'), timeout: 15000 }, res => {
  const chunks = []; res.on('data', c => chunks.push(c)); res.on('end', () => { let json; try { json = JSON.parse(Buffer.concat(chunks).toString()); } catch { /* Erro HTML da borda. */ } console.log(JSON.stringify({ status: res.statusCode, headers: res.headers, json })); });
 }); req.on('error', e => { console.error(e.code); process.exitCode = 1; }); req.on('timeout', () => req.destroy()); if (q.body) req.write(q.body); req.end();
});
