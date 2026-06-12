const fs = require('fs');
const path = 'app/succes-design/catalogue/page.tsx';
let content = fs.readFileSync(path, 'utf8');
if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);

// Remplacer le total global par un groupement par categorie
const old = `  const qteTotaleCategorie = selection.reduce((s, i: any) => s + i.quantite, 0)`;
const neuf = `  const qteParCategorie: Record<string, number> = {}
  selection.forEach((i: any) => { const cat = i.categorie || ''; qteParCategorie[cat] = (qteParCategorie[cat] || 0) + i.quantite })`;
content = content.replace(old, neuf);

// Adapter la condition pour utiliser la quantite de la categorie de l'article
const oldCond = `    else if (i.reduction_type === 'quantite' && qteTotaleCategorie >= (i.reduction_quantite_min || 1)) pu = Math.max(0, i.reduction_valeur || i.prixUnitaire)`;
const newCond = `    else if (i.reduction_type === 'quantite' && (qteParCategorie[i.categorie || ''] || 0) >= (i.reduction_quantite_min || 1)) pu = Math.max(0, i.reduction_valeur || i.prixUnitaire)`;
content = content.replace(oldCond, newCond);

fs.writeFileSync(path, content, 'utf8');
console.log('OK - reduction groupee par categorie dans le panier');