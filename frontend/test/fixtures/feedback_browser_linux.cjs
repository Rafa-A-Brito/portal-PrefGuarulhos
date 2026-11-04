// Executado somente dentro da imagem local de ensaio, no namespace do proxy F4.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const pasta = fs.mkdtempSync('/f4/chromium_');
const browser = spawn('/usr/bin/chromium', ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', '--user-data-dir=' + pasta, '--ignore-certificate-errors-spki-list=' + process.argv[2], 'about:blank'], { stdio: 'ignore' });
const timer = setInterval(() => {
  const file = pasta + '/DevToolsActivePort'; if (!fs.existsSync(file)) return;
  clearInterval(timer); const [port, socket] = fs.readFileSync(file, 'utf8').trim().split('\n');
  net.createServer(client => { const target = net.connect(Number(port), '127.0.0.1'); target.on('error', () => client.destroy()); client.on('error', () => target.destroy()); client.pipe(target); target.pipe(client); }).listen(9223, '0.0.0.0', () => fs.writeFileSync('/f4/cdp.json', JSON.stringify({ socket })));
}, 100);
browser.on('exit', () => process.exit(0));
