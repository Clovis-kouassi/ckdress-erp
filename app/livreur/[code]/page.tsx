'use client'

import { useEffect, useState, use } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Commande {
  id: string
  nom_client: string
  telephone: string
  adresse: string
  quartier: string
  articles: string
  produit_ref: string
  taille: string
  variantes: string
  total: number
  montant_total: number
  statut: string
  livreur_id: string | null
  created_at: string
}

interface Livreur {
  id: string
  nom: string
  telephone: string
  code: string
}

export default function LivreurPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const [livreur, setLivreur] = useState<Livreur | null>(null)
  const [commandes, setCommandes] = useState<Commande[]>([])
  const [mesLivraisons, setMesLivraisons] = useState<Commande[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [onglet, setOnglet] = useState<'disponibles' | 'mes_livraisons'>('disponibles')
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [code])

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

    // Commandes disponibles (en_livraison + pas encore assignées)
    const { data: dispo } = await supabase
      .from('commandes_catalogue')
      .select('*')
      .eq('statut', 'en_livraison')
      .is('livreur_id', null)
      .order('created_at', { ascending: true })

    // Mes livraisons acceptées
    const { data: miennes } = await supabase
      .from('commandes_catalogue')
      .select('*')
      .eq('statut', 'en_livraison')
      .eq('livreur_id', livreurData.id)
      .order('created_at', { ascending: true })

    setCommandes(dispo || [])
    setMesLivraisons(miennes || [])
    setLoading(false)
  }

  const accepterLivraison = async (commandeId: string) => {
    setUpdating(commandeId)
    await supabase
      .from('commandes_catalogue')
      .update({ livreur_id: livreur!.id })
      .eq('id', commandeId)
      .is('livreur_id', null) // Sécurité : évite double assignation
    await fetchData()
    setUpdating(null)
    setOnglet('mes_livraisons')
  }

  const confirmerLivraison = async (commandeId: string) => {
    setUpdating(commandeId)
    await supabase
      .from('commandes_catalogue')
      .update({ statut: 'livre' })
      .eq('id', commandeId)
    await fetchData()
    setUpdating(null)
  }

  const appelClient = (telephone: string) => {
    window.location.href = `tel:${telephone}`
  }

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

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', fontFamily: 'sans-serif', paddingBottom: '40px' }}>

      {/* Header */}
      <div style={{ background: '#111', borderBottom: '1px solid #222', padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ color: '#1D9E75', margin: 0, fontSize: '18px', fontWeight: 700 }}>
              🚚 {livreur?.nom}
            </h1>
            <p style={{ color: '#555', margin: '2px 0 0', fontSize: '12px' }}>
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <button onClick={fetchData} style={{ background: '#1a2e25', border: '1px solid #1D9E75', borderRadius: '8px', color: '#1D9E75', padding: '6px 12px', cursor: 'pointer', fontSize: '12px' }}>
            🔄 Actualiser
          </button>
        </div>
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', borderBottom: '1px solid #222', background: '#111' }}>
        <button
          onClick={() => setOnglet('disponibles')}
          style={{ flex: 1, padding: '14px', background: 'transparent', border: 'none', color: onglet === 'disponibles' ? '#1D9E75' : '#555', fontSize: '14px', fontWeight: 600, cursor: 'pointer', borderBottom: onglet === 'disponibles' ? '2px solid #1D9E75' : '2px solid transparent' }}
        >
          📦 Disponibles ({commandes.length})
        </button>
        <button
          onClick={() => setOnglet('mes_livraisons')}
          style={{ flex: 1, padding: '14px', background: 'transparent', border: 'none', color: onglet === 'mes_livraisons' ? '#1D9E75' : '#555', fontSize: '14px', fontWeight: 600, cursor: 'pointer', borderBottom: onglet === 'mes_livraisons' ? '2px solid #1D9E75' : '2px solid transparent' }}
        >
          🛵 Mes livraisons ({mesLivraisons.length})
        </button>
      </div>

      {/* Contenu */}
      <div style={{ padding: '16px' }}>

        {/* Onglet disponibles */}
        {onglet === 'disponibles' && (
          <>
            {commandes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#555' }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>✅</div>
                <p style={{ fontSize: '16px' }}>Aucune livraison disponible</p>
                <p style={{ fontSize: '13px', color: '#444' }}>Revenez plus tard 👋</p>
              </div>
            ) : (
              commandes.map((commande, index) => (
                <div key={commande.id} style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ color: '#444', fontSize: '12px' }}>#{index + 1}</span>
                    <span style={{ background: '#1a2e25', border: '1px solid #1D9E75', color: '#1D9E75', fontSize: '11px', padding: '3px 10px', borderRadius: '20px' }}>
                      Disponible
                    </span>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <p style={{ color: 'white', fontWeight: 600, margin: '0 0 4px', fontSize: '15px' }}>
                      {commande.nom_client || commande.telephone}
                    </p>
                    <p style={{ color: '#888', margin: '0 0 2px', fontSize: '13px' }}>
                      📍 {commande.adresse}{commande.quartier ? ` — ${commande.quartier}` : ''}
                    </p>
                    <p style={{ color: '#888', margin: 0, fontSize: '13px' }}>
                      🛍️ {commande.produit_ref} — Taille {commande.taille}
                    </p>
                  </div>

                  <div style={{ background: '#0a1a12', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#666', fontSize: '13px' }}>Montant à encaisser</span>
                    <span style={{ color: '#1D9E75', fontWeight: 700, fontSize: '15px' }}>
                      {(commande.montant_total || commande.total)?.toLocaleString()} F
                    </span>
                  </div>

                  <button
                    onClick={() => accepterLivraison(commande.id)}
                    disabled={updating === commande.id}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', background: updating === commande.id ? '#0a5c3f' : '#1D9E75', border: 'none', color: 'white', fontSize: '14px', cursor: updating === commande.id ? 'not-allowed' : 'pointer', fontWeight: 600 }}
                  >
                    {updating === commande.id ? 'Acceptation...' : '✅ Accepter cette livraison'}
                  </button>
                </div>
              ))
            )}
          </>
        )}

        {/* Onglet mes livraisons */}
        {onglet === 'mes_livraisons' && (
          <>
            {mesLivraisons.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#555' }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📭</div>
                <p style={{ fontSize: '16px' }}>Vous n'avez pas encore accepté de livraison</p>
              </div>
            ) : (
              mesLivraisons.map((commande, index) => (
                <div key={commande.id} style={{ background: '#111', border: '1px solid #333', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ color: '#444', fontSize: '12px' }}>#{index + 1}</span>
                    <span style={{ background: '#1a2416', border: '1px solid #2d4a2d', color: '#4ade80', fontSize: '11px', padding: '3px 10px', borderRadius: '20px' }}>
                      En cours
                    </span>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <p style={{ color: 'white', fontWeight: 600, margin: '0 0 4px', fontSize: '15px' }}>
                      {commande.nom_client || commande.telephone}
                    </p>
                    <p style={{ color: '#888', margin: '0 0 2px', fontSize: '13px' }}>
                      📍 {commande.adresse}{commande.quartier ? ` — ${commande.quartier}` : ''}
                    </p>
                    <p style={{ color: '#888', margin: 0, fontSize: '13px' }}>
                      🛍️ {commande.produit_ref} — Taille {commande.taille}
                    </p>
                  </div>

                  <div style={{ background: '#0a1a12', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#666', fontSize: '13px' }}>Montant à encaisser</span>
                    <span style={{ color: '#1D9E75', fontWeight: 700, fontSize: '15px' }}>
                      {(commande.montant_total || commande.total)?.toLocaleString()} F
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => appelClient(commande.telephone)}
                      style={{ flex: 1, padding: '12px', borderRadius: '8px', background: 'transparent', border: '1px solid #333', color: '#888', fontSize: '14px', cursor: 'pointer', fontWeight: 500 }}
                    >
                      📞 Appeler
                    </button>
                    <button
                      onClick={() => confirmerLivraison(commande.id)}
                      disabled={updating === commande.id}
                      style={{ flex: 2, padding: '12px', borderRadius: '8px', background: updating === commande.id ? '#0a5c3f' : '#1D9E75', border: 'none', color: 'white', fontSize: '14px', cursor: updating === commande.id ? 'not-allowed' : 'pointer', fontWeight: 600 }}
                    >
                      {updating === commande.id ? 'En cours...' : '✅ Confirmer livraison'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  )
}