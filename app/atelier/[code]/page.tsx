'use client'

import { useEffect, useState, use } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ETAPES: Record<string, string> = {
  commande_tissu: 'Commande tissu',
  coupe: 'Coupe',
  confection: 'Confection',
  finition: 'Finition',
  controle_qualite: 'Contrôle qualité',
  stock: 'Stock',
}

const ETAPES_ORDER = ['commande_tissu', 'coupe', 'confection', 'finition', 'controle_qualite', 'stock']

type Lot = {
  id: string
  reference: string
  nom_produit: string
  modele: string
  quantite_commandee: number
  quantite_produite: number
  etape_actuelle: string
  statut: string
  date_livraison_prevue: string
  atelier: string
  notes: string
}

export default function AtelierPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const [lots, setLots] = useState<Lot[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [success, setSuccess] = useState('')
  const [qteProduite, setQteProduite] = useState<Record<string, number>>({})

  useEffect(() => { fetchLots() }, [code])

  const fetchLots = async () => {
    const { data } = await supabase
      .from('lots_production')
      .select('*')
      .eq('atelier', decodeURIComponent(code))
      .neq('statut', 'termine')
      .order('created_at', { ascending: false })
    setLots(data || [])
    setLoading(false)
  }

  const avancerEtape = async (lot: Lot) => {
    setUpdating(lot.id)
    const etapeIndex = ETAPES_ORDER.indexOf(lot.etape_actuelle)
    if (etapeIndex >= ETAPES_ORDER.length - 1) { setUpdating(null); return }

    const prochaineEtape = ETAPES_ORDER[etapeIndex + 1]
    const qte = qteProduite[lot.id] || lot.quantite_commandee

    await supabase.from('lots_production').update({
      etape_actuelle: prochaineEtape,
      quantite_produite: qte,
      statut: prochaineEtape === 'stock' ? 'termine' : 'en_cours',
    }).eq('id', lot.id)

    await supabase.from('etapes_production')
      .update({ statut: 'termine', date_fin: new Date().toISOString(), quantite: qte })
      .eq('lot_id', lot.id).eq('etape', lot.etape_actuelle)

    await supabase.from('etapes_production')
      .update({ statut: 'en_cours', date_debut: new Date().toISOString() })
      .eq('lot_id', lot.id).eq('etape', prochaineEtape)

    setSuccess('✅ Étape validée !')
    setTimeout(() => setSuccess(''), 2000)
    fetchLots()
    setUpdating(null)
  }

  const getProgress = (etape: string) => {
    const index = ETAPES_ORDER.indexOf(etape)
    return Math.round((index / (ETAPES_ORDER.length - 1)) * 100)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a' }}>
      <p style={{ color: '#666' }}>Chargement...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: 'sans-serif', color: 'white' }}>

      <div style={{ background: '#111', borderBottom: '0.5px solid #222', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: '#1D9E75', margin: 0, fontSize: '16px', fontWeight: 700 }}>✂️ Atelier — {decodeURIComponent(code)}</h1>
          <p style={{ color: '#555', margin: '2px 0 0', fontSize: '11px' }}>{lots.length} lot(s) en cours</p>
        </div>
        <button onClick={fetchLots} style={{ background: 'none', border: '0.5px solid #1D9E75', borderRadius: '6px', color: '#1D9E75', padding: '5px 10px', fontSize: '11px', cursor: 'pointer' }}>
          ↺ Actualiser
        </button>
      </div>

      <div style={{ padding: '16px' }}>
        {success && (
          <div style={{ background: '#0a2a1a', border: '1px solid #1D9E75', borderRadius: '8px', padding: '10px 16px', color: '#1D9E75', fontSize: '13px', marginBottom: '12px' }}>
            {success}
          </div>
        )}

        {lots.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#555' }}>
            <div style={{ fontSize: '3rem' }}>✅</div>
            <p>Aucun lot en cours pour cet atelier</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {lots.map(lot => {
              const progress = getProgress(lot.etape_actuelle)
              const etapeIndex = ETAPES_ORDER.indexOf(lot.etape_actuelle)
              const isLast = etapeIndex >= ETAPES_ORDER.length - 1

              return (
                <div key={lot.id} style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', color: '#555' }}>{lot.reference}</span>
                        <span style={{ background: '#1a2e25', border: '1px solid #1D9E75', color: '#1D9E75', fontSize: '10px', padding: '2px 8px', borderRadius: '20px' }}>
                          {ETAPES[lot.etape_actuelle]}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '15px' }}>{lot.nom_produit}</p>
                      {lot.modele && <p style={{ margin: '2px 0 0', color: '#888', fontSize: '12px' }}>{lot.modele}</p>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, color: '#1D9E75', fontWeight: 700, fontSize: '16px' }}>{lot.quantite_commandee} pcs</p>
                      {lot.date_livraison_prevue && (
                        <p style={{ margin: '2px 0 0', color: '#666', fontSize: '11px' }}>
                          📅 {new Date(lot.date_livraison_prevue).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Barre de progression */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', color: '#666' }}>Progression</span>
                      <span style={{ fontSize: '10px', color: '#1D9E75' }}>{progress}%</span>
                    </div>
                    <div style={{ background: '#222', borderRadius: '4px', height: '6px' }}>
                      <div style={{ background: '#1D9E75', borderRadius: '4px', height: '6px', width: `${progress}%`, transition: 'width 0.3s' }} />
                    </div>
                  </div>

                  {/* Étapes visuelles */}
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', overflowX: 'auto' }}>
                    {ETAPES_ORDER.map((etape, i) => (
                      <div key={etape} style={{ flex: 1, minWidth: '60px', textAlign: 'center' }}>
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '50%', margin: '0 auto 4px',
                          background: i < etapeIndex ? '#1D9E75' : i === etapeIndex ? '#BA7517' : '#222',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px'
                        }}>
                          {i < etapeIndex ? '✓' : i === etapeIndex ? '⚡' : '○'}
                        </div>
                        <p style={{ margin: 0, fontSize: '9px', color: i <= etapeIndex ? '#888' : '#444', lineHeight: 1.2 }}>
                          {ETAPES[etape].split(' ')[0]}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Quantité produite */}
                  {!isLast && (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '4px' }}>Qté produite à cette étape</label>
                        <input
                          type="number"
                          value={qteProduite[lot.id] || lot.quantite_commandee}
                          onChange={e => setQteProduite(prev => ({ ...prev, [lot.id]: Number(e.target.value) }))}
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', background: '#1a1a1a', border: '1px solid #333', color: 'white', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                      </div>
                      <button
                        onClick={() => avancerEtape(lot)}
                        disabled={updating === lot.id}
                        style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(29,158,117,0.1)', color: '#1D9E75', border: '0.5px solid rgba(29,158,117,0.3)', cursor: 'pointer', fontWeight: 600, fontSize: '12px', marginTop: '16px' }}
                      >
                        {updating === lot.id ? '...' : '→ Valider étape'}
                      </button>
                    </div>
                  )}

                  {lot.notes && (
                    <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#666', fontStyle: 'italic' }}>📝 {lot.notes}</p>
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