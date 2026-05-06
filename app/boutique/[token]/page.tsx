'use client'

import { useEffect, useState, use } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Boutique = { id: string; nom: string; lieu: string; responsable: string; telephone: string; token: string }
type StockItem = { id: string; boutique_id: string; produit_ref: string; nom_produit: string; taille: string; couleur: string; quantite: number; prix_vente: number }
type Vente = { id: string; nom_produit: string; taille: string; couleur: string; quantite: number; prix_unitaire: number; total: number; created_at: string }

export default function BoutiquePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [boutique, setBoutique] = useState<Boutique | null>(null)
  const [stock, setStock] = useState<StockItem[]>([])
  const [ventes, setVentes] = useState<Vente[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [onglet, setOnglet] = useState<'stock' | 'vendre' | 'historique' | 'reappro'>('stock')
  const [venteItem, setVenteItem] = useState<StockItem | null>(null)
  const [venteQte, setVenteQte] = useState(1)
  const [ventePrix, setVentePrix] = useState(0)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [reapproItem, setReapproItem] = useState({ produit_ref: '', nom_produit: '', taille: '', couleur: '', quantite_demandee: 1 })

  useEffect(() => { fetchData() }, [token])

  const fetchData = async () => {
    const { data: boutiques } = await supabase.from('boutiques').select('*').eq('token', token).eq('actif', true).limit(1)
    if (!boutiques || boutiques.length === 0) { setNotFound(true); setLoading(false); return }
    const b = boutiques[0]
    setBoutique(b)
    const [{ data: stockData }, { data: ventesData }] = await Promise.all([
      supabase.from('stock_boutique').select('*').eq('boutique_id', b.id).order('nom_produit'),
      supabase.from('ventes_boutique').select('*').eq('boutique_id', b.id).order('created_at', { ascending: false }),
    ])
    setStock(stockData || [])
    setVentes(ventesData || [])
    setLoading(false)
  }

  const enregistrerVente = async () => {
    if (!venteItem || venteQte <= 0) return
    if (venteQte > venteItem.quantite) { alert('Stock insuffisant !'); return }
    setSaving(true)
    await supabase.from('ventes_boutique').insert({ boutique_id: boutique!.id, produit_ref: venteItem.produit_ref, nom_produit: venteItem.nom_produit, taille: venteItem.taille, couleur: venteItem.couleur, quantite: venteQte, prix_unitaire: ventePrix, total: ventePrix * venteQte })
    await supabase.from('stock_boutique').update({ quantite: venteItem.quantite - venteQte }).eq('id', venteItem.id)
    setSuccess('✅ Vente enregistrée !')
    setTimeout(() => setSuccess(''), 2000)
    setVenteItem(null); setVenteQte(1)
    fetchData(); setSaving(false); setOnglet('historique')
  }

  const demanderReappro = async () => {
    if (!reapproItem.nom_produit) return
    setSaving(true)
    await supabase.from('reappro_boutique').insert({ boutique_id: boutique!.id, ...reapproItem })
    setSuccess('✅ Demande envoyée !')
    setTimeout(() => setSuccess(''), 2000)
    setReapproItem({ produit_ref: '', nom_produit: '', taille: '', couleur: '', quantite_demandee: 1 })
    setSaving(false)
  }

  const caTotal = ventes.reduce((s, v) => s + v.total, 0)
  const caJour = ventes.filter(v => new Date(v.created_at).toDateString() === new Date().toDateString()).reduce((s, v) => s + v.total, 0)

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f4f4f5' }}><p style={{ color: '#aaa' }}>Chargement...</p></div>
  if (notFound) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f4f4f5' }}><div style={{ textAlign: 'center', color: '#aaa' }}><div style={{ fontSize: '3rem' }}>🔒</div><p>Accès non autorisé</p></div></div>

  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f5', fontFamily: 'sans-serif', color: '#1a1a1a' }}>

      <div style={{ background: '#fff', borderBottom: '1px solid #e5e5e5', padding: '12px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ color: '#1D9E75', margin: 0, fontSize: '16px', fontWeight: 700 }}>🏪 {boutique?.nom}</h1>
            <p style={{ color: '#aaa', margin: '2px 0 0', fontSize: '11px' }}>📍 {boutique?.lieu} — {boutique?.responsable}</p>
          </div>
          <button onClick={fetchData} style={{ background: 'none', border: '1px solid #1D9E75', borderRadius: '6px', color: '#1D9E75', padding: '5px 10px', fontSize: '11px', cursor: 'pointer' }}>
            ↺ Actualiser
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', padding: '16px 16px 0' }}>
        {[
          { label: 'Articles en stock', value: stock.reduce((s, i) => s + i.quantite, 0), color: '#378ADD' },
          { label: 'Ventes totales', value: ventes.length, color: '#BA7517' },
          { label: "CA aujourd'hui", value: caJour.toLocaleString('fr-FR') + ' F', color: '#1D9E75' },
          { label: 'CA total', value: caTotal.toLocaleString('fr-FR') + ' F', color: '#1D9E75' },
        ].map((k, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '10px', padding: '10px 12px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '10px', color: '#aaa', textTransform: 'uppercase', marginBottom: '4px' }}>{k.label}</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #e5e5e5', background: '#fff', margin: '16px 0 0' }}>
        {[
          { key: 'stock', label: '📦 Stock' },
          { key: 'vendre', label: '💰 Vendre' },
          { key: 'historique', label: '📊 Historique' },
          { key: 'reappro', label: '🔄 Réappro' },
        ].map(o => (
          <button key={o.key} onClick={() => setOnglet(o.key as any)}
            style={{ flex: 1, padding: '12px', background: 'transparent', border: 'none', color: onglet === o.key ? '#1D9E75' : '#888', fontSize: '13px', fontWeight: 600, cursor: 'pointer', borderBottom: onglet === o.key ? '2px solid #1D9E75' : '2px solid transparent' }}>
            {o.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px' }}>
        {success && (
          <div style={{ background: '#f0fdf4', border: '1px solid #1D9E75', borderRadius: '8px', padding: '10px 16px', color: '#1D9E75', fontSize: '13px', marginBottom: '12px' }}>
            {success}
          </div>
        )}

        {onglet === 'stock' && (
          <div>
            {stock.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
                <div style={{ fontSize: '3rem' }}>📦</div>
                <p>Aucun article en stock</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                {stock.map(item => (
                  <div key={item.id} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '10px', padding: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: '14px', color: '#1a1a1a' }}>{item.nom_produit}</p>
                    <p style={{ margin: '0 0 2px', color: '#888', fontSize: '12px' }}>Taille {item.taille} — {item.couleur}</p>
                    <p style={{ margin: '0 0 8px', color: '#1D9E75', fontSize: '13px', fontWeight: 600 }}>{item.prix_vente.toLocaleString('fr-FR')} F</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#aaa' }}>Stock</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: item.quantite === 0 ? '#E24B4A' : item.quantite <= 2 ? '#BA7517' : '#1D9E75' }}>
                        {item.quantite} pcs
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {onglet === 'vendre' && (
          <div>
            {!venteItem ? (
              <>
                <p style={{ color: '#888', fontSize: '13px', marginBottom: '12px' }}>Sélectionnez un article à vendre :</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {stock.filter(s => s.quantite > 0).map(item => (
                    <div key={item.id} onClick={() => { setVenteItem(item); setVentePrix(item.prix_vente) }}
                      style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '10px', padding: '12px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '14px', color: '#1a1a1a' }}>{item.nom_produit}</p>
                        <p style={{ margin: '2px 0 0', color: '#888', fontSize: '12px' }}>{item.taille} — {item.couleur} — Stock: {item.quantite}</p>
                      </div>
                      <span style={{ color: '#1D9E75', fontWeight: 700 }}>{item.prix_vente.toLocaleString('fr-FR')} F →</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#1a1a1a' }}>💰 Enregistrer une vente</h3>
                <p style={{ color: '#1D9E75', fontWeight: 600, marginBottom: '16px' }}>{venteItem.nom_produit} — {venteItem.taille} / {venteItem.couleur}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Quantité vendue</label>
                    <input type="number" min={1} max={venteItem.quantite} value={venteQte} onChange={e => setVenteQte(Number(e.target.value))}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#f9f9f9', border: '1px solid #e5e5e5', color: '#1a1a1a', fontSize: '14px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Prix de vente (F)</label>
                    <input type="number" value={ventePrix} onChange={e => setVentePrix(Number(e.target.value))}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#f9f9f9', border: '1px solid #e5e5e5', color: '#1a1a1a', fontSize: '14px', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ background: '#f0fdf4', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#888' }}>Total</span>
                    <span style={{ color: '#1D9E75', fontWeight: 700, fontSize: '16px' }}>{(ventePrix * venteQte).toLocaleString('fr-FR')} F</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setVenteItem(null)} style={{ flex: 1, padding: '12px', borderRadius: '8px', background: 'transparent', border: '1px solid #e5e5e5', color: '#888', cursor: 'pointer' }}>
                    Annuler
                  </button>
                  <button onClick={enregistrerVente} disabled={saving} style={{ flex: 2, padding: '12px', borderRadius: '8px', background: '#1D9E75', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>
                    {saving ? '...' : '✅ Confirmer la vente'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {onglet === 'historique' && (
          <div>
            {ventes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
                <div style={{ fontSize: '3rem' }}>📊</div>
                <p>Aucune vente enregistrée</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {ventes.map(vente => (
                  <div key={vente.id} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '14px', color: '#1a1a1a' }}>{vente.nom_produit}</p>
                      <p style={{ margin: '2px 0 0', color: '#888', fontSize: '12px' }}>{vente.taille} — {vente.couleur} × {vente.quantite}</p>
                      <p style={{ margin: '2px 0 0', color: '#aaa', fontSize: '11px' }}>
                        {new Date(vente.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span style={{ color: '#1D9E75', fontWeight: 700, fontSize: '15px' }}>{vente.total.toLocaleString('fr-FR')} F</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {onglet === 'reappro' && (
          <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#1a1a1a' }}>🔄 Demande de réapprovisionnement</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              <input value={reapproItem.nom_produit} onChange={e => setReapproItem(prev => ({ ...prev, nom_produit: e.target.value }))}
                placeholder="Nom du produit"
                style={{ padding: '10px', borderRadius: '8px', background: '#f9f9f9', border: '1px solid #e5e5e5', color: '#1a1a1a', fontSize: '14px' }} />
              <div style={{ display: 'flex', gap: '10px' }}>
                <input value={reapproItem.taille} onChange={e => setReapproItem(prev => ({ ...prev, taille: e.target.value }))}
                  placeholder="Taille" style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#f9f9f9', border: '1px solid #e5e5e5', color: '#1a1a1a', fontSize: '14px' }} />
                <input value={reapproItem.couleur} onChange={e => setReapproItem(prev => ({ ...prev, couleur: e.target.value }))}
                  placeholder="Couleur" style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#f9f9f9', border: '1px solid #e5e5e5', color: '#1a1a1a', fontSize: '14px' }} />
                <input type="number" min={1} value={reapproItem.quantite_demandee} onChange={e => setReapproItem(prev => ({ ...prev, quantite_demandee: Number(e.target.value) }))}
                  placeholder="Qté" style={{ width: '80px', padding: '10px', borderRadius: '8px', background: '#f9f9f9', border: '1px solid #e5e5e5', color: '#1a1a1a', fontSize: '14px' }} />
              </div>
            </div>
            <button onClick={demanderReappro} disabled={saving}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#1D9E75', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>
              {saving ? '...' : '📤 Envoyer la demande'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}