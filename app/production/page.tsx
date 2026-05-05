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
  quantite_commandee: number
  quantite_produite: number
  etape_actuelle: string
  statut: string
  cout_tissu: number
  cout_confection: number
  cout_total: number
  date_debut: string
  date_livraison_prevue: string
  atelier: string
  notes: string
  created_at: string
}

const ETAPES = [
  { key: 'commande_tissu', label: 'Commande tissu', color: '#378ADD', bg: 'rgba(55,138,221,0.12)', textColor: '#185FA5' },
  { key: 'coupe', label: 'Coupe', color: '#BA7517', bg: 'rgba(239,159,39,0.12)', textColor: '#854F0B' },
  { key: 'confection', label: 'Confection', color: '#7c3aed', bg: 'rgba(124,58,237,0.12)', textColor: '#5b21b6' },
  { key: 'finition', label: 'Finition', color: '#E24B4A', bg: 'rgba(226,75,74,0.12)', textColor: '#A32D2D' },
  { key: 'controle_qualite', label: 'Contrôle qualité', color: '#BA7517', bg: 'rgba(239,159,39,0.12)', textColor: '#854F0B' },
  { key: 'stock', label: 'Stock', color: '#0F6E56', bg: 'rgba(29,158,117,0.12)', textColor: '#085041' },
]

