'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function GestionnaireStockPage() {
  const [stock, setStock] = useState<any[]>([])
  const [produits, setProduits] = useState<any[]>([])
  const [boutiques, setBoutiques] = useState<any[]>([])
  const [mouvements, setMouvements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet] = useState<'stock' | 'produits' | 'approvisionner' | 'historique'>('stock')
  const [user, setUser] = useState<any>(null)
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [approForm, setApproForm] = useState({ boutique_id: '', nom_produit: '', taille: '', couleur: '', quantite: 1, prix_vente: 0 })

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('ck_user') || '{}')
    setUser(u)
    fetchData()
  }, [])

  const fetchData = async () => {
    const [{ data: stockData }, { data: prodsData }, { data: boutsData }, { data: ventesData }] = await Promise.all([
      supabase.from('stock').select('*, produits(nom, reference)').order('quantite'),
      supabase.from('produits').select('*').order('nom'),
      supabase.from('boutiques').select('*').eq('actif', true),
      supabase.from('ventes_boutique').select('*').order('created_at', { ascending: false }).limit(30),
    ])
    setStock(stockData || [])
    setProduits(prodsData || [])
    setBoutiques(boutsData || [])
    setMouvements(ventesData || [])
    setLoading(false)
  }

  const approvisionnerBoutique = async () => {
    if (!approForm.boutique_id || !approForm.nom_produit) return
    setSaving(true)
    const exist = (await supabase.from('stock_boutique').select('*')
      .eq('boutique_id', approForm.boutique_id)
      .eq('nom_produit', approForm.nom_produit)
      .eq('taille', approForm.taille)
      .eq('couleur', approForm.couleur)
      .single()).data

    if (exist) {
      await supabase.from('stock_boutique').update({ quantite: exist.quantite + approForm.quantite }).eq('id', exist.id)
    } else {
      await supabase.from('stock_boutique').insert({ ...approForm, produit_ref: approForm.nom_produit })
    }
    setSuccess('✅ Boutique approvisionnée !')
    setTimeout(() => setSuccess(''), 2000)
    setApproForm({ boutique_id: '', nom_produit: '', taille: '', couleur: '', quantite: 1, prix_vente: 0 })
    fetchData()
    setSaving(false)
  }

  const stockCritique = stock.filter(s => s.quantite <= 3)
  const totalArticles = stock.reduce((s, i) => s + i.quantite, 0)

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: 'sans-serif', color: 'white' }}>

      <div style={{ background: '#111', borderBottom: '1px solid #222', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: '#0891b2', margin: 0, fontSize: '16px', fontWeight: 700 }}>📦 Gestionnaire Stock</h1>
          <p style={{ color: '#555', margin: '2px 0 0', fontSize: '11px' }}>{user?.nom} — {user?.activite}</p>
        </div>
        <button onClick={() => { localStorage.removeItem('ck_user'); window.location.href = '/login' }}
          style={{ background: 'none', border: '0.5px solid #333', borderRadius: '6px', color: '#555', padding: '5px 10px', fontSize: '11px', cursor: 'pointer' }}>
          Déconnexion
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', padding: '16px 16px 0' }}>
        {[
          { label: 'Total articles', value: totalArticles, color: '#0891b2' },
          { label: 'Références', value: produits.length, color: 'white' },
          { label: 'Stock critique', value: stockCritique.length, color: stockCritique.length > 0 ? '#E24B4A' : '#1D9E75' },
          { label: 'Boutiques', value: boutiques.length, color: '#1D9E75' },
        ].map((k, i) => (
          <div key={i} style={{ background: '#111', border: '1px solid #222', borderRadius: '10px', padding: '12px 14px' }}>
            <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', marginBottom: '4px' }}>{k.label}</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* ONGLETS */}
      <div style={{ display: 'flex', borderBottom: '1px solid #222', background: '#111', margin: '16px 0 0' }}>
        {[
          { key: 'stock', label: '📦 Stock central' },
          { key: 'produits', label: '🏷️ Produits' },
          { key: 'approvisionner', label: '🏪 Approvisionner' },
          { key: 'historique', label: '📋 Historique' },
        ].map(o => (
          <button key={o.key} onClick={() => setOnglet(o.key as any)}
            style={{ flex: 1, padding: '12px', background: 'transparent', border: 'none', color: onglet === o.key ? '#0891b2' : '#555', fontSize: '13px', fontWeight: 600, cursor: 'pointer', borderBottom: onglet === o.key ? '2px solid #0891b2' : '2px solid transparent' }}>
            {o.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px' }}>
        {success && (
          <div style={{ background: '#0a2a1a', border: '1px solid #1D9E75', borderRadius: '8px', padding: '10px 16px', color: '#1D9E75', fontSize: '13px', marginBottom: '12px' }}>
            {success}
          </div>
        )}

        {/* STOCK CENTRAL */}
        {onglet === 'stock' && (
          <div>
            {stockCritique.length > 0 && (
              <div style={{ background: '#2a1010', border: '1px solid #E24B4A', borderRadius: '8px', padding: '10px 16px', marginBottom: '12px' }}>
                <p style={{ margin: 0, color: '#E24B4A', fontSize: '13px', fontWeight: 600 }}>
                  ⚠️ {stockCritique.length} article(s) en stock critique (≤ 3 pièces) !
                </p>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
              {stock.map(item => (
                <div key={item.id} style={{ background: '#111', border: `1px solid ${item.quantite <= 3 ? '#E24B4A44' : '#222'}`, borderRadius: '10px', padding: '12px' }}>
                  <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: '13px' }}>{(item.produits as any)?.nom || item.produit_id}</p>
                  <p style={{ margin: '0 0 2px', color: '#888', fontSize: '11px' }}>Taille {item.taille} — {item.couleur}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#666' }}>Stock</span>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: item.quantite <= 3 ? '#E24B4A' : item.quantite <= 10 ? '#EF9F27' : '#1D9E75' }}>
                      {item.quantite} pcs
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PRODUITS */}
        {onglet === 'produits' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {produits.map(prod => (
              <div key={prod.id} style={{ background: '#111', border: '1px solid #222', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>{prod.nom}</p>
                  <p style={{ margin: '2px 0 0', color: '#888', fontSize: '12px' }}>Réf: {prod.reference}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, color: '#1D9E75', fontWeight: 700, fontSize: '14px' }}>{prod.prix_vente?.toLocaleString('fr-FR')} F</p>
                  <span style={{ fontSize: '11px', background: prod.disponible ? '#1a2e25' : '#2a1010', color: prod.disponible ? '#1D9E75' : '#E24B4A', padding: '2px 8px', borderRadius: '10px' }}>
                    {prod.disponible ? 'Disponible' : 'Indisponible'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* APPROVISIONNER BOUTIQUE */}
        {onglet === 'approvisionner' && (
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '20px', maxWidth: '500px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: '#0891b2' }}>🏪 Approvisionner une boutique</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Boutique *</label>
                <select value={approForm.boutique_id} onChange={e => setApproForm(p => ({ ...p, boutique_id: e.target.value }))}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#1a1a1a', border: '1px solid #333', color: 'white', fontSize: '13px' }}>
                  <option value="">Choisir une boutique...</option>
                  {boutiques.map(b => <option key={b.id} value={b.id}>{b.nom} — {b.lieu}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Produit *</label>
                <select value={approForm.nom_produit} onChange={e => {
                  const prod = produits.find(p => p.nom === e.target.value)
                  setApproForm(p => ({ ...p, nom_produit: e.target.value, prix_vente: prod?.prix_vente || 0 }))
                }}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#1a1a1a', border: '1px solid #333', color: 'white', fontSize: '13px' }}>
                  <option value="">Choisir un produit...</option>
                  {produits.map(p => <option key={p.id} value={p.nom}>{p.nom}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Taille</label>
                  <select value={approForm.taille} onChange={e => setApproForm(p => ({ ...p, taille: e.target.value }))}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#1a1a1a', border: '1px solid #333', color: 'white', fontSize: '13px' }}>
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Couleur</label>
                  <input value={approForm.couleur} onChange={e => setApproForm(p => ({ ...p, couleur: e.target.value }))}
                    placeholder="Ex: Noir"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#1a1a1a', border: '1px solid #333', color: 'white', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Quantité</label>
                  <input type="number" min={1} value={approForm.quantite} onChange={e => setApproForm(p => ({ ...p, quantite: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#1a1a1a', border: '1px solid #333', color: 'white', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Prix vente boutique</label>
                  <input type="number" value={approForm.prix_vente} onChange={e => setApproForm(p => ({ ...p, prix_vente: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#1a1a1a', border: '1px solid #333', color: 'white', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
              </div>
              <button onClick={approvisionnerBoutique} disabled={saving}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#0891b2', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>
                {saving ? '...' : '✅ Approvisionner'}
              </button>
            </div>
          </div>
        )}

        {/* HISTORIQUE */}
        {onglet === 'historique' && (
          <div>
            <h3 style={{ margin: '0 0 14px', fontSize: '13px', color: '#888', textTransform: 'uppercase' }}>📋 Dernières ventes boutiques</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {mouvements.map(v => (
                <div key={v.id} style={{ background: '#111', border: '1px solid #222', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '13px' }}>{v.nom_produit}</p>
                    <p style={{ margin: '2px 0 0', color: '#888', fontSize: '11px' }}>{v.taille} — {v.couleur} × {v.quantite}</p>
                    <p style={{ margin: '2px 0 0', color: '#555', fontSize: '11px' }}>
                      {new Date(v.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span style={{ color: '#1D9E75', fontWeight: 700, fontSize: '14px' }}>{v.total?.toLocaleString('fr-FR')} F</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}