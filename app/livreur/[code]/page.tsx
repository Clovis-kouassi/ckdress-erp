'use client'

import { useEffect, useState, use } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Commande = {
  id: string
  nom_client: string
  telephone: string
  adresse: string
  quartier: string
  produit_ref: string
  taille: string
  variantes: string
  montant_total: number
  statut: string
  livreur_id: string | null
  created_at: string
}

type Livreur = {
  id: string
  nom: string
  telephone: string
  code: string
}

export default function LivreurPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const [livreur, setLivreur] = useState<Livreur | null>(null)
  const [disponibles, setDisponibles] = useState<Commande[]>([])
  const [mesLivraisons, setMesLivraisons] = useState<Commande[]>([])
  const [livrees, setLivrees] = useState<Commande[]>([])
  const [historique, setHistorique] = useState<Commande[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)
  const [success, setSuccess] = useState('')

  useEffect(() => { fetchData() }, [code])

  const fetchData = async () => {
    const { data: livreurs } = await supabase
      .from('livreurs')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('actif', true)
      .limit(1)

    if (!livreurs || livreurs.length === 0) {
      setNotFound(true)
      setLoading(false)
      return
    }

    const livreurData = livreurs[0]
    setLivreur(livreurData)

    // Disponibles (en_livraison + pas assignées)
    const { data: dispo } = await supabase
      .from('commandes_catalogue')
      .select('*')
      .eq('statut', 'en_livraison')
      .is('livreur_id', null)
      .order('created_at', { ascending: true })

    // Mes livraisons en cours
    const { data: miennes } = await supabase
      .from('commandes_catalogue')
      .select('*')
      .eq('statut', 'en_livraison')
      .eq('livreur_id', livreurData.id)
      .order('created_at', { ascending: true })

    // Livrées récentes
    const { data: livreesData } = await supabase
      .from('commandes_catalogue')
      .select('*')
      .eq('statut', 'livre')
      .eq('livreur_id', livreurData.id)
      .order('created_at', { ascending: false })
      .limit(5)

    // Tout l'historique (livré + en cours)
    const { data: histData } = await supabase
      .from('commandes_catalogue')
      .select('*')
      .eq('livreur_id', livreurData.id)
      .order('created_at', { ascending: false })

    setDisponibles(dispo || [])
    setMesLivraisons(miennes || [])
    setLivrees(livreesData || [])
    setHistorique(histData || [])
    setLoading(false)
  }

  const accepterLivraison = async (commandeId: string) => {
    setUpdating(commandeId)
    await supabase
      .from('commandes_catalogue')
      .update({ livreur_id: livreur!.id })
      .eq('id', commandeId)
      .is('livreur_id', null)
    setSuccess('✅ Livraison acceptée !')
    setTimeout(() => setSuccess(''), 2000)
    await fetchData()
    setUpdating(null)
  }

  const confirmerLivraison = async (commandeId: string) => {
    setUpdating(commandeId)
    await supabase
      .from('commandes_catalogue')
      .update({ statut: 'livre' })
      .eq('id', commandeId)
    setSuccess('✅ Livraison confirmée !')
    setTimeout(() => setSuccess(''), 2000)
    await fetchData()
    setUpdating(null)
  }

  const totalLivrees = historique.filter(c => c.statut === 'livre').length
  const totalAcceptees = historique.length
  const caTotal = historique.filter(c => c.statut === 'livre').reduce((s, c) => s + (c.montant_total || 0), 0)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a' }}>
      <p style={{ color: '#666' }}>Chargement...</p>
    </div>
  )

  if (notFound) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a' }}>
      <div style={{ textAlign: 'center', color: '#666' }}>
        <div style={{ fontSize: '3rem' }}>❌</div>
        <p>Code livreur invalide</p>
      </div>
    </div>
  )

  const colonnes = [
    { key: 'disponibles', label: 'Disponibles', color: '#378ADD', bg: 'rgba(55,138,221,0.12)', textColor: '#185FA5', data: disponibles },
    { key: 'mes_livraisons', label: 'Mes livraisons', color: '#BA7517', bg: 'rgba(239,159,39,0.12)', textColor: '#854F0B', data: mesLivraisons },
    { key: 'livrees', label: 'Livrées', color: '#0F6E56', bg: 'rgba(29,158,117,0.12)', textColor: '#085041', data: livrees },
    { key: 'historique', label: 'Historique', color: '#7c3aed', bg: 'rgba(124,58,237,0.12)', textColor: '#5b21b6', data: historique },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: 'sans-serif', color: 'white' }}>

      {/* TOPBAR */}
      <div style={{ background: '#111', borderBottom: '0.5px solid #222', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#1D9E75', fontSize: '16px', fontWeight: 500 }}>🚚 {livreur?.nom}</span>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ color: '#555', fontSize: '12px' }}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          <button onClick={fetchData} style={{ background: 'none', border: '0.5px solid #1D9E75', borderRadius: '6px', color: '#1D9E75', padding: '5px 10px', fontSize: '11px', cursor: 'pointer' }}>
            ↺ Actualiser
          </button>
        </div>
      </div>

      <div style={{ padding: '16px' }}>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '16px' }}>
          {[
            { label: 'Disponibles', value: disponibles.length, color: '#378ADD' },
            { label: 'En cours', value: mesLivraisons.length, color: '#BA7517' },
            { label: 'Total livrées', value: totalLivrees, color: '#1D9E75' },
            { label: 'CA encaissé', value: caTotal.toLocaleString('fr-FR') + ' F', color: '#1D9E75' },
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

        {/* KANBAN 4 colonnes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
          {colonnes.map(col => (
            <div key={col.key} style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '12px' }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: col.color }}>
                  {col.label}
                </span>
                <span style={{ fontSize: '10px', fontWeight: 500, padding: '1px 7px', borderRadius: '8px', background: col.bg, color: col.textColor }}>
                  {col.data.length}
                </span>
              </div>

              {col.data.length === 0 ? (
                <div style={{ color: '#444', fontSize: '11px', textAlign: 'center', padding: '20px 0' }}>Aucune</div>
              ) : (
                col.data.map(cmd => (
                  <div key={cmd.id} style={{ background: '#1a1a1a', border: '0.5px solid #2a2a2a', borderRadius: '10px', padding: '10px', marginBottom: '8px' }}>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', color: '#555' }}>#{cmd.id.slice(0, 6).toUpperCase()}</span>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: '#1D9E75' }}>
                        {cmd.montant_total?.toLocaleString('fr-FR')} F
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '2px' }}>{cmd.nom_client || '—'}</div>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>📞 {cmd.telephone}</div>
                    <div style={{ fontSize: '11px', color: '#555', marginBottom: '6px' }}>
                      📍 {cmd.adresse}{cmd.quartier ? ` — ${cmd.quartier}` : ''}
                    </div>
                    <div style={{ fontSize: '11px', color: '#555', marginBottom: '8px' }}>
                      🛍️ {cmd.produit_ref} — Taille {cmd.taille}
                    </div>

                    {/* Bouton selon colonne */}
                    {col.key === 'disponibles' && (
                      <button
                        onClick={() => accepterLivraison(cmd.id)}
                        disabled={updating === cmd.id}
                        style={{ width: '100%', padding: '6px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, cursor: updating === cmd.id ? 'not-allowed' : 'pointer', background: 'rgba(55,138,221,0.1)', color: '#378ADD', border: '0.5px solid rgba(55,138,221,0.3)' }}
                      >
                        {updating === cmd.id ? '...' : '✅ Accepter'}
                      </button>
                    )}

                    {col.key === 'mes_livraisons' && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <a href={`tel:${cmd.telephone}`} style={{ flex: 1, padding: '6px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, background: 'transparent', color: '#666', border: '0.5px solid #333', textAlign: 'center', textDecoration: 'none' }}>
                          📞 Appeler
                        </a>
                        <button
                          onClick={() => confirmerLivraison(cmd.id)}
                          disabled={updating === cmd.id}
                          style={{ flex: 2, padding: '6px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, cursor: updating === cmd.id ? 'not-allowed' : 'pointer', background: 'rgba(29,158,117,0.1)', color: '#0F6E56', border: '0.5px solid rgba(29,158,117,0.3)' }}
                        >
                          {updating === cmd.id ? '...' : '✅ Confirmer'}
                        </button>
                      </div>
                    )}

                    {col.key === 'livrees' && (
                      <div style={{ color: '#1D9E75', fontSize: '10px', textAlign: 'center', padding: '4px' }}>
                        ✓ Livraison confirmée
                      </div>
                    )}

                    {col.key === 'historique' && (
                      <div style={{
                        fontSize: '10px', textAlign: 'center', padding: '4px', borderRadius: '4px',
                        background: cmd.statut === 'livre' ? 'rgba(29,158,117,0.1)' : 'rgba(239,159,39,0.1)',
                        color: cmd.statut === 'livre' ? '#1D9E75' : '#BA7517',
                        border: `0.5px solid ${cmd.statut === 'livre' ? 'rgba(29,158,117,0.3)' : 'rgba(239,159,39,0.3)'}`,
                      }}>
                        {cmd.statut === 'livre' ? '✅ Livré' : '🔄 En cours'}
                        <div style={{ color: '#555', marginTop: '2px' }}>
                          {new Date(cmd.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}