'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Lot = {
  id: string
  reference: string
  nom_produit: string
  modele: string
  couleur: string
  taille: string
  quantite_commandee: number
  quantite_produite: number
  etape: string
  priorite: string
  date_debut: string
  date_fin_prevue: string
  cout_tissu: number
  cout_confection: number
  cout_total: number
  atelier_id: string
  notes: string
  created_at: string
}

type Atelier = {
  id: string
  nom: string
  responsable: string
  telephone: string
  code: string
  specialite: string
}

const ETAPES = [
  { key: 'commande_tissu', label: 'Commande tissu', color: '#378ADD', bg: 'rgba(55,138,221,0.12)', textColor: '#185FA5' },
  { key: 'coupe', label: 'Coupe', color: '#7c3aed', bg: 'rgba(124,58,237,0.12)', textColor: '#5b21b6' },
  { key: 'confection', label: 'Confection', color: '#BA7517', bg: 'rgba(239,159,39,0.12)', textColor: '#854F0B' },
  { key: 'finition', label: 'Finition', color: '#E24B4A', bg: 'rgba(226,75,74,0.12)', textColor: '#A32D2D' },
  { key: 'controle_qualite', label: 'Contrôle qualité', color: '#0891b2', bg: 'rgba(8,145,178,0.12)', textColor: '#0e7490' },
  { key: 'stock', label: 'Stock', color: '#0F6E56', bg: 'rgba(29,158,117,0.12)', textColor: '#085041' },
]

const PRIORITES: Record<string, { label: string; color: string }> = {
  urgente: { label: '🔴 Urgente', color: '#E24B4A' },
  haute: { label: '🟠 Haute', color: '#BA7517' },
  normale: { label: '🟡 Normale', color: '#888' },
}

