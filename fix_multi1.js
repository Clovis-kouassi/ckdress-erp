const fs = require('fs');
const path = 'app/succes-design/catalogue/commande/page.tsx';
let content = fs.readFileSync(path, 'utf8');
if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);

// 1. Ajouter un state pour les produits multiples (apres setProduit)
const oldState = "  const [produit, setProduit] = useState<any>(null)\n  const [variantes, setVariantes] = useState<any[]>([])";
const newState = "  const [produit, setProduit] = useState<any>(null)\n  const [produitsMap, setProduitsMap] = useState<Record<string, any>>({})\n  const [variantes, setVariantes] = useState<any[]>([])";
content = content.replace(oldState, newState);

// 2. Charger TOUS les produits des variantes
const oldFetch = `      const { data: prodData } = await supabase.from('produits').select('*').eq('reference', produitRef).single()
      if (prodData) setProduit(prodData)
      if (variantesIds.length > 0) {
        const { data: stockData } = await supabase.from('stock').select('*').in('id', variantesIds)
        if (stockData) setVariantes(stockData)
      }`;
const newFetch = `      const { data: prodData } = await supabase.from('produits').select('*').eq('reference', produitRef).single()
      if (prodData) setProduit(prodData)
      if (variantesIds.length > 0) {
        const { data: stockData } = await supabase.from('stock').select('*').in('id', variantesIds)
        if (stockData) {
          setVariantes(stockData)
          // Charger tous les produits distincts des variantes
          const prodIds = Array.from(new Set(stockData.map((s: any) => s.produit_id)))
          const { data: tousProduits } = await supabase.from('produits').select('*').in('id', prodIds)
          if (tousProduits) {
            const map: Record<string, any> = {}
            tousProduits.forEach((p: any) => { map[p.id] = p })
            setProduitsMap(map)
          }
        }
      }`;
content = content.replace(oldFetch, newFetch);

fs.writeFileSync(path, content, 'utf8');
console.log('OK - bloc 1: chargement multi-produits');S