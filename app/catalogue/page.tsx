'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'

type Produit = {
  id: string
  reference: string
  nom: string
  prix_vente: number
  image_url?: string
}

type StockItem = {
  id: string
  produit_id: string
  taille: string
  couleur: string
  quantite: number
  image_url?: string
}

const TAILLES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

export default function CataloguePage() {
  const router = useRouter()
  const [produits, setProduits] = useState<Produit[]>([])
  const [taille, setTaille] = useState('')
  const [modele, setModele] = useState('')
  const [variantes, setVariantes] = useState<StockItem[]>([])
  const [selection, setSelection] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [stockDisponible, setStockDisponible] = useState<Record<string, boolean>>({})

  useEffect(() => {
    supabase.from('produits').select('*').eq('disponible', true).order('nom')
      .then(({ data }) => { if (data) setProduits(data) })
  }, [])

  // Vérifier quels produits ont du stock disponible
  useEffect(() => {
    if (produits.length === 0) return
    async function checkStock() {
      const { data } = await supabase
        .from('stock')
        .select('produit_id')
        .gt('quantite', 0)
      if (data) {
        const dispo: Record<string, boolean> = {}
        produits.forEach(p => {
          dispo[p.reference] = data.some(s => s.produit_id === p.id)
        })
        setStockDisponible(dispo)
      }
    }
    checkStock()
  }, [produits])

  useEffect(() => {
    if (!taille || !modele) { setVariantes([]); return }
    setLoading(true)
    setSelection([])
    const produit = produits.find(p => p.reference === modele)
    if (!produit) { setLoading(false); return }
    supabase.from('stock').select('*')
      .eq('produit_id', produit.id)
      .eq('taille', taille)
      .gt('quantite', 0)
      .then(({ data }) => {
        if (data) setVariantes(data)
        setLoading(false)
      })
  }, [taille, modele, produits])

  function toggleSelection(id: string) {
    setSelection(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function handleCommander() {
    if (selection.length === 0) return
    const query = new URLSearchParams({
      produit: modele,
      taille,
      variantes: selection.join(','),
    })
    router.push(`/catalogue/commande?${query.toString()}`)
  }

  const produitSelectionne = produits.find(p => p.reference === modele)

  const getImage = (v: StockItem) => {
    if (v.image_url) return v.image_url
    return produitSelectionne?.image_url || null
  }

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7', fontFamily: "'DM Sans', sans-serif", paddingBottom: 100 }}>

      <header style={{ background: '#1a1a1a', padding: '20px', textAlign: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#d4a853', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>CK</div>
          <span style={{ color: '#fff', fontSize: 18, fontWeight: 600, letterSpacing: 2 }}>CK DRESS</span>
        </div>
        <p style={{ color: '#888', fontSize: 12, margin: '4px 0 0', letterSpacing: 1 }}>CATALOGUE — ABIDJAN</p>
      </header>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>

        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', margin: '0 0 20px', textAlign: 'center' }}>
          Trouvez votre article
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              1. Votre taille
            </label>
            <select value={taille} onChange={e => setTaille(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: taille ? '1.5px solid #1a1a1a' : '1.5px solid #e5e2dc', fontSize: 15, color: taille ? '#1a1a1a' : '#aaa', background: '#fff', outline: 'none', cursor: 'pointer' }}>
              <option value="">Choisir...</option>
              {TAILLES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              2. Le modèle
            </label>
            <select value={modele} onChange={e => setModele(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: modele ? '1.5px solid #1a1a1a' : '1.5px solid #e5e2dc', fontSize: 15, color: modele ? '#1a1a1a' : '#aaa', background: '#fff', outline: 'none', cursor: 'pointer' }}>
              <option value="">Choisir...</option>
              {produits.map(p => (
                <option
                  key={p.reference}
                  value={p.reference}
                  disabled={stockDisponible[p.reference] === false}
                  style={{ color: stockDisponible[p.reference] === false ? '#ccc' : '#1a1a1a' }}
                >
                  {p.nom} — {p.prix_vente.toLocaleString('fr-FR')} F
                  {stockDisponible[p.reference] === false ? ' (Rupture de stock)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!taille || !modele ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: '#bbb' }}>
            {produitSelectionne?.image_url ? (
              <img src={produitSelectionne.image_url} alt="" style={{ width: '120px', height: '160px', objectFit: 'cover', borderRadius: '12px', marginBottom: '12px', opacity: 0.5 }} />
            ) : (
              <div style={{ fontSize: 48, marginBottom: 12 }}>👗</div>
            )}
            <p style={{ margin: 0, fontSize: 15 }}>
              {!taille && !modele ? 'Sélectionnez votre taille et un modèle' :
               !taille ? 'Sélectionnez votre taille' : 'Sélectionnez un modèle'}
            </p>
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>Chargement...</div>
        ) : variantes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: '#bbb' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>😔</div>
            <p style={{ margin: 0, fontSize: 15 }}>Aucune variante disponible en taille {taille} pour ce modèle</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>{produitSelectionne?.nom}</p>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#888' }}>Taille {taille} — {variantes.length} variante{variantes.length > 1 ? 's' : ''} disponible{variantes.length > 1 ? 's' : ''}</p>
              </div>
              <span style={{ fontSize: 17, fontWeight: 700, color: '#d4a853' }}>
                {produitSelectionne?.prix_vente.toLocaleString('fr-FR')} F
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
              {variantes.map(v => {
                const selected = selection.includes(v.id)
                const imageUrl = getImage(v)
                return (
                  <button key={v.id} onClick={() => toggleSelection(v.id)}
                    style={{
                      background: '#fff',
                      border: selected ? '2.5px solid #1a1a1a' : '1.5px solid #ece9e3',
                      borderRadius: 12, padding: 0, cursor: 'pointer',
                      overflow: 'hidden', position: 'relative',
                      transform: selected ? 'scale(0.96)' : 'scale(1)',
                      transition: 'transform 0.12s, border-color 0.12s',
                    }}>
                    <div style={{ width: '100%', aspectRatio: '3/4', background: 'linear-gradient(135deg, #f0ece4, #e8e1d5)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {imageUrl
                        ? <img src={imageUrl} alt={v.couleur} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ fontSize: 36, opacity: 0.2 }}>👗</div>
                      }
                    </div>
                    {selected && (
                      <div style={{ position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: '50%', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', fontWeight: 700 }}>✓</div>
                    )}
                    <div style={{ padding: '8px 10px 10px', textAlign: 'left' }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{v.couleur}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#aaa' }}>{v.quantite} en stock</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      {selection.length > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #ece9e3', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>
              {selection.length} article{selection.length > 1 ? 's' : ''} sélectionné{selection.length > 1 ? 's' : ''}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: '#888' }}>{produitSelectionne?.nom} — Taille {taille}</p>
          </div>
          <button onClick={handleCommander}
            style={{ background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 24px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#d4a853')}
            onMouseLeave={e => (e.currentTarget.style.background = '#1a1a1a')}>
            Commander →
          </button>
        </div>
      )}

      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
    </div>
  )
}