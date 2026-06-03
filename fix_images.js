const fs = require('fs');
const path = 'app/gestionnaire-stock/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const old = `const ouvrirCommande = async (cmd: any) => { setCommandeDetail(cmd); const ids = (cmd.variantes || '').split(',').map((v: string) => v.trim()).filter(Boolean); if (ids.length > 0) { const { data } = await supabase.from('stock').select('*').in('id', ids); setCommandeVariantesImages(data || []) } else { setCommandeVariantesImages([]) } }`;

const neuf = `const ouvrirCommande = async (cmd: any) => { setCommandeDetail(cmd); const ids = (cmd.variantes || '').split(',').map((v: string) => v.trim()).filter(Boolean); if (ids.length > 0) { const { data: stockItems } = await supabase.from('stock').select('*').in('id', ids); const { data: prodData } = await supabase.from('produits').select('image_url').eq('reference', cmd.produit_ref).single(); const items = (stockItems || []).map((s: any) => ({ ...s, image_url: s.image_url || prodData?.image_url || null })); setCommandeVariantesImages(items) } else { setCommandeVariantesImages([]) } }`;

if (content.includes(old)) {
  content = content.replace(old, neuf);
  fs.writeFileSync(path, content, 'utf8');
  console.log('OK - fallback image ajoute');
} else {
  console.log('ERREUR - texte original non trouve');
}