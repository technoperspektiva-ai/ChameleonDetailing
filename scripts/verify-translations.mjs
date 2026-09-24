import fs from 'node:fs';
import path from 'node:path';
const dir=path.resolve('src/locales');
const codes=['en','uk','pl','de','fr'];
const data=Object.fromEntries(codes.map(code=>[code,JSON.parse(fs.readFileSync(path.join(dir,`${code}.json`),'utf8'))]));
const base=new Set(Object.keys(data.en));
let failed=false;
for(const code of codes){
  const keys=Object.keys(data[code]);
  const missing=[...base].filter(k=>!(k in data[code]));
  const orphan=keys.filter(k=>!base.has(k));
  const empty=keys.filter(k=>typeof data[code][k]!=='string'||!data[code][k].trim());
  if(missing.length||orphan.length||empty.length){
    failed=true;
    console.error(`[i18n:${code}] missing=${missing.join(',')||'-'} orphan=${orphan.join(',')||'-'} empty=${empty.join(',')||'-'}`);
  }
}
if(failed)process.exit(1);
console.log(`Translation check passed: ${base.size} keys × ${codes.length} locales.`);
