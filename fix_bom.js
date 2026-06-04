const fs = require('fs');
const path = 'app/gestionnaire-stock/page.tsx';
let content = fs.readFileSync(path, 'utf8');
// Enlever le BOM s'il existe
if (content.charCodeAt(0) === 0xFEFF) {
  content = content.slice(1);
}
fs.writeFileSync(path, content, 'utf8');
console.log('BOM enleve');