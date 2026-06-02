import https from 'https';
import fs from 'fs';

https.get('https://nbox.me/', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    fs.writeFileSync('nbox_source.txt', data);
    console.log('Saved source to nbox_source.txt');
    console.log('Status code:', res.statusCode);
  });
}).on('error', (err) => {
  console.error(err);
});