export default function ProductionPage() {
  const [lots, setLots] = useState<Lot[]>([])
  const [ateliers, setAteliers] = useState<Atelier[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showAtelierForm, setShowAtelierForm] = useState(false)
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({
    nom_produit: '', modele: '', couleur: '', taille: '',
    quantite_commandee: 1, priorite: 'normale',
    date_debut: '', date_fin_prevue: '',
    cout_tissu: 0, cout_confection: 0,
    atelier_id: '', notes: ''
  })
  const [atelierForm, setAtelierForm] = useState({
    nom: '', responsable: '', telephone: '', specialite: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const [{ data: lotsData }, { data: ateliersData }] = await Promise.all([
      supabase.from('lots_production').select('*').order('created_at', { ascending: false }),
      supabase.from('ateliers').select('*').eq('actif', true).order('nom'),
    ])
    setLots(lotsData || [])
    setAteliers(ateliersData || [])
    setLoading(false)
  }

  const generateRef = () => `LOT-${Date.now().toString().slice(-6)}`

  const createLot = async () => {
    if (!form.nom_produit || !form.quantite_commandee) return
    setSaving(true)
    await supabase.from('lots_production').insert({
      ...form,
      reference: generateRef(),
      cout_total: form.cout_tissu + form.cout_confection,
    })
    setForm({ nom_produit: '', modele: '', couleur: '', taille: '', quantite_commandee: 1, priorite: 'normale', date_debut: '', date_fin_prevue: '', cout_tissu: 0, cout_confection: 0, atelier_id: '', notes: '' })
    setShowForm(false)
    setSuccess('✅ Lot créé !')
    setTimeout(() => setSuccess(''), 2000)
    fetchData()
    setSaving(false)
  }

  const createAtelier = async () => {
    if (!atelierForm.nom) return
    setSaving(true)
    const code = `ATL-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
    await supabase.from('ateliers').insert({ ...atelierForm, code })
    setAtelierForm({ nom: '', responsable: '', telephone: '', specialite: '' })
    setShowAtelierForm(false)
    fetchData()
    setSaving(false)
  }

  const avancerEtape = async (lot: Lot) => {
    const etapes = ETAPES.map(e => e.key)
    const idx = etapes.indexOf(lot.etape)
    if (idx === etapes.length - 1) return
    const nextEtape = etapes[idx + 1]
    await supabase.from('lots_production').update({ etape: nextEtape }).eq('id', lot.id)
    await supabase.from('historique_production').insert({ lot_id: lot.id, etape: nextEtape })
    setSuccess('✅ Étape avancée !')
    setTimeout(() => setSuccess(''), 2000)
    fetchData()
  }

  const stats = {
    total: lots.length,
    enCours: lots.filter(l => l.etape !== 'stock').length,
    termines: lots.filter(l => l.etape === 'stock').length,
    pieces: lots.reduce((s, l) => s + l.quantite_commandee, 0),
    coutTotal: lots.reduce((s, l) => s + (l.cout_total || 0), 0),
  }

  const getAtelierNom = (id: string) => ateliers.find(a => a.id === id)?.nom || null

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: "'Inter', sans-serif", color: '#1a1a1a' }}>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', boxShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>
        <span style={{ color: '#34d399', fontSize: '16px', fontWeight: 700 }}>⚙️ CK Design — Production</span>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={fetchData} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#94a3b8', padding: '7px 14px', fontSize: '12px', cursor: 'pointer' }}>↺ Actualiser</button>
          <button onClick={() => setShowAtelierForm(!showAtelierForm)} style={{ background: '#7c3aed', border: 'none', borderRadius: '6px', color: 'white', padding: '7px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>+ Atelier</button>
          <button onClick={() => setShowForm(!showForm)} style={{ background: '#1D9E75', border: 'none', borderRadius: '6px', color: 'white', padding: '7px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>+ Nouveau lot</button>
        </div>
      </div>

      <div style={{ padding: '16px' }}>

        {/* KPI CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '10px', marginBottom: '16px' }}>
          {[
            { label: 'Total lots', value: stats.total, color: '#1a1a1a', bg: '#fff' },
            { label: 'En production', value: stats.enCours, color: '#BA7517', bg: '#fff8e6' },
            { label: 'En stock', value: stats.termines, color: '#1D9E75', bg: '#f0fdf4' },
            { label: 'Pièces commandées', value: stats.pieces, color: '#378ADD', bg: '#eff6ff' },
            { label: 'Coûts total', value: stats.coutTotal.toLocaleString('fr-FR') + ' F', color: '#1D9E75', bg: '#f0fdf4' },
          ].map((k, i) => (
            <div key={i} style={{ background: k.bg, border: '1px solid #e5e7eb', borderRadius: '12px', padding: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600, letterSpacing: 0.5 }}>{k.label}</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        {success && (
          <div style={{ background: '#f0fdf4', border: '1px solid #1D9E75', borderRadius: '10px', padding: '12px 16px', color: '#1D9E75', fontSize: '13px', marginBottom: '12px', fontWeight: 600 }}>
            {success}
          </div>
        )}

        {/* FORM NOUVEAU LOT */}
        {showForm && (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '22px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: '#1D9E75', fontWeight: 700 }}>Nouveau lot de production</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '12px' }}>
              {[
                { key: 'nom_produit', placeholder: 'Nom produit *' },
                { key: 'modele', placeholder: 'Modèle / Référence' },
                { key: 'couleur', placeholder: 'Couleur' },
                { key: 'taille', placeholder: 'Taille(s)' },
              ].map(f => (
                <input key={f.key} value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={{ padding: '9px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', outline: 'none' }} />
              ))}
              <input type="number" value={form.quantite_commandee} onChange={e => setForm(prev => ({ ...prev, quantite_commandee: Number(e.target.value) }))}
                placeholder="Quantité *"
                style={{ padding: '9px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', outline: 'none' }} />
              <select value={form.priorite} onChange={e => setForm(prev => ({ ...prev, priorite: e.target.value }))}
                style={{ padding: '9px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', outline: 'none' }}>
                <option value="normale">🟡 Normale</option>
                <option value="haute">🟠 Haute</option>
                <option value="urgente">🔴 Urgente</option>
              </select>
              <input type="date" value={form.date_debut} onChange={e => setForm(prev => ({ ...prev, date_debut: e.target.value }))}
                style={{ padding: '9px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', outline: 'none' }} />
              <input type="date" value={form.date_fin_prevue} onChange={e => setForm(prev => ({ ...prev, date_fin_prevue: e.target.value }))}
                style={{ padding: '9px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', outline: 'none' }} />
              <input type="number" value={form.cout_tissu} onChange={e => setForm(prev => ({ ...prev, cout_tissu: Number(e.target.value) }))}
                placeholder="Coût tissu (F)"
                style={{ padding: '9px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', outline: 'none' }} />
              <input type="number" value={form.cout_confection} onChange={e => setForm(prev => ({ ...prev, cout_confection: Number(e.target.value) }))}
                placeholder="Coût confection (F)"
                style={{ padding: '9px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', outline: 'none' }} />
              <select value={form.atelier_id} onChange={e => setForm(prev => ({ ...prev, atelier_id: e.target.value }))}
                style={{ padding: '9px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', outline: 'none' }}>
                <option value="">Assigner un atelier...</option>
                {ateliers.map(a => <option key={a.id} value={a.id}>{a.nom} — {a.responsable}</option>)}
              </select>
            </div>
            <input value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Notes..."
              style={{ width: '100%', padding: '9px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', marginBottom: '14px', boxSizing: 'border-box', outline: 'none' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowForm(false)}
                style={{ padding: '9px 20px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', borderRadius: '9px', color: '#888', cursor: 'pointer', fontWeight: 600 }}>Annuler</button>
              <button onClick={createLot} disabled={saving}
                style={{ padding: '9px 24px', background: '#1D9E75', border: 'none', borderRadius: '9px', color: 'white', cursor: 'pointer', fontWeight: 700, boxShadow: '0 4px 12px rgba(29,158,117,0.3)' }}>
                {saving ? '...' : 'Créer le lot'}
              </button>
            </div>
          </div>
        )}

        {/* FORM ATELIER */}
        {showAtelierForm && (
          <div style={{ background: '#fff', border: '1.5px solid #7c3aed44', borderRadius: '14px', padding: '22px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: '#7c3aed', fontWeight: 700 }}>✂️ Nouvel atelier</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '14px' }}>
              {[
                { key: 'nom', placeholder: 'Nom atelier *' },
                { key: 'responsable', placeholder: 'Responsable' },
                { key: 'telephone', placeholder: 'Téléphone' },
                { key: 'specialite', placeholder: 'Spécialité' },
              ].map(f => (
                <input key={f.key} value={(atelierForm as any)[f.key]} onChange={e => setAtelierForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={{ padding: '9px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', outline: 'none' }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowAtelierForm(false)}
                style={{ padding: '9px 20px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', borderRadius: '9px', color: '#888', cursor: 'pointer', fontWeight: 600 }}>Annuler</button>
              <button onClick={createAtelier} disabled={saving}
                style={{ padding: '9px 24px', background: '#7c3aed', border: 'none', borderRadius: '9px', color: 'white', cursor: 'pointer', fontWeight: 700, boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
                {saving ? '...' : "Créer l'atelier"}
              </button>
            </div>
          </div>
        )}

        {/* KANBAN */}
        {loading ? (
          <div style={{ textAlign: 'center', color: '#aaa', padding: '60px' }}>Chargement...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '10px' }}>
            {ETAPES.map(etape => {
              const lotsEtape = lots.filter(l => l.etape === etape.key)
              return (
                <div key={etape.key} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '12px', minWidth: '180px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: etape.textColor }}>{etape.label}</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: etape.bg, color: etape.textColor }}>{lotsEtape.length}</span>
                  </div>
                  {lotsEtape.length === 0 ? (
                    <div style={{ color: '#ccc', fontSize: '11px', textAlign: 'center', padding: '20px 0' }}>Aucun</div>
                  ) : (
                    lotsEtape.map(lot => (
                      <div key={lot.id} style={{ background: '#f8f9fa', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '10px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '10px', color: '#aaa' }}>{lot.reference}</span>
                          <span style={{ fontSize: '12px' }}>
                            {lot.priorite === 'urgente' ? '🔴' : lot.priorite === 'haute' ? '🟠' : '🟡'}
                          </span>
                        </div>
                        <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '13px', color: '#1a1a1a' }}>{lot.nom_produit}</p>
                        {lot.modele ? <p style={{ margin: '0 0 2px', color: '#888', fontSize: '11px' }}>{lot.modele}</p> : null}
                        {lot.couleur ? <p style={{ margin: '0 0 2px', color: '#888', fontSize: '11px' }}>{lot.couleur}{lot.taille ? ` — ${lot.taille}` : ''}</p> : null}
                        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 0', background: '#fff', borderRadius: '6px', padding: '4px 8px' }}>
                          <span style={{ fontSize: '11px', color: '#888' }}>Qté</span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#1D9E75' }}>{lot.quantite_produite}/{lot.quantite_commandee}</span>
                        </div>
                        {lot.cout_total > 0 ? <p style={{ margin: '0 0 4px', color: '#888', fontSize: '10px' }}>💰 {lot.cout_total.toLocaleString('fr-FR')} F</p> : null}
                        {lot.date_fin_prevue ? <p style={{ margin: '0 0 4px', color: '#888', fontSize: '10px' }}>📅 {new Date(lot.date_fin_prevue).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</p> : null}
                        {getAtelierNom(lot.atelier_id) ? <p style={{ margin: '0 0 8px', color: '#1D9E75', fontSize: '10px', fontWeight: 600 }}>🏭 {getAtelierNom(lot.atelier_id)}</p> : null}
                        {etape.key !== 'stock' ? (
                          <button onClick={() => avancerEtape(lot)}
                            style={{ width: '100%', padding: '6px', borderRadius: '7px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', background: etape.bg, color: etape.textColor, border: `1px solid ${etape.color}44` }}>
                            → Étape suivante
                          </button>
                        ) : (
                          <div style={{ color: '#1D9E75', fontSize: '11px', textAlign: 'center', padding: '4px', fontWeight: 600 }}>✅ En stock</div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ATELIERS */}
        {ateliers.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ color: '#888', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', fontWeight: 600 }}>🏭 Ateliers actifs</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {ateliers.map(atelier => (
                <div key={atelier.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '14px', color: '#1a1a1a' }}>{atelier.nom}</p>
                  <p style={{ margin: '0 0 2px', color: '#666', fontSize: '12px' }}>👤 {atelier.responsable}</p>
                  <p style={{ margin: '0 0 2px', color: '#888', fontSize: '12px' }}>📞 {atelier.telephone}</p>
                  {atelier.specialite && <p style={{ margin: '0 0 8px', color: '#1D9E75', fontSize: '11px', fontWeight: 600 }}>✂️ {atelier.specialite}</p>}
                  <div style={{ background: '#f8f9fa', borderRadius: '7px', padding: '5px 10px', marginBottom: '8px' }}>
                    <span style={{ color: '#aaa', fontSize: '10px' }}>Code: </span>
                    <span style={{ color: '#1D9E75', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700 }}>{atelier.code}</span>
                  </div>
                  <a href={`/atelier/${atelier.code}`} target="_blank"
                    style={{ display: 'block', padding: '7px', background: '#f5f0ff', border: '1px solid #ddd6fe', borderRadius: '8px', color: '#7c3aed', fontSize: '11px', textAlign: 'center', textDecoration: 'none', fontWeight: 700 }}>
                    → Interface atelier
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}