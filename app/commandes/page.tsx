'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'

type Commande = {
  id: string; telephone: string; adresse: string; produit_ref: string; taille: string
  variantes: string; montant_total: number; frais_livraison: number; statut: string
  source: string; nom_client: string; note: string; created_at: string; livreur_id?: string
}
type Livreur = { id: string; nom: string; code: string }

const colonnes = [
  { key: 'nouveau', label: 'Nouvelles', color: '#E24B4A', bg: 'rgba(226,75,74,0.08)', textColor: '#E24B4A' },
  { key: 'en_preparation', label: 'Validées', color: '#378ADD', bg: 'rgba(55,138,221,0.08)', textColor: '#378ADD' },
  { key: 'en_livraison', label: 'En livraison', color: '#BA7517', bg: 'rgba(239,159,39,0.08)', textColor: '#BA7517' },
  { key: 'livre', label: 'Livrées', color: '#1D9E75', bg: 'rgba(29,158,117,0.08)', textColor: '#1D9E75' },
]

export default function CommandesPage() {
  const router = useRouter()
  const [commandes, setCommandes] = useState<Commande[]>([])
  const [livreurs, setLivreurs] = useState<Livreur[]>([])
  const [loading, setLoading] = useState(true)
  const [livreurChoisi, setLivreurChoisi] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState('')

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const [{ data: cmds }, { data: livs }] = await Promise.all([
      supabase.from('commandes_catalogue').select('*').neq('statut', 'annule').order('created_at', { ascending: false }),
      supabase.from('livreurs').select('*').eq('actif', true).order('nom'),
    ])
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

  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f5', fontFamily: 'sans-serif', color: '#1a1a1a' }}>

      {/* TOPBAR */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e5e5', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <span style={{ color: '#1D9E75', fontSize: '16px', fontWeight: 600 }}>CK Dress ERP</span>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          {[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Commandes', path: '/commandes' },
            { label: 'Livraisons', path: '/livraisons' },
          ].map(nav => (
            <a key={nav.path} href={nav.path} style={{ color: nav.path === '/commandes' ? '#1D9E75' : '#888', fontSize: '12px', textDecoration: 'none', fontWeight: nav.path === '/commandes' ? 600 : 400 }}>
              {nav.label}
            </a>
          ))}
          <button onClick={fetchData} style={{ background: 'none', border: '1px solid #1D9E75', borderRadius: '6px', color: '#1D9E75', padding: '5px 10px', fontSize: '11px', cursor: 'pointer' }}>
            ↺ Actualiser
          </button>
        </div>
      </div>

      <div style={{ padding: '16px' }}>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '10px', marginBottom: '16px' }}>
          {[
            { label: 'Total commandes', value: stats.total, color: '#1a1a1a' },
            { label: 'Nouvelles', value: stats.nouveau, color: '#E24B4A' },
            { label: 'En livraison', value: stats.en_livraison, color: '#BA7517' },
            { label: 'Livrées', value: stats.livre, color: '#1D9E75' },
            { label: 'CA livré', value: stats.ca.toLocaleString('fr-FR') + ' F', color: '#1D9E75' },
          ].map((k, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '10px', padding: '12px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '10px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{k.label}</div>
              <div style={{ fontSize: '20px', fontWeight: 500, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        {success && (
          <div style={{ background: '#f0fdf4', border: '1px solid #1D9E75', borderRadius: '8px', padding: '10px 16px', color: '#1D9E75', fontSize: '13px', marginBottom: '12px' }}>
            {success}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', color: '#aaa', padding: '60px' }}>Chargement...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
            {colonnes.map(col => {
              const cmdCol = commandes.filter(c => c.statut === col.key)
              return (
                <div key={col.key} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: col.color }}>
                      {col.label}
                    </span>
                    <span style={{ fontSize: '10px', fontWeight: 600, padding: '1px 7px', borderRadius: '8px', background: col.bg, color: col.textColor }}>
                      {cmdCol.length}
                    </span>
                  </div>

                  {cmdCol.length === 0 ? (
                    <div style={{ color: '#ccc', fontSize: '11px', textAlign: 'center', padding: '20px 0' }}>Aucune</div>
                  ) : cmdCol.map(cmd => (
                    <div key={cmd.id} style={{ background: '#f9f9f9', border: '1px solid #f0f0f0', borderRadius: '10px', padding: '10px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '10px', color: '#aaa' }}>#{cmd.id.slice(0, 6).toUpperCase()}</span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#1D9E75' }}>{cmd.montant_total?.toLocaleString('fr-FR')} F</span>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '2px', color: '#1a1a1a' }}>{cmd.nom_client || '—'}</div>
                      <div style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>📞 {cmd.telephone}</div>
                      <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '4px' }}>📍 {cmd.adresse}</div>
                      <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '8px' }}>🛍️ {cmd.produit_ref} — Taille {cmd.taille}</div>

                      <button onClick={() => router.push(`/commandes/${cmd.id}`)}
                        style={{ width: '100%', padding: '5px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, cursor: 'pointer', background: 'transparent', color: '#888', border: '1px solid #e5e5e5', marginBottom: '6px' }}>
                        Voir détail →
                      </button>

                      {col.key === 'nouveau' && (
                        <button onClick={() => changerStatut(cmd.id, 'en_preparation')}
                          style={{ width: '100%', padding: '6px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', background: 'rgba(55,138,221,0.08)', color: '#378ADD', border: '1px solid rgba(55,138,221,0.2)' }}>
                          ✓ Valider
                        </button>
                      )}

                      {col.key === 'en_preparation' && (
                        <>
                          <select value={livreurChoisi[cmd.id] || ''} onChange={e => setLivreurChoisi(prev => ({ ...prev, [cmd.id]: e.target.value }))}
                            style={{ width: '100%', padding: '5px', borderRadius: '6px', border: '1px solid #e5e5e5', background: '#fff', color: '#888', fontSize: '11px', marginBottom: '6px' }}>
                            <option value="">Assigner un livreur...</option>
                            {livreurs.map(l => <option key={l.id} value={l.id}>{l.nom} ({l.code})</option>)}
                          </select>
                          <button onClick={() => changerStatut(cmd.id, 'en_livraison', livreurChoisi[cmd.id])}
                            style={{ width: '100%', padding: '6px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', background: 'rgba(239,159,39,0.08)', color: '#BA7517', border: '1px solid rgba(239,159,39,0.2)' }}>
                            🚚 Envoyer en livraison
                          </button>
                        </>
                      )}

                      {col.key === 'en_livraison' && (
                        <>
                          {getLivreurNom(cmd.livreur_id) && (
                            <div style={{ fontSize: '11px', color: '#1D9E75', marginBottom: '6px' }}>🚚 {getLivreurNom(cmd.livreur_id)}</div>
                          )}
                          <button onClick={() => changerStatut(cmd.id, 'livre')}
                            style={{ width: '100%', padding: '6px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', background: 'rgba(29,158,117,0.08)', color: '#1D9E75', border: '1px solid rgba(29,158,117,0.2)' }}>
                            ✅ Confirmer livraison
                          </button>
                        </>
                      )}

                      {col.key === 'livre' && (
                        <div style={{ color: '#1D9E75', fontSize: '10px', textAlign: 'center', padding: '4px' }}>✓ Livraison confirmée</div>
                      )}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}