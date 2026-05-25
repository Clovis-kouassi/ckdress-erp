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
  categorie?: string
}

type StockItem = {
  id: string
  produit_id: string
  taille: string
  couleur: string
  quantite: number
  image_url?: string
}

type Categorie = {
  id: string
  nom: string
  activite: string
}

export default function CatalogueSuccesDesignPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Categorie[]>([])
  const [produits, setProduits] = useState<Produit[]>([])
  const [tailles, setTailles] = useState<string[]>([])
  const [taille, setTaille] = useState('')
  const [categorie, setCategorie] = useState('')
  const [produitsAffiches, setProduitsAffiches] = useState<{produit: Produit, stock: StockItem[]}[]>([])
  const [selection, setSelection] = useState<{stockId: string, produitId: string, produitRef: string, couleur: string, quantite: number, maxQuantite: number, prixUnitaire: number}[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('categories').select('*').eq('activite', 'succes_design').order('ordre').then(({ data }) => {
      if (data) setCategories(data)
    })
    supabase.from('produits').select('*').eq('disponible', true).eq('activite', 'succes_design').order('nom').then(({ data }) => {
      if (data) setProduits(data)
    })
    supabase.from('tailles').select('nom').eq('actif', true).order('ordre').then(({ data }) => {
      if (data) setTailles(data.map(t => t.nom))
    })
  }, [])

  useEffect(() => {
    if (!taille || !categorie) { setProduitsAffiches([]); return }
    setLoading(true)
    setSelection([])

    async function chargerProduits() {
      const produitsFiltres = produits.filter(p => p.categorie?.toLowerCase() === categorie.toLowerCase())
      if (produitsFiltres.length === 0) { setProduitsAffiches([]); setLoading(false); return }
      const ids = produitsFiltres.map(p => p.id)
      const { data: stockData } = await supabase.from('stock').select('*').in('produit_id', ids).eq('taille', taille).gt('quantite', 0)
      if (!stockData) { setProduitsAffiches([]); setLoading(false); return }
      const result = produitsFiltres
        .map(p => ({ produit: p, stock: stockData.filter(s => s.produit_id === p.id) }))
        .filter(item => item.stock.length > 0)
      setProduitsAffiches(result)
      setLoading(false)
    }

    chargerProduits()
  }, [taille, categorie, produits])

  function toggleSelection(stockItem: StockItem, produit: Produit) {
    const exists = selection.find(s => s.stockId === stockItem.id)
    if (exists) {
      setSelection(prev => prev.filter(s => s.stockId !== stockItem.id))
    } else {
      setSelection(prev => [...prev, {
        stockId: stockItem.id,
        produitId: produit.id,
        produitRef: produit.reference,
        couleur: stockItem.couleur,
        quantite: 1,
        maxQuantite: stockItem.quantite,
        prixUnitaire: produit.prix_vente,
      }])
    }
  }

  function updateQuantite(stockId: string, delta: number) {
    setSelection(prev => prev.map(s => {
      if (s.stockId !== stockId) return s
      const newQte = Math.max(1, Math.min(s.maxQuantite, s.quantite + delta))
      return { ...s, quantite: newQte }
    }))
  }

  function setQuantiteDirecte(stockId: string, val: number) {
    setSelection(prev => prev.map(s => {
      if (s.stockId !== stockId) return s
      const newQte = Math.max(1, Math.min(s.maxQuantite, val))
      return { ...s, quantite: newQte }
    }))
  }

  function handleCommander() {
    if (selection.length === 0) return
    const produitRef = selection[0].produitRef
    const variantes = selection.map(s => `${s.stockId}:${s.quantite}`).join(',')
    const query = new URLSearchParams({ produit: produitRef, taille, variantes })
    router.push(`/succes-design/catalogue/commande?${query.toString()}`)
  }

  const totalArticles = selection.reduce((s, i) => s + i.quantite, 0)
  const totalPrix = selection.reduce((s, i) => s + i.quantite * i.prixUnitaire, 0)

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7', fontFamily: "'DM Sans', sans-serif", paddingBottom: 120 }}>

      <header style={{ background: '#1a1a1a', padding: '16px 20px', textAlign: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <img src="/logo-ckdress.jpg" alt="CK Dress" style={{ height: '44px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
        </div>
        <p style={{ color: '#d4a853', fontSize: 12, margin: '6px 0 0', letterSpacing: 1, fontWeight: 600 }}>✨ SUCCÈS DESIGN — ABIDJAN</p>
      </header>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', margin: '0 0 20px', textAlign: 'center' }}>Trouvez votre article</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>1. Votre taille</label>
            <select value={taille} onChange={e => setTaille(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: taille ? '1.5px solid #1a1a1a' : '1.5px solid #e5e2dc', fontSize: 15, color: taille ? '#1a1a1a' : '#aaa', background: '#fff', outline: 'none', cursor: 'pointer' }}>
              <option value="">Choisir...</option>
              {tailles.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>2. Catégorie</label>
            <select value={categorie} onChange={e => setCategorie(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: categorie ? '1.5px solid #1a1a1a' : '1.5px solid #e5e2dc', fontSize: 15, color: categorie ? '#1a1a1a' : '#aaa', background: '#fff', outline: 'none', cursor: 'pointer' }}>
              <option value="">Choisir...</option>
              {categories.map(c => <option key={c.id} value={c.nom}>{c.nom}</option>)}
            </select>
          </div>
        </div>

        {!taille || !categorie ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: '#bbb' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✨</div>
            <p style={{ margin: 0, fontSize: 15 }}>
              {!taille && !categorie ? 'Sélectionnez votre taille et une catégorie' : !taille ? 'Sélectionnez votre taille' : 'Sélectionnez une catégorie'}
            </p>
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>Chargement...</div>
        ) : produitsAffiches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: '#bbb' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>😔</div>
            <p style={{ margin: 0, fontSize: 15 }}>Aucun article disponible en taille {taille} dans cette catégorie</p>
          </div>
        ) : (
          <>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#888', textAlign: 'center' }}>
              {produitsAffiches.length} article{produitsAffiches.length > 1 ? 's' : ''} disponible{produitsAffiches.length > 1 ? 's' : ''} en taille {taille}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
              {produitsAffiches.map(({ produit, stock }) =>
                stock.map(s => {
                  const selItem = selection.find(sel => sel.stockId === s.id)
                  const isSelected = !!selItem
                  const imageUrl = s.image_url || produit.image_url || null
                  return (
                    <div key={s.id} style={{ background: '#fff', border: isSelected ? '2.5px solid #d4a853' : '1.5px solid #ece9e3', borderRadius: 14, overflow: 'hidden', position: 'relative', transition: 'border-color 0.12s', boxShadow: isSelected ? '0 4px 16px rgba(212,168,83,0.2)' : '0 1px 4px rgba(0,0,0,0.06)' }}>

                      <div onClick={() => toggleSelection(s, produit)} style={{ cursor: 'pointer' }}>
                        <div style={{ width: '100%', aspectRatio: '3/4', background: 'linear-gradient(135deg, #f0ece4, #e8e1d5)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          {imageUrl ? <img src={imageUrl} alt={produit.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ fontSize: 36, opacity: 0.2 }}>✨</div>}
                        </div>
                        {s.quantite <= 5 && (
                          <div style={{ position: 'absolute', top: 8, left: 8, background: '#E24B4A', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20 }}>⚠️ Plus que {s.quantite} !</div>
                        )}
                        {isSelected && (
                          <div style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%', background: '#d4a853', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', fontWeight: 700 }}>✓</div>
                        )}
                      </div>

                      <div style={{ padding: '10px 12px 12px' }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{produit.nom}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>{s.couleur}</p>
                        <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 700, color: '#d4a853' }}>{produit.prix_vente.toLocaleString('fr-FR')} F</p>
                        <div style={{ marginTop: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: s.quantite <= 5 ? '#fff0f0' : '#f0fdf4', color: s.quantite <= 5 ? '#E24B4A' : '#1D9E75', border: `1px solid ${s.quantite <= 5 ? '#fecaca' : '#bbf7d0'}` }}>
                            {s.quantite <= 5 ? `⚠️ Plus que ${s.quantite} en stock !` : `${s.quantite} en stock`}
                          </span>
                        </div>

                        {/* ✅ SÉLECTEUR QUANTITÉ */}
                        {isSelected && (
                          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8f9fa', borderRadius: 10, padding: '6px 8px', border: '1px solid #e5e7eb' }}>
                            <button
                              onClick={e => { e.stopPropagation(); updateQuantite(s.id, -1) }}
                              style={{ width: 28, height: 28, borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 18, fontWeight: 700, color: '#E24B4A', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                              −
                            </button>
                            <input
                              type="number"
                              value={selItem.quantite}
                              min={1}
                              max={selItem.maxQuantite}
                              onChange={e => setQuantiteDirecte(s.id, Number(e.target.value))}
                              onClick={e => e.stopPropagation()}
                              style={{ width: 36, textAlign: 'center', border: 'none', background: 'transparent', fontSize: 15, fontWeight: 700, color: '#1a1a1a', outline: 'none' }}
                            />
                            <button
                              onClick={e => { e.stopPropagation(); updateQuantite(s.id, 1) }}
                              disabled={selItem.quantite >= selItem.maxQuantite}
                              style={{ width: 28, height: 28, borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: selItem.quantite >= selItem.maxQuantite ? 'not-allowed' : 'pointer', fontSize: 18, fontWeight: 700, color: selItem.quantite >= selItem.maxQuantite ? '#ccc' : '#d4a853', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                              +
                            </button>
                          </div>
                        )}

                        {!isSelected ? (
                          <button onClick={() => toggleSelection(s, produit)}
                            style={{ marginTop: 10, width: '100%', padding: '9px', borderRadius: 10, border: 'none', background: '#1a1a1a', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            Sélectionner
                          </button>
                        ) : (
                          <button onClick={() => toggleSelection(s, produit)}
                            style={{ marginTop: 8, width: '100%', padding: '7px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: 'transparent', color: '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            ✕ Retirer
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}
      </div>

      {selection.length > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #ece9e3', padding: '14px 20px', zIndex: 20, boxShadow: '0 -4px 20px rgba(0,0,0,0.08)' }}>
          <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>
                {totalArticles} article{totalArticles > 1 ? 's' : ''} — {totalPrix.toLocaleString('fr-FR')} F
              </p>
              <p style={{ margin: 0, fontSize: 12, color: '#888' }}>Taille {taille} — {categorie}</p>
            </div>
            <button onClick={handleCommander}
              style={{ background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 24px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#d4a853')}
              onMouseLeave={e => (e.currentTarget.style.background = '#1a1a1a')}>
              Commander →
            </button>
          </div>
        </div>
      )}
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
    </div>
  )
}