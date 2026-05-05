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
    <div style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: 'sans-serif', color: 'white' }}>

      <div style={{ background: '#111', borderBottom: '0.5px solid #222', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <span style={{ color: '#1D9E75', fontSize: '16px', fontWeight: 500 }}>⚙️ CK Design — Production</span>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={fetchData} style={{ background: 'none', border: '0.5px solid #333', borderRadius: '6px', color: '#666', padding: '7px 14px', fontSize: '12px', cursor: 'pointer' }}>↺ Actualiser</button>
          <button onClick={() => setShowAtelierForm(!showAtelierForm)} style={{ background: '#7c3aed', border: 'none', borderRadius: '6px', color: 'white', padding: '7px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>+ Atelier</button>
          <button onClick={() => setShowForm(!showForm)} style={{ background: '#1D9E75', border: 'none', borderRadius: '6px', color: 'white', padding: '7px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>+ Nouveau lot</button>
        </div>
      </div>

      <div style={{ padding: '16px' }}>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '10px', marginBottom: '16px' }}>
          {[
            { label: 'Total lots', value: stats.total, color: 'white' },
            { label: 'En production', value: stats.enCours, color: '#BA7517' },
            { label: 'En stock', value: stats.termines, color: '#1D9E75' },
            { label: 'Pièces commandées', value: stats.pieces, color: '#378ADD' },
            { label: 'Coûts total', value: stats.coutTotal.toLocaleString('fr-FR') + ' F', color: '#1D9E75' },
          ].map((k, i) => (
            <div key={i} style={{ background: '#111', border: '1px solid #222', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', marginBottom: '4px' }}>{k.label}</div>
              <div style={{ fontSize: '20px', fontWeight: 500, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        {success && (
          <div style={{ background: '#0a2a1a', border: '1px solid #1D9E75', borderRadius: '8px', padding: '10px 16px', color: '#1D9E75', fontSize: '13px', marginBottom: '12px' }}>
            {success}
          </div>
        )}

        {showForm && (
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: '#1D9E75' }}>Nouveau lot de production</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '12px' }}>
              {[
                { key: 'nom_produit', placeholder: 'Nom produit *' },
                { key: 'modele', placeholder: 'Modèle / Référence' },
                { key: 'couleur', placeholder: 'Couleur' },
                { key: 'taille', placeholder: 'Taille(s)' },
              ].map(f => (
                <input key={f.key} value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder} style={{ padding: '8px 12px', borderRadius: '8px', background: '#1a1a1a', border: '1px solid #333', color: 'white', fontSize: '13px' }} />
              ))}
              <input type="number" value={form.quantite_commandee} onChange={e => setForm(prev => ({ ...prev, quantite_commandee: Number(e.target.value) }))}
                placeholder="Quantité *" style={{ padding: '8px 12px', borderRadius: '8px', background: '#1a1a1a', border: '1px solid #333', color: 'white', fontSize: '13px' }} />
              <select value={form.priorite} onChange={e => setForm(prev => ({ ...prev, priorite: e.target.value }))}
                style={{ padding: '8px 12px', borderRadius: '8px', background: '#1a1a1a', border: '1px solid #333', color: 'white', fontSize: '13px' }}>
                <option value="normale">🟡 Normale</option>
                <option value="haute">🟠 Haute</option>
                <option value="urgente">🔴 Urgente</option>
              </select>
              <input type="date" value={form.date_debut} onChange={e => setForm(prev => ({ ...prev, date_debut: e.target.value }))}
                style={{ padding: '8px 12px', borderRadius: '8px', background: '#1a1a1a', border: '1px solid #333', color: 'white', fontSize: '13px' }} />
              <input type="date" value={form.date_fin_prevue} onChange={e => setForm(prev => ({ ...prev, date_fin_prevue: e.target.value }))}
                style={{ padding: '8px 12px', borderRadius: '8px', background: '#1a1a1a', border: '1px solid #333', color: 'white', fontSize: '13px' }} />
              <input type="number" value={form.cout_tissu} onChange={e => setForm(prev => ({ ...prev, cout_tissu: Number(e.target.value) }))}
                placeholder="Coût tissu (F)" style={{ padding: '8px 12px', borderRadius: '8px', background: '#1a1a1a', border: '1px solid #333', color: 'white', fontSize: '13px' }} />
              <input type="number" value={form.cout_confection} onChange={e => setForm(prev => ({ ...prev, cout_confection: Number(e.target.value) }))}
                placeholder="Coût confection (F)" style={{ padding: '8px 12px', borderRadius: '8px', background: '#1a1a1a', border: '1px solid #333', color: 'white', fontSize: '13px' }} />
              <select value={form.atelier_id} onChange={e => setForm(prev => ({ ...prev, atelier_id: e.target.value }))}
                style={{ padding: '8px 12px', borderRadius: '8px', background: '#1a1a1a', border: '1px solid #333', color: 'white', fontSize: '13px' }}>
                <option value="">Assigner un atelier...</option>
                {ateliers.map(a => <option key={a.id} value={a.id}>{a.nom} — {a.responsable}</option>)}
              </select>
            </div>
            <input value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Notes..." style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: '#1a1a1a', border: '1px solid #333', color: 'white', fontSize: '13px', marginBottom: '12px', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowForm(false)} style={{ padding: '8px 20px', background: 'transparent', border: '1px solid #333', borderRadius: '8px', color: '#888', cursor: 'pointer' }}>Annuler</button>
              <button onClick={createLot} disabled={saving} style={{ padding: '8px 24px', background: '#1D9E75', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                {saving ? '...' : 'Créer le lot'}
              </button>
            </div>
          </div>
        )}

        {showAtelierForm && (
          <div style={{ background: '#111', border: '1px solid #7c3aed', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: '#7c3aed' }}>✂️ Nouvel atelier</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '12px' }}>
              {[
                { key: 'nom', placeholder: 'Nom atelier *' },
                { key: 'responsable', placeholder: 'Responsable' },
                { key: 'telephone', placeholder: 'Téléphone' },
                { key: 'specialite', placeholder: 'Spécialité' },
              ].map(f => (
                <input key={f.key} value={(atelierForm as any)[f.key]} onChange={e => setAtelierForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder} style={{ padding: '8px 12px', borderRadius: '8px', background: '#1a1a1a', border: '1px solid #333', color: 'white', fontSize: '13px' }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowAtelierForm(false)} style={{ padding: '8px 20px', background: 'transparent', border: '1px solid #333', borderRadius: '8px', color: '#888', cursor: 'pointer' }}>Annuler</button>
              <button onClick={createAtelier} disabled={saving} style={{ padding: '8px 24px', background: '#7c3aed', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                {saving ? '...' : "Créer l'atelier"}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', color: '#555', padding: '60px' }}>Chargement...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '10px' }}>
            {ETAPES.map(etape => {
              const lotsEtape = lots.filter(l => l.etape === etape.key)
              return (
                <div key={etape.key} style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '12px', minWidth: '180px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: etape.color }}>{etape.label}</span>
                    <span style={{ fontSize: '10px', fontWeight: 500, padding: '1px 7px', borderRadius: '8px', background: etape.bg, color: etape.textColor }}>{lotsEtape.length}</span>
                  </div>
                  {lotsEtape.length === 0 ? (
                    <div style={{ color: '#444', fontSize: '11px', textAlign: 'center', padding: '20px 0' }}>Aucun</div>
                  ) : (
                    lotsEtape.map(lot => (
                      <div key={lot.id} style={{ background: '#1a1a1a', border: '0.5px solid #2a2a2a', borderRadius: '10px', padding: '10px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '10px', color: '#555' }}>{lot.reference}</span>
                          <span style={{ fontSize: '10px', color: PRIORITES[lot.priorite]?.color || '#888' }}>
                            {lot.priorite === 'urgente' ? '🔴' : lot.priorite === 'haute' ? '🟠' : '🟡'}
                          </span>
                        </div>
                        <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: '13px' }}>{lot.nom_produit}</p>
                        {lot.modele ? <p style={{ margin: '0 0 2px', color: '#888', fontSize: '11px' }}>{lot.modele}</p> : null}
                        {lot.couleur ? <p style={{ margin: '0 0 2px', color: '#888', fontSize: '11px' }}>{lot.couleur}{lot.taille ? ` — ${lot.taille}` : ''}</p> : null}
                        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 0' }}>
                          <span style={{ fontSize: '11px', color: '#666' }}>Qté</span>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#1D9E75' }}>{lot.quantite_produite}/{lot.quantite_commandee}</span>
                        </div>
                        {lot.cout_total > 0 ? <p style={{ margin: '0 0 4px', color: '#555', fontSize: '10px' }}>💰 {lot.cout_total.toLocaleString('fr-FR')} F</p> : null}
                        {lot.date_fin_prevue ? <p style={{ margin: '0 0 4px', color: '#555', fontSize: '10px' }}>📅 {new Date(lot.date_fin_prevue).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</p> : null}
                        {getAtelierNom(lot.atelier_id) ? <p style={{ margin: '0 0 8px', color: '#1D9E75', fontSize: '10px' }}>🏭 {getAtelierNom(lot.atelier_id)}</p> : null}
                        {etape.key !== 'stock' ? (
                          <button onClick={() => avancerEtape(lot)}
                            style={{ width: '100%', padding: '5px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, cursor: 'pointer', background: etape.bg, color: etape.color, border: `0.5px solid ${etape.color}44` }}>
                            → Étape suivante
                          </button>
                        ) : (
                          <div style={{ color: '#1D9E75', fontSize: '10px', textAlign: 'center', padding: '4px' }}>✅ En stock</div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )
            })}
          </div>
        )}

        {ateliers.length > 0 ? (
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ color: '#888', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>🏭 Ateliers actifs</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
              {ateliers.map(atelier => (
                <div key={atelier.id} style={{ background: '#111', border: '1px solid #222', borderRadius: '10px', padding: '12px' }}>
                  <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: '14px' }}>{atelier.nom}</p>
                  <p style={{ margin: '0 0 2px', color: '#888', fontSize: '12px' }}>👤 {atelier.responsable}</p>
                  <p style={{ margin: '0 0 2px', color: '#666', fontSize: '12px' }}>📞 {atelier.telephone}</p>
                  {atelier.specialite ? <p style={{ margin: 0, color: '#1D9E75', fontSize: '11px' }}>✂️ {atelier.specialite}</p> : null}
                  <div style={{ marginTop: '8px', background: '#1a1a1a', borderRadius: '6px', padding: '4px 8px' }}>
                    <span style={{ color: '#555', fontSize: '10px' }}>Code: </span>
                    <span style={{ color: '#1D9E75', fontSize: '11px', fontFamily: 'monospace' }}>{atelier.code}</span>
                  </div>
                  <a href={`/atelier/${atelier.code}`} target="_blank"
                    style={{ display: 'block', marginTop: '8px', padding: '6px', background: 'rgba(124,58,237,0.1)', border: '0.5px solid rgba(124,58,237,0.3)', borderRadius: '6px', color: '#7c3aed', fontSize: '11px', textAlign: 'center', textDecoration: 'none', fontWeight: 600 }}>
                    → Interface atelier
                  </a>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}