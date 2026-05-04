'use client'

import { useEffect, useState } from 'react'
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
  total: number
  statut: string
}

interface Livreur {
  id: string
  nom: string
  telephone: string
  code: string
}

export default function LivreurPage({ params }: { params: { code: string } }) {
  const [livreur, setLivreur] = useState<Livreur | null>(null)
  const [commandes, setCommandes] = useState<Commande[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const code = params.code.toUpperCase()

    const { data: livreurs } = await supabase
      .from('livreurs')
      .select('*')
      .eq('code', code)
      .eq('actif', true)
      .limit(1)

    if (!livreurs || livreurs.length === 0) {
      setNotFound(true)
      setLoading(false)
      return
    }

    const livreurData = livreurs[0]
    setLivreur(livreurData)

    const { data: commandesData } = await supabase
      .from('commandes_catalogue')
      .select('*')
      .eq('livreur_id', livreurData.id)
      .neq('statut', 'livré')
      .order('created_at', { ascending: true })

    setCommandes(commandesData || [])
    setLoading(false)
  }

  const marquerLivre = async (commandeId: string) => {
    setUpdating(commandeId)
    await supabase
      .from('commandes_catalogue')
      .update({ statut: 'livré' })
      .eq('id', commandeId)
    setCommandes(prev => prev.filter(c => c.id !== commandeId))
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
          <div style={{ background: '#1a2e25', border: '1px solid #1D9E75', borderRadius: '20px', padding: '6px 14px', color: '#1D9E75', fontSize: '13px', fontWeight: 600 }}>
            {commandes.length} à livrer
          </div>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {commandes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#555' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>✅</div>
            <p style={{ fontSize: '16px' }}>Toutes les livraisons sont terminées !</p>
            <p style={{ fontSize: '13px', color: '#444' }}>Bonne journée 👏</p>
          </div>
        ) : (
          commandes.map((commande, index) => (
            <div key={commande.id} style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ color: '#444', fontSize: '12px' }}>#{index + 1}</span>
                <span style={{ background: '#1a2416', border: '1px solid #2d4a2d', color: '#4ade80', fontSize: '11px', padding: '3px 10px', borderRadius: '20px' }}>En cours</span>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <p style={{ color: 'white', fontWeight: 600, margin: '0 0 4px', fontSize: '16px' }}>{commande.nom_client}</p>
                <p style={{ color: '#888', margin: '0 0 2px', fontSize: '13px' }}>📍 {commande.adresse}{commande.quartier ? ` — ${commande.quartier}` : ''}</p>
                <p style={{ color: '#888', margin: 0, fontSize: '13px' }}>🛍️ {commande.articles}</p>
              </div>
              <div style={{ background: '#0a1a12', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#666', fontSize: '13px' }}>Montant à encaisser</span>
                <span style={{ color: '#1D9E75', fontWeight: 700, fontSize: '15px' }}>{commande.total?.toLocaleString()} F</span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => appelClient(commande.telephone)} style={{ flex: 1, padding: '12px', borderRadius: '8px', background: 'transparent', border: '1px solid #333', color: '#888', fontSize: '14px', cursor: 'pointer', fontWeight: 500 }}>
                  📞 Appeler
                </button>
                <button onClick={() => marquerLivre(commande.id)} disabled={updating === commande.id} style={{ flex: 2, padding: '12px', borderRadius: '8px', background: updating === commande.id ? '#0a5c3f' : '#1D9E75', border: 'none', color: 'white', fontSize: '14px', cursor: updating === commande.id ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                  {updating === commande.id ? 'En cours...' : '✅ Marquer livré'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}