export default function ProductionPage() {
  const [lots, setLots] = useState<Lot[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [selectedLot, setSelectedLot] = useState<Lot | null>(null)
  const [form, setForm] = useState({
    nom_produit: '',
    modele: '',
    quantite_commandee: 10,
    cout_tissu: 0,
    cout_confection: 0,
    date_livraison_prevue: '',
    atelier: '',
    notes: '',
  })

  useEffect(() => { fetchLots() }, [])

  const fetchLots = async () => {
    const { data } = await supabase
      .from('lots_production')
      .select('*')
      .order('created_at', { ascending: false })
    setLots(data || [])
    setLoading(false)
  }

  const generateRef = () => `LOT-${Date.now().toString().slice(-6)}`

  const createLot = async () => {
    if (!form.nom_produit) return
    setSaving(true)
    const { data: lot } = await supabase.from('lots_production').insert({
      ...form,
      reference: generateRef(),
      cout_total: form.cout_tissu + form.cout_confection,
    }).select().single()

    if (lot) {
      for (const etape of ETAPES) {
        await supabase.from('etapes_production').insert({
          lot_id: lot.id,
          etape: etape.key,
          statut: etape.key === 'commande_tissu' ? 'en_cours' : 'en_attente',
        })
      }
    }

    setForm({ nom_produit: '', modele: '', quantite_commandee: 10, cout_tissu: 0, cout_confection: 0, date_livraison_prevue: '', atelier: '', notes: '' })
    setShowForm(false)
    setSuccess('✅ Lot créé !')
    setTimeout(() => setSuccess(''), 2000)
    fetchLots()
    setSaving(false)
  }

  const avancerEtape = async (lot: Lot) => {
    const etapeIndex = ETAPES.findIndex(e => e.key === lot.etape_actuelle)
    if (etapeIndex >= ETAPES.length - 1) return

    const prochaineEtape = ETAPES[etapeIndex + 1].key
    const isStock = prochaineEtape === 'stock'

    await supabase.from('lots_production').update({
      etape_actuelle: prochaineEtape,
      statut: isStock ? 'termine' : 'en_cours',
    }).eq('id', lot.id)

    await supabase.from('etapes_production')
      .update({ statut: 'termine', date_fin: new Date().toISOString() })
      .eq('lot_id', lot.id).eq('etape', lot.etape_actuelle)

    await supabase.from('etapes_production')
      .update({ statut: 'en_cours', date_debut: new Date().toISOString() })
      .eq('lot_id', lot.id).eq('etape', prochaineEtape)

    setSuccess('✅ Étape avancée !')
    setTimeout(() => setSuccess(''), 2000)
    fetchLots()
    if (selectedLot?.id === lot.id) {
      setSelectedLot({ ...lot, etape_actuelle: prochaineEtape })
    }
  }

  const stats = {
    total: lots.length,
    en_cours: lots.filter(l => l.statut === 'en_cours').length,
    termine: lots.filter(l => l.statut === 'termine').length,
    pieces_total: lots.reduce((s, l) => s + l.quantite_commandee, 0),
    cout_total: lots.reduce((s, l) => s + (l.cout_total || 0), 0),
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: 'sans-serif', color: 'white' }}>

      {/* TOPBAR */}
      <div style={{ background: '#111', borderBottom: '0.5px solid #222', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#1D9E75', fontSize: '16px', fontWeight: 500 }}>⚙️ CK Design — Production</span>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={fetchLots} style={{ background: 'none', border: '0.5px solid #333', borderRadius: '6px', color: '#666', padding: '5px 10px', fontSize: '11px', cursor: 'pointer' }}>
            ↺ Actualiser
          </button>
          <button onClick={() => setShowForm(!showForm)} style={{ background: '#1D9E75', border: 'none', borderRadius: '6px', color: 'white', padding: '7px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
            + Nouveau lot
          </button>
        </div>
      </div>

      <div style={{ padding: '16px' }}>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '10px', marginBottom: '16px' }}>
          {[
            { label: 'Total lots', value: stats.total, color: 'white' },
            { label: 'En cours', value: stats.en_cours, color: '#BA7517' },
            { label: 'Terminés', value: stats.termine, color: '#1D9E75' },
            { label: 'Pièces commandées', value: stats.pieces_total, color: '#378ADD' },
            { label: 'Coûts total', value: stats.cout_total.toLocaleString('fr-FR') + ' F', color: '#1D9E75' },
          ].map((k, i) => (
            <div key={i} style={{ background: '#111', border: '1px solid #222', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', marginBottom: '4px' }}>{k.label}</div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        {success && (
          <div style={{ background: '#0a2a1a', border: '1px solid #1D9E75', borderRadius: '8px', padding: '10px 16px', color: '#1D9E75', fontSize: '13px', marginBottom: '12px' }}>
            {success}
          </div>
        )}

        {/* Formulaire nouveau lot */}
        {showForm && (
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px' }}>🆕 Nouveau lot de production</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <input value={form.nom_produit} onChange={e => setForm(p => ({ ...p, nom_produit: e.target.value }))}
                placeholder="Nom produit *" style={{ padding: '10px', borderRadius: '8px', background: '#1a1a1a', border: '1px solid #333', color: 'white', fontSize: '13px' }} />
              <input value={form.modele} onChange={e => setForm(p => ({ ...p, modele: e.target.value }))}
                placeholder="Modèle / Référence" style={{ padding: '10px', borderRadius: '8px', background: '#1a1a1a', border: '1px solid #333', color: 'white', fontSize: '13px' }} />
              <input type="number" value={form.quantite_commandee} onChange={e => setForm(p => ({ ...p, quantite_commandee: Number(e.target.value) }))}
                placeholder="Quantité" style={{ padding: '10px', borderRadius: '8px', background: '#1a1a1a', border: '1px solid #333', color: 'white', fontSize: '13px' }} />
              <input type="number" value={form.cout_tissu} onChange={e => setForm(p => ({ ...p, cout_tissu: Number(e.target.value) }))}
                placeholder="Coût tissu (F)" style={{ padding: '10px', borderRadius: '8px', background: '#1a1a1a', border: '1px solid #333', color: 'white', fontSize: '13px' }} />
              <input type="number" value={form.cout_confection} onChange={e => setForm(p => ({ ...p, cout_confection: Number(e.target.value) }))}
                placeholder="Coût confection (F)" style={{ padding: '10px', borderRadius: '8px', background: '#1a1a1a', border: '1px solid #333', color: 'white', fontSize: '13px' }} />
              <input value={form.atelier} onChange={e => setForm(p => ({ ...p, atelier: e.target.value }))}
                placeholder="Atelier / Couturière" style={{ padding: '10px', borderRadius: '8px', background: '#1a1a1a', border: '1px solid #333', color: 'white', fontSize: '13px' }} />
              <input type="date" value={form.date_livraison_prevue} onChange={e => setForm(p => ({ ...p, date_livraison_prevue: e.target.value }))}
                style={{ padding: '10px', borderRadius: '8px', background: '#1a1a1a', border: '1px solid #333', color: 'white', fontSize: '13px' }} />
              <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Notes" style={{ padding: '10px', borderRadius: '8px', background: '#1a1a1a', border: '1px solid #333', color: 'white', fontSize: '13px' }} />
            </div>
            <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowForm(false)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid #333', color: '#888', borderRadius: '8px', cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={createLot} disabled={saving} style={{ padding: '10px 24px', background: '#1D9E75', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                {saving ? '...' : '✅ Créer le lot'}
              </button>
            </div>
          </div>
        )}

        {/* KANBAN PRODUCTION */}
        {loading ? (
          <div style={{ textAlign: 'center', color: '#555', padding: '60px' }}>Chargement...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '10px' }}>
            {ETAPES.map(etape => {
              const lotsEtape = lots.filter(l => l.etape_actuelle === etape.key)
              return (
                <div key={etape.key} style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: etape.color }}>
                      {etape.label}
                    </span>
                    <span style={{ fontSize: '10px', fontWeight: 500, padding: '1px 7px', borderRadius: '8px', background: etape.bg, color: etape.textColor }}>
                      {lotsEtape.length}
                    </span>
                  </div>

                  {lotsEtape.length === 0 ? (
                    <div style={{ color: '#444', fontSize: '11px', textAlign: 'center', padding: '16px 0' }}>Aucun</div>
                  ) : (
                    lotsEtape.map(lot => (
                      <div key={lot.id} style={{ background: '#1a1a1a', border: '0.5px solid #2a2a2a', borderRadius: '10px', padding: '10px', marginBottom: '8px', cursor: 'pointer' }}
                        onClick={() => setSelectedLot(selectedLot?.id === lot.id ? null : lot)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '10px', color: '#555' }}>{lot.reference}</span>
                          <span style={{ fontSize: '11px', color: '#1D9E75', fontWeight: 600 }}>{lot.quantite_commandee} pcs</span>
                        </div>
                        <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 600 }}>{lot.nom_produit}</p>
                        {lot.modele && <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#888' }}>{lot.modele}</p>}
                        {lot.atelier && <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#666' }}>✂️ {lot.atelier}</p>}
                        {lot.date_livraison_prevue && (
                          <p style={{ margin: '0 0 6px', fontSize: '10px', color: '#555' }}>
                            📅 {new Date(lot.date_livraison_prevue).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                        <div style={{ background: '#0a1a12', borderRadius: '6px', padding: '6px 8px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '10px', color: '#666' }}>Coût total</span>
                          <span style={{ fontSize: '11px', color: '#1D9E75', fontWeight: 600 }}>{(lot.cout_total || 0).toLocaleString('fr-FR')} F</span>
                        </div>

                        {etape.key !== 'stock' && (
                          <button
                            onClick={e => { e.stopPropagation(); avancerEtape(lot) }}
                            style={{ width: '100%', padding: '6px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, cursor: 'pointer', background: etape.bg, color: etape.color, border: `0.5px solid ${etape.color}44` }}
                          >
                            → Étape suivante
                          </button>
                        )}

                        {etape.key === 'stock' && (
                          <div style={{ color: '#1D9E75', fontSize: '10px', textAlign: 'center', padding: '4px' }}>
                            ✅ En stock
                          </div>
                        )}

                        {/* Détail lot */}
                        {selectedLot?.id === lot.id && (
                          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #2a2a2a' }} onClick={e => e.stopPropagation()}>
                            <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#888' }}>
                              📅 Début : {new Date(lot.date_debut).toLocaleDateString('fr-FR')}
                            </p>
                            <p style={{ margin: '0 0 2px', fontSize: '11px', color: '#888' }}>
                              🧵 Tissu : {(lot.cout_tissu || 0).toLocaleString('fr-FR')} F
                            </p>
                            <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#888' }}>
                              ✂️ Confection : {(lot.cout_confection || 0).toLocaleString('fr-FR')} F
                            </p>
                            {lot.notes && <p style={{ margin: 0, fontSize: '11px', color: '#666', fontStyle: 'italic' }}>📝 {lot.notes}</p>}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}