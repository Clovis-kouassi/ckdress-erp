const fs = require('fs');
const path = 'app/gestionnaire-stock/page.tsx';
let content = fs.readFileSync(path, 'utf8');
if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);

// Remplacer tous les onClick={() => setCommandeDetail(cmd)} par ouvrirCommande
const count = (content.match(/onClick=\{\(\) => setCommandeDetail\(cmd\)\}/g) || []).length;
content = content.replace(/onClick=\{\(\) => setCommandeDetail\(cmd\)\}/g, 'onClick={() => ouvrirCommande(cmd)}');

fs.writeFileSync(path, content, 'utf8');
console.log('OK - ' + count + ' clics corriges');