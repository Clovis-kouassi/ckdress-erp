'use client'

import { useEffect, useState } from 'react'
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
  nom_client: string
  note: string
  created_at: string
  livreur_id?: string
  motif_retour?: string
}

type Livreur = {
  id: string
  nom: string
  telephone: string
  code: string
}

export default function LivraisonsPage() {
  const [commandes, setCommandes] = useState<Commande[]>([])
  const [livreurs, setLivreurs] = useState<Livreur[]>([])
  const [loading, setLoading] = useState(true)
  const [filtreStatut, setFiltreStatut] = useState<string>('tous')
  const [filtreLivreur, setFiltreLivreur] = useState<string>('tous')

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const [{ data: cmds }, { data: livs }] = await Promise.all([
      supabase.from('commandes_catalogue').select('*')
        .in('statut', ['en_livraison', 'livre', 'retour'])
        .order('created_at', { ascending: false }),
      supabase.from('livreurs').select('*').order('nom'),
    ])
    setCommandes(cmds || [])
    setLivreurs(livs || [])
    setLoading(false)
  }

  const getLivreurNom = (id?: string) => livreurs.find(l => l.id === id)?.nom || '—'

  const commandesFiltrees = commandes.filter(c => {
    const okStatut = filtreStatut === 'tous' || c.statut === filtreStatut
    const okLivreur = filtreLivreur === 'tous' || c.livreur_id === filtreLivreur
    return okStatut && okLivreur
  })

  // Stats globales
  const stats = {
    enCours: commandes.filter(c => c.statut === 'en_livraison').length,
    livres: commandes.filter(c => c.statut === 'livre').length,
    retours: commandes.filter(c => c.statut === 'retour').length,
    ca: commandes.filter(c => c.statut === 'livre').reduce((s, c) => s + (c.frais_livraison || 0), 0),
  }

  // Stats par livreur
  const statsByLivreur = livreurs.map(liv => {
    const colis = commandes.filter(c => c.livreur_id === liv.id)
    return {
      ...liv,
      enCours: colis.filter(c => c.statut === 'en_livraison').length,
      livres: colis.filter(c => c.statut === 'livre').length,
      retours: colis.filter(c => c.statut === 'retour').length,
      ca: colis.filter(c => c.statut === 'livre').reduce((s, c) => s + (c.frais_livraison || 0), 0),
    }
  })

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: "'Inter', sans-serif", color: '#1a1a1a' }}>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1 style={{ color: '#38bdf8', margin: 0, fontSize: '16px', fontWeight: 700 }}>🚚 Livraisons</h1>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'Dashboard', path: '/dashboard' },
              { label: 'Commandes', path: '/commandes' },
              { label: 'Livraisons', path: '/livraisons' },
            ].map(nav => (
              <a key={nav.path} href={nav.path} style={{ color: nav.path === '/livraisons' ? '#38bdf8' : '#94a3b8', fontSize: '12px', textDecoration: 'none', fontWeight: nav.path === '/livraisons' ? 600 : 400 }}>
                {nav.label}
              </a>
            ))}
          </div>
        </div>
        <button onClick={fetchData} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#94a3b8', padding: '6px 12px', fontSize: '11px', cursor: 'pointer' }}>
          ↺ Actualiser
        </button>
      </div>

      <div style={{ padding: 16 }}>

        {/* STATS GLOBALES */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'En cours', value: stats.enCours, color: '#f59e0b', bg: '#fff8e6' },
            { label: 'Livrés', value: stats.livres, color: '#1D9E75', bg: '#f0fdf4' },
            { label: 'Retours', value: stats.retours, color: '#ef4444', bg: '#fff0f0' },
            { label: 'CA livraisons', value: stats.ca.toLocaleString('fr-FR') + ' F', color: '#1D9E75', bg: '#f0fdf4' },
          ].map((k, i) => (
            <div key={i} style={{ background: k.bg, border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', marginBottom: 4, fontWeight: 600 }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* STATS PAR LIVREUR */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: 16, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>📊 Performance par livreur</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {statsByLivreur.map(liv => (
              <div key={liv.id} style={{ background: '#f8f9fa', borderRadius: 12, padding: 14, border: '1px solid #e5e7eb' }}>
                <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>🚚 {liv.nom}</p>
                <p style={{ margin: '0 0 2px', fontSize: 11, color: '#888' }}>{liv.code}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#f59e0b' }}>{liv.enCours}</div>
                    <div style={{ fontSize: 10, color: '#888' }}>En cours</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1D9E75' }}>{liv.livres}</div>
                    <div style={{ fontSize: 10, color: '#888' }}>Livrés</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#ef4444' }}>{liv.retours}</div>
                    <div style={{ fontSize: 10, color: '#888' }}>Retours</div>
                  </div>
                </div>
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1D9E75' }}>{liv.ca.toLocaleString('fr-FR')} F</div>
                  <div style={{ fontSize: 10, color: '#888' }}>CA total</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FILTRES */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <select value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, outline: 'none', color: '#1a1a1a' }}>
            <option value="tous">Tous les statuts</option>
            <option value="en_livraison">🚚 En livraison</option>
            <option value="livre">✅ Livrés</option>
            <option value="retour">❌ Retours</option>
          </select>
          <select value={filtreLivreur} onChange={e => setFiltreLivreur(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, outline: 'none', color: '#1a1a1a' }}>
            <option value="tous">Tous les livreurs</option>
            {livreurs.map(l => <option key={l.id} value={l.id}>{l.nom}</option>)}
          </select>
          <div style={{ padding: '8px 14px', background: '#f0f2f5', borderRadius: 8, fontSize: 13, color: '#888' }}>
            {commandesFiltrees.length} colis
          </div>
        </div>

        {/* LISTE DES COLIS */}
        {loading ? (
          <div style={{ textAlign: 'center', color: '#aaa', padding: 60 }}>Chargement...</div>
        ) : commandesFiltrees.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', color: '#ccc', border: '1px solid #e5e7eb' }}>
            Aucun colis trouvé
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {commandesFiltrees.map(cmd => (
              <div key={cmd.id} style={{
                background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e5e7eb',
                borderLeft: `4px solid ${cmd.statut === 'livre' ? '#1D9E75' : cmd.statut === 'retour' ? '#ef4444' : '#f59e0b'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a' }}>#{cmd.id.slice(0, 6).toUpperCase()}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                        background: cmd.statut === 'livre' ? '#f0fdf4' : cmd.statut === 'retour' ? '#fff0f0' : '#fff8e6',
                        color: cmd.statut === 'livre' ? '#1D9E75' : cmd.statut === 'retour' ? '#ef4444' : '#f59e0b'
                      }}>
                        {cmd.statut === 'livre' ? '✅ Livré' : cmd.statut === 'retour' ? '❌ Retour' : '🚚 En livraison'}
                      </span>
                    </div>
                    <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{cmd.nom_client || '—'}</p>
                    <p style={{ margin: '0 0 2px', fontSize: 12, color: '#888' }}>📞 {cmd.telephone}</p>
                    <p style={{ margin: '0 0 2px', fontSize: 12, color: '#888' }}>📍 {cmd.adresse}</p>
                    <p style={{ margin: '0 0 2px', fontSize: 11, color: '#aaa' }}>🛍️ {cmd.produit_ref} — {cmd.taille} — {cmd.variantes}</p>
                    {cmd.motif_retour && (
                      <p style={{ margin: '4px 0 0', fontSize: 11, color: '#ef4444', background: '#fff0f0', padding: '4px 8px', borderRadius: 6 }}>
                        Motif retour : {cmd.motif_retour}
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1D9E75', marginBottom: 4 }}>
                      {cmd.frais_livraison?.toLocaleString('fr-FR')} F
                    </div>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
                      🚚 {cmd.livreur_id ? getLivreurNom(cmd.livreur_id) : <span style={{ color: '#f59e0b' }}>Non assigné</span>}
                    </div>
                    <div style={{ fontSize: 10, color: '#ccc' }}>
                      {new Date(cmd.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}