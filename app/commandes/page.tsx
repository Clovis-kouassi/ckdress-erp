'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'

type Commande = {
  id: string
  telephone: string
  adresse: string
  produit_ref: string
  taille: string
  variantes: string
  montant_total: number
  frais_livraison: number
  statut: string
  source: string
  nom_client: string
  note: string
  created_at: string
  livreur_id?: string
}

type Livreur = {
  id: string
  nom: string
  code: string
}

const STATUTS: Record<string, { label: string; color: string; bg: string; textColor: string }> = {
  nouveau: { label: 'Nouvelles', color: '#E24B4A', bg: 'rgba(226,75,74,0.12)', textColor: '#A32D2D' },
  en_preparation: { label: 'Validées', color: '#185FA5', bg: 'rgba(55,138,221,0.12)', textColor: '#185FA5' },
  en_livraison: { label: 'En livraison', color: '#BA7517', bg: 'rgba(239,159,39,0.12)', textColor: '#854F0B' },
  livre: { label: 'Livrées', color: '#0F6E56', bg: 'rgba(29,158,117,0.12)', textColor: '#085041' },
}

export default function CommandesPage() {
  const router = useRouter()
  const [commandes, setCommandes] = useState<Commande[]>([])
  const [livreurs, setLivreurs] = useState<Livreur[]>([])
  const [loading, setLoading] = useState(true)
  const [livreurChoisi, setLivreurChoisi] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const { data: cmds } = await supabase
      .from('commandes_catalogue')
      .select('*')
      .neq('statut', 'annule')
      .order('created_at', { ascending: false })

    const { data: livs } = await supabase
      .from('livreurs')
      .select('*')
      .eq('actif', true)
      .order('nom')

    setCommandes(cmds || [])
    setLivreurs(livs || [])
    setLoading(false)
  }

  async function changerStatut(id: string, statut: string, livreurId?: string) {
    const update: any = { statut }
    if (livreurId) update.livreur_id = livreurId
    await supabase.from('commandes_catalogue').update(update).eq('id', id)
    setSuccess('✅ Mis à jour !')
    fetchData()
    setTimeout(() => setSuccess(''), 2000)
  }

  const getLivreurNom = (id: string | null | undefined) => {
    if (!id) return null
    return livreurs.find(l => l.id === id)?.nom || null
  }

  const stats = {
    total: commandes.length,
    nouveau: commandes.filter(c => c.statut === 'nouveau').length,
    en_livraison: commandes.filter(c => c.statut === 'en_livraison').length,
    livre: commandes.filter(c => c.statut === 'livre').length,
    ca: commandes.filter(c => c.statut === 'livre').reduce((s, c) => s + (c.montant_total || 0), 0),
  }

  const colonnes = [
    { key: 'nouveau', label: 'Nouvelles', color: '#E24B4A', bg: 'rgba(226,75,74,0.12)', textColor: '#A32D2D' },
    { key: 'en_preparation', label: 'Validées', color: '#185FA5', bg: 'rgba(55,138,221,0.12)', textColor: '#185FA5' },
    { key: 'en_livraison', label: 'En livraison', color: '#BA7517', bg: 'rgba(239,159,39,0.12)', textColor: '#854F0B' },
    { key: 'livre', label: 'Livrées', color: '#0F6E56', bg: 'rgba(29,158,117,0.12)', textColor: '#085041' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: 'sans-serif', color: 'white' }}>

      {/* TOPBAR */}
      <div style={{ background: '#111', borderBottom: '0.5px solid #222', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#1D9E75', fontSize: '16px', fontWeight: 500 }}>CK Dress ERP</span>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          {[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Commandes', path: '/commandes' },
            { label: 'Livraisons', path: '/livraisons' },
            { label: 'Stock', path: '/stock' },
          ].map(nav => (
            <a key={nav.path} href={nav.path} style={{ color: nav.path === '/commandes' ? '#1D9E75' : '#666', fontSize: '12px', textDecoration: 'none', fontWeight: nav.path === '/commandes' ? 500 : 400 }}>
              {nav.label}
            </a>
          ))}
          <button onClick={fetchData} style={{ background: 'none', border: '0.5px solid #1D9E75', borderRadius: '6px', color: '#1D9E75', padding: '5px 10px', fontSize: '11px', cursor: 'pointer' }}>
            ↺ Actualiser
          </button>
        </div>
      </div>

      <div style={{ padding: '16px' }}>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '10px', marginBottom: '16px' }}>
          {[
            { label: 'Total commandes', value: stats.total, color: 'white' },
            { label: 'Nouvelles', value: stats.nouveau, color: '#E24B4A' },
            { label: 'En livraison', value: stats.en_livraison, color: '#BA7517' },
            { label: 'Livrées', value: stats.livre, color: '#1D9E75' },
            { label: 'CA livré', value: stats.ca.toLocaleString('fr-FR') + ' F', color: '#1D9E75' },
          ].map((k, i) => (
            <div key={i} style={{ background: '#111', border: '1px solid #222', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{k.label}</div>
              <div style={{ fontSize: '20px', fontWeight: 500, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        {success && (
          <div style={{ background: '#0a2a1a', border: '1px solid #1D9E75', borderRadius: '8px', padding: '10px 16px', color: '#1D9E75', fontSize: '13px', marginBottom: '12px' }}>
            {success}
          </div>
        )}

        {/* KANBAN */}
        {loading ? (
          <div style={{ textAlign: 'center', color: '#555', padding: '60px' }}>Chargement...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
            {colonnes.map(col => {
              const cmdCol = commandes.filter(c => c.statut === col.key)
              return (
                <div key={col.key} style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '12px' }}>

                  {/* Header colonne */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: col.color }}>
                      {col.label}
                    </span>
                    <span style={{ fontSize: '10px', fontWeight: 500, padding: '1px 7px', borderRadius: '8px', background: col.bg, color: col.textColor }}>
                      {cmdCol.length}
                    </span>
                  </div>

                  {/* Cartes */}
                  {cmdCol.length === 0 ? (
                    <div style={{ color: '#444', fontSize: '11px', textAlign: 'center', padding: '20px 0' }}>Aucune</div>
                  ) : (
                    cmdCol.map(cmd => (
                      <div key={cmd.id} style={{ background: '#1a1a1a', border: '0.5px solid #2a2a2a', borderRadius: '10px', padding: '10px', marginBottom: '8px' }}>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '10px', color: '#555' }}>#{cmd.id.slice(0, 6).toUpperCase()}</span>
                          <span style={{ fontSize: '12px', fontWeight: 500, color: '#1D9E75' }}>
                            {cmd.montant_total?.toLocaleString('fr-FR')} F
                          </span>
                        </div>

                        <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '2px' }}>{cmd.nom_client || '—'}</div>
                        <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>📞 {cmd.telephone}</div>
                        <div style={{ fontSize: '11px', color: '#555', marginBottom: '4px' }}>📍 {cmd.adresse}</div>
                        <div style={{ fontSize: '11px', color: '#555', marginBottom: '8px' }}>
                          🛍️ {cmd.produit_ref} — Taille {cmd.taille}
                        </div>

                        {/* Bouton voir détail */}
                        <button
                          onClick={() => router.push(`/commandes/${cmd.id}`)}
                          style={{ width: '100%', padding: '5px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, cursor: 'pointer', background: 'transparent', color: '#666', border: '0.5px solid #333', marginBottom: '6px' }}
                        >
                          Voir détail →
                        </button>

                        {/* Actions selon colonne */}
                        {col.key === 'nouveau' && (
                          <button
                            onClick={() => changerStatut(cmd.id, 'en_preparation')}
                            style={{ width: '100%', padding: '6px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, cursor: 'pointer', background: 'rgba(55,138,221,0.1)', color: '#378ADD', border: '0.5px solid rgba(55,138,221,0.3)' }}
                          >
                            ✓ Valider
                          </button>
                        )}

                        {col.key === 'en_preparation' && (
                          <>
                            <select
                              value={livreurChoisi[cmd.id] || ''}
                              onChange={e => setLivreurChoisi(prev => ({ ...prev, [cmd.id]: e.target.value }))}
                              style={{ width: '100%', padding: '5px', borderRadius: '6px', border: '0.5px solid #333', background: '#111', color: '#888', fontSize: '11px', marginBottom: '6px' }}
                            >
                              <option value="">Assigner un livreur...</option>
                              {livreurs.map(l => (
                                <option key={l.id} value={l.id}>{l.nom} ({l.code})</option>
                              ))}
                            </select>
                            <button
                              onClick={() => changerStatut(cmd.id, 'en_livraison', livreurChoisi[cmd.id])}
                              style={{ width: '100%', padding: '6px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, cursor: 'pointer', background: 'rgba(239,159,39,0.1)', color: '#BA7517', border: '0.5px solid rgba(239,159,39,0.3)' }}
                            >
                              🚚 Envoyer en livraison
                            </button>
                          </>
                        )}

                        {col.key === 'en_livraison' && (
                          <>
                            {getLivreurNom(cmd.livreur_id) && (
                              <div style={{ fontSize: '11px', color: '#1D9E75', marginBottom: '6px' }}>
                                🚚 {getLivreurNom(cmd.livreur_id)}
                              </div>
                            )}
                            <button
                              onClick={() => changerStatut(cmd.id, 'livre')}
                              style={{ width: '100%', padding: '6px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, cursor: 'pointer', background: 'rgba(29,158,117,0.1)', color: '#0F6E56', border: '0.5px solid rgba(29,158,117,0.3)' }}
                            >
                              ✅ Confirmer livraison
                            </button>
                          </>
                        )}

                        {col.key === 'livre' && (
                          <div style={{ color: '#1D9E75', fontSize: '10px', textAlign: 'center', padding: '4px' }}>
                            ✓ Livraison confirmée
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