'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Boutique = {
  id: string
  nom: string
  lieu: string
  responsable: string
  telephone: string
  token: string
  actif: boolean
}

export default function AdminBoutiquesPage() {
  const [boutiques, setBoutiques] = useState<Boutique[]>([])
  const [selected, setSelected] = useState<Boutique | null>(null)
  const [stock, setStock] = useState<any[]>([])
  const [ventes, setVentes] = useState<any[]>([])
  const [reappros, setReappros] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nom: '', lieu: '', responsable: '', telephone: '' })
  const [saving, setSaving] = useState(false)
  const [showAddStock, setShowAddStock] = useState(false)
  const [stockForm, setStockForm] = useState({ nom_produit: '', produit_ref: '', taille: '', couleur: '', quantite: 1, prix_vente: 0 })

  useEffect(() => { fetchBoutiques() }, [])

  const fetchBoutiques = async () => {
    const { data } = await supabase.from('boutiques').select('*').order('created_at', { ascending: false })
    setBoutiques(data || [])
    setLoading(false)
  }

  const fetchBoutiqueData = async (boutique: Boutique) => {
    setSelected(boutique)
    const [{ data: s }, { data: v }, { data: r }] = await Promise.all([
      supabase.from('stock_boutique').select('*').eq('boutique_id', boutique.id).order('nom_produit'),
      supabase.from('ventes_boutique').select('*').eq('boutique_id', boutique.id).order('created_at', { ascending: false }),
      supabase.from('reappro_boutique').select('*').eq('boutique_id', boutique.id).order('created_at', { ascending: false }),
    ])
    setStock(s || [])
    setVentes(v || [])
    setReappros(r || [])
  }

  const generateToken = () => Math.random().toString(36).substring(2, 10).toUpperCase()

  const addBoutique = async () => {
    if (!form.nom || !form.lieu || !form.responsable || !form.telephone) return
    setSaving(true)
    await supabase.from('boutiques').insert({ ...form, token: generateToken() })
    setForm({ nom: '', lieu: '', responsable: '', telephone: '' })
    setShowForm(false)
    fetchBoutiques()
    setSaving(false)
  }

  const addStock = async () => {
    if (!selected || !stockForm.nom_produit) return
    setSaving(true)
    const exist = stock.find(s => s.taille === stockForm.taille && s.couleur === stockForm.couleur && s.nom_produit === stockForm.nom_produit)
    if (exist) {
      await supabase.from('stock_boutique').update({ quantite: exist.quantite + stockForm.quantite }).eq('id', exist.id)
    } else {
      await supabase.from('stock_boutique').insert({ ...stockForm, boutique_id: selected.id })
    }
    setStockForm({ nom_produit: '', produit_ref: '', taille: '', couleur: '', quantite: 1, prix_vente: 0 })
    setShowAddStock(false)
    fetchBoutiqueData(selected)
    setSaving(false)
  }

  const validerReappro = async (reappro: any) => {
    await supabase.from('reappro_boutique').update({ statut: 'validé' }).eq('id', reappro.id)
    const exist = stock.find(s => s.taille === reappro.taille && s.couleur === reappro.couleur && s.nom_produit === reappro.nom_produit)
    if (exist) {
      await supabase.from('stock_boutique').update({ quantite: exist.quantite + reappro.quantite_demandee }).eq('id', exist.id)
    } else {
      await supabase.from('stock_boutique').insert({
        boutique_id: selected!.id,
        nom_produit: reappro.nom_produit,
        produit_ref: reappro.produit_ref || '',
        taille: reappro.taille,
        couleur: reappro.couleur,
        quantite: reappro.quantite_demandee,
        prix_vente: 0,
      })
    }
    fetchBoutiqueData(selected!)
  }

  const caTotal = ventes.reduce((s: number, v: any) => s + v.total, 0)
  const caJour = ventes.filter((v: any) => new Date(v.created_at).toDateString() === new Date().toDateString()).reduce((s: number, v: any) => s + v.total, 0)

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: 'sans-serif', color: 'white', display: 'flex' }}>

      {/* SIDEBAR BOUTIQUES */}
      <div style={{ width: '280px', background: '#111', borderRight: '1px solid #222', padding: '16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', color: '#1D9E75' }}>🏪 Boutiques</h2>
          <button onClick={() => setShowForm(!showForm)} style={{ background: '#1D9E75', border: 'none', borderRadius: '6px', color: 'white', padding: '5px 10px', fontSize: '12px', cursor: 'pointer' }}>+</button>
        </div>

        {showForm && (
          <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '12px', marginBottom: '12px' }}>
            {['nom', 'lieu', 'responsable', 'telephone'].map(field => (
              <input
                key={field}
                value={(form as any)[field]}
                onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', background: '#111', border: '1px solid #333', color: 'white', fontSize: '12px', marginBottom: '8px', boxSizing: 'border-box' }}
              />
            ))}
            <button onClick={addBoutique} disabled={saving} style={{ width: '100%', padding: '8px', background: '#1D9E75', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
              {saving ? '...' : 'Créer'}
            </button>
          </div>
        )}

        {boutiques.map(b => (
          <div
            key={b.id}
            onClick={() => fetchBoutiqueData(b)}
            style={{ background: selected?.id === b.id ? '#1a2e25' : '#1a1a1a', border: `1px solid ${selected?.id === b.id ? '#1D9E75' : '#222'}`, borderRadius: '10px', padding: '12px', marginBottom: '8px', cursor: 'pointer' }}
          >
            <p style={{ margin: 0, fontWeight: 600, fontSize: '14px', color: selected?.id === b.id ? '#1D9E75' : 'white' }}>{b.nom}</p>
            <p style={{ margin: '2px 0 0', color: '#888', fontSize: '11px' }}>📍 {b.lieu}</p>
            <p style={{ margin: '2px 0 0', color: '#555', fontSize: '11px' }}>👤 {b.responsable}</p>
          </div>
        ))}
      </div>

      {/* DETAIL BOUTIQUE */}
      {!selected ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem' }}>🏪</div>
            <p>Sélectionnez une boutique</p>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, padding: '24px', overflow: 'auto' }}>

          {/* Header boutique */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px' }}>{selected.nom}</h2>
              <p style={{ margin: '4px 0 0', color: '#888', fontSize: '13px' }}>📍 {selected.lieu} — 👤 {selected.responsable} — 📞 {selected.telephone}</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/boutique/${selected.token}`)}
                style={{ padding: '8px 14px', background: 'transparent', border: '1px solid #333', color: '#888', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}
              >
                📋 Copier lien
              </button>
              <button
                onClick={() => setShowAddStock(!showAddStock)}
                style={{ padding: '8px 14px', background: '#1D9E75', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
              >
                + Ajouter stock
              </button>
            </div>
          </div>

          {/* Formulaire ajout stock */}
          {showAddStock && (
            <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '14px' }}>Ajouter du stock</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                {[
                  { key: 'nom_produit', placeholder: 'Nom produit' },
                  { key: 'taille', placeholder: 'Taille' },
                  { key: 'couleur', placeholder: 'Couleur' },
                ].map(f => (
                  <input
                    key={f.key}
                    value={(stockForm as any)[f.key]}
                    onChange={e => setStockForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{ padding: '8px 12px', borderRadius: '8px', background: '#1a1a1a', border: '1px solid #333', color: 'white', fontSize: '13px' }}
                  />
                ))}
                <input
                  type="number" value={stockForm.quantite}
                  onChange={e => setStockForm(prev => ({ ...prev, quantite: Number(e.target.value) }))}
                  placeholder="Quantité"
                  style={{ padding: '8px 12px', borderRadius: '8px', background: '#1a1a1a', border: '1px solid #333', color: 'white', fontSize: '13px' }}
                />
                <input
                  type="number" value={stockForm.prix_vente}
                  onChange={e => setStockForm(prev => ({ ...prev, prix_vente: Number(e.target.value) }))}
                  placeholder="Prix vente (F)"
                  style={{ padding: '8px 12px', borderRadius: '8px', background: '#1a1a1a', border: '1px solid #333', color: 'white', fontSize: '13px' }}
                />
              </div>
              <button onClick={addStock} disabled={saving} style={{ marginTop: '12px', padding: '8px 20px', background: '#1D9E75', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                {saving ? '...' : 'Ajouter'}
              </button>
            </div>
          )}

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '20px' }}>
            {[
              { label: 'Articles en stock', value: stock.reduce((s: number, i: any) => s + i.quantite, 0), color: '#378ADD' },
              { label: 'Ventes totales', value: ventes.length, color: '#BA7517' },
              { label: "CA aujourd'hui", value: caJour.toLocaleString('fr-FR') + ' F', color: '#1D9E75' },
              { label: 'CA total', value: caTotal.toLocaleString('fr-FR') + ' F', color: '#1D9E75' },
            ].map((k, i) => (
              <div key={i} style={{ background: '#111', border: '1px solid #222', borderRadius: '10px', padding: '12px 14px' }}>
                <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', marginBottom: '4px' }}>{k.label}</div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: k.color }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* 3 sections côte à côte */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>

            {/* Stock */}
            <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '16px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '13px', color: '#378ADD', textTransform: 'uppercase' }}>📦 Stock</h3>
              {stock.length === 0 ? <p style={{ color: '#444', fontSize: '12px', textAlign: 'center' }}>Vide</p> : (
                stock.map((item: any) => (
                  <div key={item.id} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '10px', marginBottom: '8px' }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '13px' }}>{item.nom_produit}</p>
                    <p style={{ margin: '2px 0', color: '#888', fontSize: '11px' }}>{item.taille} — {item.couleur}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#1D9E75', fontSize: '12px' }}>{item.prix_vente.toLocaleString('fr-FR')} F</span>
                      <span style={{ color: item.quantite === 0 ? '#ff6b6b' : item.quantite <= 2 ? '#BA7517' : '#4ade80', fontWeight: 700, fontSize: '13px' }}>
                        {item.quantite} pcs
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Ventes récentes */}
            <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '16px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '13px', color: '#BA7517', textTransform: 'uppercase' }}>💰 Ventes récentes</h3>
              {ventes.length === 0 ? <p style={{ color: '#444', fontSize: '12px', textAlign: 'center' }}>Aucune</p> : (
                ventes.slice(0, 10).map((v: any) => (
                  <div key={v.id} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '10px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '13px' }}>{v.nom_produit}</p>
                      <span style={{ color: '#1D9E75', fontWeight: 700, fontSize: '13px' }}>{v.total.toLocaleString('fr-FR')} F</span>
                    </div>
                    <p style={{ margin: '2px 0 0', color: '#888', fontSize: '11px' }}>{v.taille} — {v.couleur} × {v.quantite}</p>
                    <p style={{ margin: '2px 0 0', color: '#555', fontSize: '10px' }}>
                      {new Date(v.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Réappros */}
            <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '16px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '13px', color: '#7c3aed', textTransform: 'uppercase' }}>🔄 Réapprovisionnements</h3>
              {reappros.length === 0 ? <p style={{ color: '#444', fontSize: '12px', textAlign: 'center' }}>Aucune demande</p> : (
                reappros.map((r: any) => (
                  <div key={r.id} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '10px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '13px' }}>{r.nom_produit}</p>
                        <p style={{ margin: '2px 0 0', color: '#888', fontSize: '11px' }}>{r.taille} — {r.couleur} × {r.quantite_demandee}</p>
                      </div>
                      {r.statut === 'en_attente' ? (
                        <button
                          onClick={() => validerReappro(r)}
                          style={{ padding: '5px 10px', background: 'rgba(29,158,117,0.1)', border: '0.5px solid rgba(29,158,117,0.3)', color: '#1D9E75', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                        >
                          ✅ Valider
                        </button>
                      ) : (
                        <span style={{ color: '#1D9E75', fontSize: '11px' }}>✅ Validé</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}