'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { requestNotificationPermission } from '@/app/lib/firebase'

const WHATSAPP_NUMBER = '2250555303010'
const FRAIS_LIVRAISON_ABIDJAN = 1500
const FRAIS_EXPEDITION = 3000

type StockItem = { id: string; couleur: string; taille: string; quantite: number }
type Produit = { id: string; nom: string; prix_vente: number; reference: string }

const MOYENS_PAIEMENT = [
  { id: 'wave', label: 'Wave', icon: '🌊', color: '#1BA0E2' },
  { id: 'orange_money', label: 'Orange Money', icon: '🟠', color: '#FF6600' },
  { id: 'mtn_money', label: 'MTN Money', icon: '🟡', color: '#FFC000' },
  { id: 'moov_money', label: 'Moov Money', icon: '🔵', color: '#0066CC' },
]

function CommandeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const produitRef = searchParams.get('produit') || ''
  const taille = searchParams.get('taille') || ''
  const variantesIds = (searchParams.get('variantes') || '').split(',').filter(Boolean)

  const [produit, setProduit] = useState<Produit | null>(null)
  const [variantes, setVariantes] = useState<StockItem[]>([])
  const [telephone, setTelephone] = useState('')
  const [adresse, setAdresse] = useState('')
  const [ville, setVille] = useState('')
  const [moyenPaiement, setMoyenPaiement] = useState('')
  const [typeCommande, setTypeCommande] = useState<'abidjan' | 'expedition'>('abidjan')
  const [loading, setLoading] = useState(false)
  const [succes, setSucces] = useState(false)

  const fraisLivraison = typeCommande === 'abidjan' ? FRAIS_LIVRAISON_ABIDJAN : FRAIS_EXPEDITION

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
    const { data, error } = await supabase.from('commandes_catalogue').insert({
      telephone,
      adresse: typeCommande === 'expedition' ? `Ville: ${ville}` : adresse,
      produit_ref: produitRef,
      taille,
      variantes: variantes.map(v => v.couleur).join(', '),
      montant_total: total,
      frais_livraison: fraisLivraison,
      statut: 'nouveau',
      source: via,
      note: `REF: ${ref} | ${typeCommande === 'expedition' ? `EXPÉDITION ${ville} | Paiement: ${moyenPaiement}` : 'ABIDJAN'}`,
    }).select().single()

    // ✅ Déduire le stock via fonction SQL sécurisée
    if (data && !error) {
      for (const variante of variantes) {
        await supabase.rpc('deduire_stock', { stock_id: variante.id })
      }
    }

    // Demander permission notification + sauvegarder token
    if (data) {
      try {
        const token = await requestNotificationPermission()
        if (token) {
          await supabase.from('push_tokens').insert({
            commande_id: data.id,
            token,
          })
        }
      } catch (e) {
        console.log('Notification non activée')
      }
    }

    return { ref, error }
  }

  function getWhatsappUrl(ref: string) {
    const lignes = variantes.map(v => `• ${produit?.nom} — Taille ${v.taille} — ${v.couleur}`)
    const moyenLabel = MOYENS_PAIEMENT.find(m => m.id === moyenPaiement)?.label || moyenPaiement

    if (typeCommande === 'expedition') {
      const msg = `Bonjour CK Dress 👋\n\n✅ COMMANDE #${ref}\n📦 EXPÉDITION vers ${ville}\n\n${lignes.join('\n')}\n\nSous-total : ${sousTotal.toLocaleString('fr-FR')} F\nFrais expédition : ${fraisLivraison.toLocaleString('fr-FR')} F\n💰 TOTAL : ${total.toLocaleString('fr-FR')} F\n\n💳 Moyen de paiement choisi : ${moyenLabel}\n📞 Téléphone : ${telephone}\n📍 Ville : ${ville}\n\n⚠️ En attente de confirmation du paiement avant expédition.`
      return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`
    } else {
      const msg = `Bonjour CK Dress 👋\n\n✅ COMMANDE #${ref}\n🏙️ LIVRAISON ABIDJAN\n\n${lignes.join('\n')}\n\nSous-total : ${sousTotal.toLocaleString('fr-FR')} F\nFrais livraison : ${fraisLivraison.toLocaleString('fr-FR')} F\n💰 TOTAL : ${total.toLocaleString('fr-FR')} F\n\n📞 Téléphone : ${telephone}\n📍 Adresse : ${adresse}`
      return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`
    }
  }

  async function handleWhatsApp() {
    if (!telephone) { alert('Renseignez votre téléphone.'); return }
    if (typeCommande === 'abidjan' && !adresse) { alert('Renseignez votre adresse.'); return }
    if (typeCommande === 'expedition' && !ville) { alert('Renseignez votre ville.'); return }
    if (typeCommande === 'expedition' && !moyenPaiement) { alert('Choisissez un moyen de paiement.'); return }
    setLoading(true)
    const { ref, error } = await enregistrerCommande('whatsapp')
    if (error) { alert("Erreur. Réessayez."); setLoading(false); return }
    window.open(getWhatsappUrl(ref), '_blank')
    setSucces(true)
    setLoading(false)
  }

  async function handleValider() {
    if (!telephone) return
    if (typeCommande === 'abidjan' && !adresse) return
    if (typeCommande === 'expedition' && (!ville || !moyenPaiement)) return
    setLoading(true)
    const { error } = await enregistrerCommande('formulaire')
    if (error) { alert("Erreur. Réessayez."); setLoading(false); return }
    setSucces(true)
    setLoading(false)
  }

  const canSubmit = telephone &&
    (typeCommande === 'abidjan' ? adresse : (ville && moyenPaiement))

  if (succes) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: 32, textAlign: 'center', background: '#faf9f7' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: '0 0 10px' }}>Commande enregistrée !</h2>
      <p style={{ color: '#666', fontSize: 15, maxWidth: 340, lineHeight: 1.6 }}>
        {typeCommande === 'abidjan'
          ? <>Votre commande est confirmée ! Un livreur vous contactera au <strong>{telephone}</strong> dans <strong>24h maximum</strong> pour la livraison à Abidjan.</>
          : <>Votre demande d'expédition vers <strong>{ville}</strong> est enregistrée ! Notre équipe vous contactera au <strong>{telephone}</strong> pour confirmer le paiement via <strong>{MOYENS_PAIEMENT.find(m => m.id === moyenPaiement)?.label}</strong>. Délai : <strong>48h après paiement</strong>.</>
        }
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          <button onClick={() => setTypeCommande('abidjan')} style={{
            padding: '14px', borderRadius: 12, cursor: 'pointer', fontWeight: 600, fontSize: 14, textAlign: 'center',
            background: typeCommande === 'abidjan' ? '#1a1a1a' : '#fff',
            color: typeCommande === 'abidjan' ? '#fff' : '#555',
            border: typeCommande === 'abidjan' ? '2px solid #1a1a1a' : '2px solid #ece9e3',
          }}>
            🏙️ Abidjan<br />
            <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.8 }}>24h — {FRAIS_LIVRAISON_ABIDJAN.toLocaleString()} F</span>
          </button>
          <button onClick={() => setTypeCommande('expedition')} style={{
            padding: '14px', borderRadius: 12, cursor: 'pointer', fontWeight: 600, fontSize: 14, textAlign: 'center',
            background: typeCommande === 'expedition' ? '#d4a853' : '#fff',
            color: typeCommande === 'expedition' ? '#fff' : '#555',
            border: typeCommande === 'expedition' ? '2px solid #d4a853' : '2px solid #ece9e3',
          }}>
            📦 Expédition<br />
            <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.8 }}>48h — {FRAIS_EXPEDITION.toLocaleString()} F</span>
          </button>
        </div>

        <div style={{
          background: typeCommande === 'abidjan' ? '#f0f7ff' : '#fef9ec',
          borderRadius: 12, padding: '12px 14px', marginBottom: 16,
          border: `1px solid ${typeCommande === 'abidjan' ? '#dbeafe' : '#fde68a'}`
        }}>
          <p style={{ margin: 0, fontSize: 13, color: typeCommande === 'abidjan' ? '#3b82f6' : '#b45309', lineHeight: 1.5 }}>
            {typeCommande === 'abidjan'
              ? '🏙️ Livraison à Abidjan sous 24h. Le livreur vous contacte après confirmation.'
              : '📦 Expédition vers toute la Côte d\'Ivoire sous 48h. Paiement total requis avant envoi.'}
          </p>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #ece9e3', padding: '16px', marginBottom: 16 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: '#888', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Récapitulatif</h3>
          {variantes.map(v => (
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
            <span style={{ fontSize: 13, color: '#888' }}>{typeCommande === 'abidjan' ? 'Frais livraison' : 'Frais expédition'}</span>
            <span style={{ fontSize: 13, color: '#888' }}>{fraisLivraison.toLocaleString('fr-FR')} F</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>Total</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>{total.toLocaleString('fr-FR')} F</span>
          </div>
          {typeCommande === 'expedition' && (
            <div style={{ marginTop: 8, background: '#fef9ec', borderRadius: 8, padding: '8px 12px' }}>
              <p style={{ margin: 0, fontSize: 12, color: '#b45309', fontWeight: 600 }}>
                ⚠️ {total.toLocaleString('fr-FR')} F à payer avant expédition
              </p>
            </div>
          )}
        </div>

        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #ece9e3', padding: '16px', marginBottom: 16 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: '#888', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {typeCommande === 'abidjan' ? 'Infos de livraison' : "Infos d'expédition"}
          </h3>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#555', display: 'block', marginBottom: 6 }}>Téléphone *</label>
            <input type="tel" value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="Ex: 07 00 00 00 00"
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e5e2dc', fontSize: 15, color: '#1a1a1a', background: '#faf9f7', outline: 'none' }} />
          </div>
          {typeCommande === 'abidjan' ? (
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#555', display: 'block', marginBottom: 6 }}>Adresse de livraison *</label>
              <textarea value={adresse} onChange={e => setAdresse(e.target.value)} placeholder="Quartier, rue, description..." rows={3}
                style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e5e2dc', fontSize: 14, color: '#1a1a1a', background: '#faf9f7', outline: 'none', resize: 'vertical' }} />
            </div>
          ) : (
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#555', display: 'block', marginBottom: 6 }}>Ville d'expédition *</label>
              <input type="text" value={ville} onChange={e => setVille(e.target.value)} placeholder="Ex: Bouaké, San Pedro, Yamoussoukro..."
                style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e5e2dc', fontSize: 15, color: '#1a1a1a', background: '#faf9f7', outline: 'none' }} />
            </div>
          )}
        </div>

        {typeCommande === 'expedition' && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #ece9e3', padding: '16px', marginBottom: 20 }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: '#888', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              💳 Moyen de paiement *
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {MOYENS_PAIEMENT.map(m => (
                <button key={m.id} onClick={() => setMoyenPaiement(m.id)} style={{
                  padding: '12px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 14,
                  background: moyenPaiement === m.id ? m.color : '#faf9f7',
                  color: moyenPaiement === m.id ? '#fff' : '#555',
                  border: moyenPaiement === m.id ? `2px solid ${m.color}` : '2px solid #ece9e3',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <span>{m.icon}</span>
                  <span style={{ fontSize: 13 }}>{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '10px 14px', marginBottom: 16, border: '1px solid #bbf7d0' }}>
          <p style={{ margin: 0, fontSize: 12, color: '#065f46', lineHeight: 1.5 }}>
            🔔 Activez les notifications pour être informé du suivi de votre commande en temps réel.
          </p>
        </div>

        <button onClick={handleWhatsApp} disabled={loading}
          style={{ width: '100%', background: '#25D366', color: '#fff', border: 'none', borderRadius: 14, padding: '16px', fontSize: 16, fontWeight: 600, cursor: 'pointer', marginBottom: 12 }}>
          {loading ? 'Enregistrement...' : typeCommande === 'abidjan' ? '💬 Commander via WhatsApp' : "💬 Confirmer l'expédition via WhatsApp"}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 12px' }}>
          <div style={{ flex: 1, height: 1, background: '#ece9e3' }} />
          <span style={{ fontSize: 12, color: '#aaa' }}>ou</span>
          <div style={{ flex: 1, height: 1, background: '#ece9e3' }} />
        </div>

        <button onClick={handleValider} disabled={loading || !canSubmit}
          style={{ width: '100%', background: !canSubmit ? '#f0ece4' : '#1a1a1a', color: !canSubmit ? '#aaa' : '#fff', border: 'none', borderRadius: 14, padding: '16px', fontSize: 16, fontWeight: 600, cursor: !canSubmit ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Envoi...' : typeCommande === 'abidjan' ? 'Valider la commande en ligne' : "Valider l'expédition en ligne"}
        </button>
        <p style={{ textAlign: 'center', color: '#aaa', fontSize: 12, marginTop: 8 }}>
          {typeCommande === 'abidjan' ? '🏙️ Livraison Abidjan sous 24h' : '📦 Expédition sous 48h après paiement'}
        </p>
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