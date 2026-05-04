'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
  note: string
  created_at: string
  livreur_id?: string
}

type StockItem = {
  id: string
  couleur: string
  taille: string
  quantite: number
  image_url?: string
}

type Produit = {
  id: string
  nom: string
  prix_vente: number
  reference: string
  image_url?: string
}

type Livreur = {
  id: string
  nom: string
  code: string
  telephone: string
}

const STATUTS: Record<string, { label: string; color: string; bg: string }> = {
  nouveau: { label: 'Nouveau', color: '#92400e', bg: '#fef3c7' },
  en_preparation: { label: 'En préparation', color: '#1e40af', bg: '#dbeafe' },
  en_livraison: { label: 'En livraison', color: '#5b21b6', bg: '#ede9fe' },
  livre: { label: 'Livré', color: '#065f46', bg: '#d1fae5' },
  annule: { label: 'Annulé', color: '#991b1b', bg: '#fee2e2' },
}

export default function CommandeDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [commande, setCommande] = useState<Commande | null>(null)
  const [produit, setProduit] = useState<Produit | null>(null)
  const [variantes, setVariantes] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [livreurs, setLivreurs] = useState<Livreur[]>([])
  const [livreurId, setLivreurId] = useState<string>('')
  const [assignant, setAssignant] = useState(false)
  const [assignSuccess, setAssignSuccess] = useState(false)

  useEffect(() => {
    async function fetchData() {
      const { data: cmd } = await supabase
        .from('commandes_catalogue')
        .select('*')
        .eq('id', id)
        .single()

      if (cmd) {
        setCommande(cmd)
        if (cmd.livreur_id) setLivreurId(cmd.livreur_id)

        const { data: prodData } = await supabase
          .from('produits')
          .select('*')
          .eq('reference', cmd.produit_ref)
          .single()
        if (prodData) setProduit(prodData)

        if (cmd.variantes) {
          const couleurs = cmd.variantes.split(', ')
          const { data: stockData } = await supabase
            .from('stock')
            .select('*')
            .eq('taille', cmd.taille)
            .in('couleur', couleurs)
          if (stockData) setVariantes(stockData)
        }
      }

      const { data: livreursData } = await supabase
        .from('livreurs')
        .select('*')
        .eq('actif', true)
        .order('nom')
      setLivreurs(livreursData || [])
      setLoading(false)
    }
    fetchData()
  }, [id])

  async function changerStatut(statut: string) {
    await supabase.from('commandes_catalogue').update({ statut }).eq('id', id)
    setCommande(prev => prev ? { ...prev, statut } : null)
  }

  async function assignerLivreur() {
    setAssignant(true)
    await supabase
      .from('commandes_catalogue')
      .update({ livreur_id: livreurId || null })
      .eq('id', id)
    setCommande(prev => prev ? { ...prev, livreur_id: livreurId } : null)
    setAssignant(false)
    setAssignSuccess(true)
    setTimeout(() => setAssignSuccess(false), 3000)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <p style={{ color: '#999' }}>Chargement...</p>
    </div>
  )

  if (!commande) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <p style={{ color: '#999' }}>Commande introuvable.</p>
    </div>
  )

  const sousTotal = commande.montant_total - (commande.frais_livraison || 1500)
  const livreurAssigne = livreurs.find(l => l.id === commande.livreur_id)

  function appelClient() {
    window.location.href = `tel:${commande!.telephone}`
  }

  function whatsappClient() {
    window.open(`https://wa.me/${commande!.telephone.replace(/\s/g, '')}`, '_blank')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: "'DM Sans', sans-serif" }}>

      <header style={{ background: '#1a1a1a', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.push('/commandes')} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 20 }}>←</button>
        <div style={{ flex: 1 }}>
          <span style={{ color: '#fff', fontSize: 17, fontWeight: 600 }}>
            Commande #{commande.id.slice(0, 8).toUpperCase()}
          </span>
        </div>
        <span style={{
          fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20,
          background: STATUTS[commande.statut]?.bg || '#f3f4f6',
          color: STATUTS[commande.statut]?.color || '#555',
        }}>
          {STATUTS[commande.statut]?.label || commande.statut}
        </span>
      </header>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>

        {variantes.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: '16px', marginBottom: 16 }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: '#888', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Articles commandés
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
              {variantes.map(v => (
                <div key={v.id} style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #ece9e3' }}>
                  <div style={{ aspectRatio: '3/4', background: 'linear-gradient(135deg, #f0ece4, #e8e1d5)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {v.image_url
                      ? <img src={v.image_url} alt={v.couleur} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ fontSize: 36, opacity: 0.2 }}>👗</div>
                    }
                  </div>
                  <div style={{ padding: '8px 10px' }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{v.couleur}</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#888' }}>Taille {v.taille}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: '16px', marginBottom: 16 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: '#888', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Détails produit
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>{produit?.nom || commande.produit_ref}</p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>Taille {commande.taille} · {commande.variantes}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: 13, color: '#888' }}>Sous-total</p>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#d4a853' }}>{sousTotal.toLocaleString('fr-FR')} F</p>
            </div>
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#888' }}>Frais de livraison</span>
            <span style={{ fontSize: 13, color: '#888' }}>{(commande.frais_livraison || 1500).toLocaleString('fr-FR')} F</span>
          </div>
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>Total</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>{commande.montant_total?.toLocaleString('fr-FR')} F</span>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: '16px', marginBottom: 16 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: '#888', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Infos client
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#888' }}>Téléphone</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>📞 {commande.telephone}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ fontSize: 13, color: '#888', flexShrink: 0 }}>Adresse</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', textAlign: 'right' }}>📍 {commande.adresse}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#888' }}>Source</span>
              <span style={{ fontSize: 14, color: '#1a1a1a' }}>
                {commande.source === 'whatsapp' ? '📱 WhatsApp' : '🌐 Formulaire'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#888' }}>Date</span>
              <span style={{ fontSize: 13, color: '#555' }}>
                {new Date(commande.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: '16px', marginBottom: 16 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: '#888', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Changer le statut
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(STATUTS).map(([key, val]) => (
              <button
                key={key}
                onClick={() => changerStatut(key)}
                style={{
                  padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  background: commande.statut === key ? val.bg : '#f9fafb',
                  color: commande.statut === key ? val.color : '#555',
                  border: commande.statut === key ? `1.5px solid ${val.color}` : '1.5px solid #e5e7eb',
                }}
              >
                {val.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: '16px', marginBottom: 16 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: '#888', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            🚚 Assigner un livreur
          </h3>
          {livreurAssigne && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#065f46' }}>✅ {livreurAssigne.nom}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#888' }}>{livreurAssigne.code} · {livreurAssigne.telephone}</p>
              </div>
              <a href={`/livreur/${livreurAssigne.code}`} target="_blank" style={{ fontSize: 12, color: '#1D9E75', textDecoration: 'none', fontWeight: 600 }}>
                Voir interface →
              </a>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <select
              value={livreurId}
              onChange={e => setLivreurId(e.target.value)}
              style={{ flex: 1, padding: '10px 14px', borderRadius: 8, background: '#f9fafb', border: '1px solid #e5e7eb', color: '#1a1a1a', fontSize: 14 }}
            >
              <option value="">— Aucun livreur —</option>
              {livreurs.map(l => (
                <option key={l.id} value={l.id}>{l.nom} ({l.code})</option>
              ))}
            </select>
            <button
              onClick={assignerLivreur}
              disabled={assignant}
              style={{ padding: '10px 20px', background: assignSuccess ? '#065f46' : '#1a1a1a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, minWidth: 100 }}
            >
              {assignant ? '...' : assignSuccess ? '✅ Assigné !' : 'Assigner'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <button onClick={appelClient} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            📞 Appeler client
          </button>
          <button onClick={whatsappClient} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#25D366', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            💬 WhatsApp
          </button>
        </div>
      </div>

      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
    </div>
  )
}