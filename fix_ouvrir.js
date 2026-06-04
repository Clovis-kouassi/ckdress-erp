const fs = require('fs');
const path = 'app/gestionnaire-stock/page.tsx';
let content = fs.readFileSync(path, 'utf8');
if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);

const old = `const ouvrirCommande = async (cmd: any) => { setCommandeDetail(cmd); const ids = (cmd.variantes || '').split(',').map((v: string) => v.trim().split(':')[0]).filter(Boolean); if (ids.length > 0) { const { data: stockItems } = await supabase.from('stock').select('*').in('id', ids); const { data: prodData } = await supabase.from('produits').select('image_url').eq('reference', cmd.produit_ref).single(); const items = (stockItems || []).map((s: any) => ({ ...s, image_url: s.image_url || prodData?.image_url || null })); setCommandeVariantesImages(items) } else { setCommandeVariantesImages([]) } }`;

const neuf = `const ouvrirCommande = async (cmd: any) => { setCommandeDetail(cmd); setCommandeVariantesImages([]); const ids = (cmd.variantes || '').split(',').map((v: string) => v.trim().split(':')[0]).filter(Boolean); if (ids.length === 0) return; try { const { data: stockItems } = await supabase.from('stock').select('*').in('id', ids); const prod = produits.find((p: any) => p.reference === cmd.produit_ref); const items = (stockItems || []).map((s: any) => ({ ...s, image_url: s.image_url || prod?.image_url || null })); setCommandeVariantesImages(items) } catch (e) { console.error('Erreur images variantes', e) } }`;

if (content.includes(old)) {
  content = content.replace(old, neuf);
  fs.writeFileSync(path, content, 'utf8');
  console.log('OK - ouvrirCommande robuste');
} else {
  console.log('ERREUR - texte non trouve');
}