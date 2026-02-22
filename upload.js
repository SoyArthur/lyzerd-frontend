const fs   = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

const KEY    = process.env.PINATA_KEY;
const SECRET = process.env.PINATA_SECRET;

if (!KEY || !SECRET) {
  console.error('ERROR: PINATA_KEY o PINATA_SECRET vacíos');
  console.error('KEY length:', KEY ? KEY.length : 0);
  console.error('SECRET length:', SECRET ? SECRET.length : 0);
  process.exit(1);
}

function walk(dir) {
  let results = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) results = results.concat(walk(full));
    else results.push(full);
  }
  return results;
}

async function main() {
  const form = new FormData();
  const files = walk('out').sort();
  console.log(`Subiendo ${files.length} archivos...`);

  for (const f of files) {
    const rel = path.relative('out', f);
    form.append('file', fs.createReadStream(f), { filepath: `lyzerd/${rel}` });
  }

  form.append('pinataMetadata', JSON.stringify({ name: 'lyzerd-frontend' }));
  form.append('pinataOptions',  JSON.stringify({ cidVersion: 1 }));

  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      'pinata_api_key':        KEY,
      'pinata_secret_api_key': SECRET,
      ...form.getHeaders(),
    },
    body: form,
  });

  const data = await res.json();
  console.log('Response:', JSON.stringify(data));

  if (!data.IpfsHash) { console.error('FALLO:', data); process.exit(1); }

  console.log(`CID: ${data.IpfsHash}`);
  console.log(`URL: https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`);
  console.log(`IPFS: https://${data.IpfsHash}.ipfs.dweb.link`);
}

main().catch(e => { console.error(e); process.exit(1); });
