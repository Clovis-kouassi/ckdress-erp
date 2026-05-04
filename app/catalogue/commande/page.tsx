'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'

const WHATSAPP_NUMBER = '2250555303010'
const FRAIS_LIVRAISON_DEFAUT = 1500

type StockItem = { id: string; couleur: string; taille: string; quantite: number }
type Produit = { id: string; nom: string; prix_vente: number; reference: string }

function CommandeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const produitRef = searchParams.get('produit') || ''
  const taille = searchParams.get('taille') || ''
  const variantesIds = (searchParams.get('variantes') || '').split(',').filter(Boolean)

  const [produit, setProduit] = useState<Produit | null>(null)
  const [variantes, setVariantes] = useState<StockItem[]>([])
  const [fraisLivraison] = useState(FRAIS_LIVRAISON_DEFAUT)
  const [telephone, setTelephone] = useState('')
  const [adresse, setAdresse] = useState('')
  const [loading, setLoading] = useState(false)
  const [succes, setSucces] = useState(false)

  useEffect(() => {
    async function fetchData() {
      const { data: prodData } = await supabase.from('produits').select('*').eq('reference', produitRef).single()
      if (prodData) setProduit(prodData)
      if (variantesIds.length > 0) {
        const { data: stockData } = await supabase.from('stock').select('*').in('id', variantesIds)
        if (stockData) setVariantes(stockData)
      }
    }
    fetchData()
  }, [])

  const sousTotal = produit ? produit.prix_vente * variantes.length : 0
  const total = sousTotal + fraisLivraison

  async function enregistrerCommande(via: 'whatsapp' | 'formulaire') {
    const ref = Math.random().toString(36).slice(2, 10).toUpperCase()
    const { error } = await supabase.from('commandes_catalogue').insert({
      telephone,
      adresse,
      produit_ref: produitRef,
      taille,
      variantes: variantes.map(v => v.couleur).join(', '),
      montant_total: total,
      frais_livraison: fraisLivraison,
      statut: 'nouveau',
      source: via,
      note: `REF: ${ref}`,
    })
    return { ref, error }
  }

  function getWhatsappUrl(ref: string) {
    const lignes = variantes.map(v => `• ${produit?.nom} — Taille ${v.taille} — ${v.couleur}`)
    const msg = `Bonjour CK Dress 👋\n\n✅ COMMANDE #${ref}\n\n${lignes.join('\n')}\n\nSous-total : ${sousTotal.toLocaleString('fr-FR')} F\nLivraison : ${fraisLivraison.toLocaleString('fr-FR')} F\nTotal : ${total.toLocaleString('fr-FR')} F\n\nTéléphone : ${telephone}\nAdresse : ${adresse}`
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`
  }

  async function handleWhatsApp() {
    if (!telephone || !adresse) { alert('Renseignez votre téléphone et adresse.'); return }
    setLoading(true)
    const { ref, error } = await enregistrerCommande('whatsapp')
    if (error) { alert("Erreur. Réessayez."); setLoading(false); return }
    window.open(getWhatsappUrl(ref), '_blank')
    setSucces(true)
    setLoading(false)
  }

  async function handleValider() {
    if (!telephone || !adresse) return
    setLoading(true)
    const { error } = await enregistrerCommande('formulaire')
    if (error) { alert("Erreur. Réessayez."); setLoading(false); return }
    setSucces(true)
    setLoading(false)
  }

  if (succes) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: 32, textAlign: 'center', background: '#faf9f7' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: '0 0 10px' }}>Commande enregistrée !</h2>
      <p style={{ color: '#666', fontSize: 15, maxWidth: 320, lineHeight: 1.6 }}>
        Votre commande est en cours de traitement. Un livreur vous contactera au <strong>{telephone}</strong> pour organiser la livraison.
      </p>
      <button onClick={() => router.push('/catalogue')}
        style={{ marginTop: 28, background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
        Retour au catalogue
      </button>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7', fontFamily: "'DM Sans', sans-serif", paddingBottom: 40 }}>
      <header style={{ background: '#1a1a1a', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 22, padding: 0 }}>←</button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>Valider ma commande</span>
        </div>
        <div style={{ width: 34 }} />
      </header>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #ece9e3', padding: '16px', marginBottom: 16 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: '#888', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Récapitulatif</h3>
          {variantes.length === 0 ? (
            <p style={{ color: '#aaa', fontSize: 14, margin: 0 }}>Chargement...</p>
          ) : variantes.map(v => (
            <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{produit?.nom}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#888' }}>Taille {v.taille} — {v.couleur}</p>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#d4a853' }}>{produit?.prix_vente.toLocaleString('fr-FR')} F</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, paddingBottom: 6 }}>
            <span style={{ fontSize: 13, color: '#888' }}>Sous-total</span>
            <span style={{ fontSize: 13, color: '#888' }}>{sousTotal.toLocaleString('fr-FR')} F</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #f0f0f0' }}>
            <span style={{ fontSize: 13, color: '#888' }}>Frais de livraison</span>
            <span style={{ fontSize: 13, color: '#888' }}>{fraisLivraison.toLocaleString('fr-FR')} F</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>Total à payer</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>{total.toLocaleString('fr-FR')} F</span>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #ece9e3', padding: '16px', marginBottom: 20 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: '#888', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Infos de livraison</h3>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#555', display: 'block', marginBottom: 6 }}>Téléphone *</label>
            <input type="tel" value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="Ex: 07 00 00 00 00"
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e5e2dc', fontSize: 15, color: '#1a1a1a', background: '#faf9f7', outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#555', display: 'block', marginBottom: 6 }}>Adresse de livraison *</label>
            <textarea value={adresse} onChange={e => setAdresse(e.target.value)} placeholder="Quartier, rue, description..." rows={3}
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e5e2dc', fontSize: 14, color: '#1a1a1a', background: '#faf9f7', outline: 'none', resize: 'vertical' }} />
          </div>
        </div>

        <div style={{ background: '#f0f7ff', borderRadius: 12, padding: '12px 14px', marginBottom: 16, border: '1px solid #dbeafe' }}>
          <p style={{ margin: 0, fontSize: 13, color: '#3b82f6', lineHeight: 1.5 }}>
            ℹ️ Votre commande sera enregistrée automatiquement, un livreur vous contactera dans 48h maximum pour votre livraison.
          </p>
        </div>

        <button onClick={handleWhatsApp} disabled={loading}
          style={{ width: '100%', background: '#25D366', color: '#fff', border: 'none', borderRadius: 14, padding: '16px', fontSize: 16, fontWeight: 600, cursor: 'pointer', marginBottom: 12 }}>
          {loading ? 'Enregistrement...' : 'Commander via WhatsApp'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 12px' }}>
          <div style={{ flex: 1, height: 1, background: '#ece9e3' }} />
          <span style={{ fontSize: 12, color: '#aaa' }}>ou</span>
          <div style={{ flex: 1, height: 1, background: '#ece9e3' }} />
        </div>

        <button onClick={handleValider} disabled={loading || !telephone || !adresse}
          style={{ width: '100%', background: (!telephone || !adresse) ? '#f0ece4' : '#1a1a1a', color: (!telephone || !adresse) ? '#aaa' : '#fff', border: 'none', borderRadius: 14, padding: '16px', fontSize: 16, fontWeight: 600, cursor: (!telephone || !adresse) ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Envoi...' : 'Valider la commande en ligne'}
        </button>
        <p style={{ textAlign: 'center', color: '#aaa', fontSize: 12, marginTop: 8 }}>Un livreur vous contactera dans 48h pour la livraison</p>
      </div>

      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
    </div>
  )
}

export default function CommandePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>Chargement…</div>}>
      <CommandeContent />
    </Suspense>
  )
}