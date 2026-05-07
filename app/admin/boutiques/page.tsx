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
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: "'Inter', sans-serif", color: '#1a1a1a', display: 'flex', flexDirection: 'column' }}>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>
        <span style={{ color: '#34d399', fontSize: '16px', fontWeight: 700 }}>🏪 Admin — Boutiques</span>
        <span style={{ color: '#94a3b8', fontSize: '12px' }}>{boutiques.length} boutique{boutiques.length > 1 ? 's' : ''}</span>
      </div>

      <div style={{ display: 'flex', flex: 1 }}>

        {/* SIDEBAR BOUTIQUES */}
        <div style={{ width: '280px', background: '#fff', borderRight: '1px solid #e5e7eb', padding: '16px', flexShrink: 0, boxShadow: '1px 0 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '14px', color: '#1D9E75', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>🏪 Boutiques</h2>
            <button onClick={() => setShowForm(!showForm)}
              style={{ background: '#1D9E75', border: 'none', borderRadius: '6px', color: 'white', padding: '5px 12px', fontSize: '13px', cursor: 'pointer', fontWeight: 700 }}>+</button>
          </div>

          {showForm && (
            <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '14px', marginBottom: '14px', border: '1px solid #e5e7eb' }}>
              {['nom', 'lieu', 'responsable', 'telephone'].map(field => (
                <input
                  key={field}
                  value={(form as any)[field]}
                  onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                  placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#fff', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '12px', marginBottom: '8px', boxSizing: 'border-box', outline: 'none' }}
                />
              ))}
              <button onClick={addBoutique} disabled={saving}
                style={{ width: '100%', padding: '9px', background: '#1D9E75', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>
                {saving ? '...' : 'Créer'}
              </button>
            </div>
          )}

          {boutiques.map(b => (
            <div
              key={b.id}
              onClick={() => fetchBoutiqueData(b)}
              style={{
                background: selected?.id === b.id ? '#f0fdf4' : '#f8f9fa',
                border: `1.5px solid ${selected?.id === b.id ? '#1D9E75' : '#e5e7eb'}`,
                borderRadius: '12px', padding: '12px', marginBottom: '8px', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: selected?.id === b.id ? '#1D9E75' : '#1a1a1a' }}>{b.nom}</p>
              <p style={{ margin: '2px 0 0', color: '#888', fontSize: '11px' }}>📍 {b.lieu}</p>
              <p style={{ margin: '2px 0 0', color: '#aaa', fontSize: '11px' }}>👤 {b.responsable}</p>
            </div>
          ))}
        </div>

        {/* DETAIL BOUTIQUE */}
        {!selected ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏪</div>
              <p style={{ fontSize: 15, fontWeight: 600 }}>Sélectionnez une boutique</p>
              <p style={{ fontSize: 13, color: '#bbb' }}>Cliquez sur une boutique dans la liste</p>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, padding: '24px', overflow: 'auto' }}>

            {/* Header boutique */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: '#fff', borderRadius: '14px', padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1a1a1a' }}>{selected.nom}</h2>
                <p style={{ margin: '4px 0 0', color: '#888', fontSize: '13px' }}>📍 {selected.lieu} — 👤 {selected.responsable} — 📞 {selected.telephone}</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}/boutique/${selected.token}`)}
                  style={{ padding: '9px 14px', background: '#f8f9fa', border: '1.5px solid #e5e7eb', color: '#555', borderRadius: '9px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                  📋 Copier lien
                </button>
                <button
                  onClick={() => setShowAddStock(!showAddStock)}
                  style={{ padding: '9px 14px', background: '#1D9E75', border: 'none', color: 'white', borderRadius: '9px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, boxShadow: '0 4px 12px rgba(29,158,117,0.3)' }}>
                  + Ajouter stock
                </button>
              </div>
            </div>

            {/* Formulaire ajout stock */}
            {showAddStock && (
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '18px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
                <h3 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 700, color: '#1D9E75' }}>Ajouter du stock</h3>
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
                      style={{ padding: '9px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', outline: 'none' }}
                    />
                  ))}
                  <input type="number" value={stockForm.quantite}
                    onChange={e => setStockForm(prev => ({ ...prev, quantite: Number(e.target.value) }))}
                    placeholder="Quantité"
                    style={{ padding: '9px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', outline: 'none' }}
                  />
                  <input type="number" value={stockForm.prix_vente}
                    onChange={e => setStockForm(prev => ({ ...prev, prix_vente: Number(e.target.value) }))}
                    placeholder="Prix vente (F)"
                    style={{ padding: '9px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', outline: 'none' }}
                  />
                </div>
                <button onClick={addStock} disabled={saving}
                  style={{ marginTop: '14px', padding: '9px 24px', background: '#1D9E75', border: 'none', borderRadius: '9px', color: 'white', cursor: 'pointer', fontWeight: 700, boxShadow: '0 4px 12px rgba(29,158,117,0.3)' }}>
                  {saving ? '...' : 'Ajouter'}
                </button>
              </div>
            )}

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '20px' }}>
              {[
                { label: 'Articles en stock', value: stock.reduce((s: number, i: any) => s + i.quantite, 0), color: '#378ADD', bg: '#eff6ff' },
                { label: 'Ventes totales', value: ventes.length, color: '#BA7517', bg: '#fff8e6' },
                { label: "CA aujourd'hui", value: caJour.toLocaleString('fr-FR') + ' F', color: '#1D9E75', bg: '#f0fdf4' },
                { label: 'CA total', value: caTotal.toLocaleString('fr-FR') + ' F', color: '#1D9E75', bg: '#f0fdf4' },
              ].map((k, i) => (
                <div key={i} style={{ background: k.bg, border: '1px solid #e5e7eb', borderRadius: '12px', padding: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600, letterSpacing: 0.5 }}>{k.label}</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: k.color }}>{k.value}</div>
                </div>
              ))}
            </div>

            {/* 3 sections côte à côte */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>

              {/* Stock */}
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '12px', color: '#378ADD', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>📦 Stock</h3>
                {stock.length === 0 ? <p style={{ color: '#ccc', fontSize: '12px', textAlign: 'center' }}>Vide</p> : (
                  stock.map((item: any) => (
                    <div key={item.id} style={{ background: '#f8f9fa', borderRadius: '9px', padding: '10px', marginBottom: '8px', border: '1px solid #e5e7eb' }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: '#1a1a1a' }}>{item.nom_produit}</p>
                      <p style={{ margin: '2px 0', color: '#888', fontSize: '11px' }}>{item.taille} — {item.couleur}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#1D9E75', fontSize: '12px', fontWeight: 600 }}>{item.prix_vente.toLocaleString('fr-FR')} F</span>
                        <span style={{
                          fontWeight: 700, fontSize: '12px', padding: '1px 8px', borderRadius: '20px',
                          background: item.quantite === 0 ? '#fff0f0' : item.quantite <= 2 ? '#fff8e6' : '#f0fdf4',
                          color: item.quantite === 0 ? '#E24B4A' : item.quantite <= 2 ? '#BA7517' : '#1D9E75'
                        }}>
                          {item.quantite} pcs
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Ventes récentes */}
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '12px', color: '#BA7517', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>💰 Ventes récentes</h3>
                {ventes.length === 0 ? <p style={{ color: '#ccc', fontSize: '12px', textAlign: 'center' }}>Aucune</p> : (
                  ventes.slice(0, 10).map((v: any) => (
                    <div key={v.id} style={{ background: '#f8f9fa', borderRadius: '9px', padding: '10px', marginBottom: '8px', border: '1px solid #e5e7eb' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: '#1a1a1a' }}>{v.nom_produit}</p>
                        <span style={{ color: '#1D9E75', fontWeight: 700, fontSize: '13px' }}>{v.total.toLocaleString('fr-FR')} F</span>
                      </div>
                      <p style={{ margin: '2px 0 0', color: '#888', fontSize: '11px' }}>{v.taille} — {v.couleur} × {v.quantite}</p>
                      <p style={{ margin: '2px 0 0', color: '#aaa', fontSize: '10px' }}>
                        {new Date(v.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Réappros */}
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '12px', color: '#7c3aed', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>🔄 Réapprovisionnements</h3>
                {reappros.length === 0 ? <p style={{ color: '#ccc', fontSize: '12px', textAlign: 'center' }}>Aucune demande</p> : (
                  reappros.map((r: any) => (
                    <div key={r.id} style={{ background: '#f8f9fa', borderRadius: '9px', padding: '10px', marginBottom: '8px', border: '1px solid #e5e7eb' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: '#1a1a1a' }}>{r.nom_produit}</p>
                          <p style={{ margin: '2px 0 0', color: '#888', fontSize: '11px' }}>{r.taille} — {r.couleur} × {r.quantite_demandee}</p>
                        </div>
                        {r.statut === 'en_attente' ? (
                          <button
                            onClick={() => validerReappro(r)}
                            style={{ padding: '5px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#1D9E75', borderRadius: '7px', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}>
                            ✅ Valider
                          </button>
                        ) : (
                          <span style={{ color: '#1D9E75', fontSize: '11px', fontWeight: 600 }}>✅ Validé</span>
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
    </div>
  )
}