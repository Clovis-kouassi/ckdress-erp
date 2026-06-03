const fs = require('fs');
const path = 'app/dashboard/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const old = "{ label: '📊 Reporting', href: '/reporting', activites: ['ck_dress'] },";
const add = old + "\n  { label: 'Gestionnaire Stock', href: '/gestionnaire-stock', activites: ['ck_dress', 'ck_design', 'succes_design'] },";

if (!content.includes('gestionnaire-stock')) {
  content = content.replace(old, add);
}

fs.writeFileSync(path, content, 'utf8');
console.log('OK - lien ajoute sans BOM');