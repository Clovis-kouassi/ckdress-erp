'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const WHATSAPP_NUMBER = '2250565145493'
const FRAIS_LIVRAISON_ABIDJAN = 1500
const FRAIS_EXPEDITION = 3000

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
  const variantesRaw = (searchParams.get('variantes') || '').split(',').filter(Boolean); const variantesIds = variantesRaw.map(v => v.split(':')[0])

  const [produit, setProduit] = useState<any>(null)
  const [produitsMap, setProduitsMap] = useState<Record<string, any>>({})
  const [variantes, setVariantes] = useState<any[]>([])
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

  const quantiteParVariante = Object.fromEntries(variantesRaw.map(v => { const [id, qte] = v.split(':'); return [id, Number(qte) || 1] }))
  // Quantite par categorie (pour reductions quantite groupees)
  const qteParCategorie: Record<string, number> = {}
  variantes.forEach((v: any) => { const p = produitsMap[v.produit_id]; const cat = p?.categorie || ''; qteParCategorie[cat] = (qteParCategorie[cat] || 0) + (quantiteParVariante[v.id] || 1) })
  // Prix unitaire reduit par variante (selon son produit et sa categorie)
  const prixVariante = (v: any) => {
    const p = produitsMap[v.produit_id]
    if (!p) return 0
    const qteCat = qteParCategorie[p.categorie || ''] || 0
    return calculerPrixReduit(p, qteCat)
  }
  const sousTotal = variantes.reduce((sum: number, v: any) => sum + prixVariante(v) * (quantiteParVariante[v.id] || 1), 0)
  const total = sousTotal + fraisLivraison

  async function enregistrerCommande(via: 'whatsapp' | 'formulaire') {
    const ref = Math.random().toString(36).slice(2, 10).toUpperCase()
    // Grouper les variantes par produit (option B: une ligne de commande par produit)
    const variantesParProduit: Record<string, any[]> = {}
    variantes.forEach((v: any) => {
      if (!variantesParProduit[v.produit_id]) variantesParProduit[v.produit_id] = []
      variantesParProduit[v.produit_id].push(v)
    })
    let firstError: any = null
    for (const prodId of Object.keys(variantesParProduit)) {
      const prodVariantes = variantesParProduit[prodId]
      const p = produitsMap[prodId]
      const sousTotalProduit = prodVariantes.reduce((s: number, v: any) => s + prixVariante(v) * (quantiteParVariante[v.id] || 1), 0)
      const taillesProduit = Array.from(new Set(prodVariantes.map((v: any) => v.taille))).join(', ')
      const { error } = await supabase.from('commandes_catalogue').insert({
        telephone,
        adresse: typeCommande === 'expedition' ? `Ville: ${ville}` : adresse,
        produit_ref: p?.reference || produitRef,
        taille: taillesProduit,
        variantes: prodVariantes.map((v: any) => v.id).join(','),
        montant_total: sousTotalProduit,
        frais_livraison: 0,
        statut: 'nouveau', activite: 'succes_design',
        source: via,
        note: `REF: ${ref} | SUCCES DESIGN | Couleurs: ${prodVariantes.map((v: any) => v.couleur).join(', ')} | ${typeCommande === 'expedition' ? `EXPÉDITION ${ville} | Paiement: ${moyenPaiement}` : 'ABIDJAN'}`,
      })
      if (error && !firstError) firstError = error
    }
    const error = firstError
    const data = firstError ? null : true

    // Déduire le stock via RPC sécurisé
    if (data && !error) {
      for (const variante of variantes) {
        await supabase.rpc('deduire_stock', { stock_id: variante.id })
      }
    }

    return { ref, error }
  }

  function getWhatsappUrl(ref: string) {
    const lignes = variantes.map(v => `• ${produitsMap[v.produit_id]?.nom || produit?.nom} — Taille ${v.taille} — ${v.couleur}`)
    const moyenLabel = MOYENS_PAIEMENT.find(m => m.id === moyenPaiement)?.label || moyenPaiement
    if (typeCommande === 'expedition') {
      const msg = `Bonjour Succès Design 👋\n\n✨ COMMANDE #${ref}\n📦 EXPÉDITION vers ${ville}\n\n${lignes.join('\n')}\n\nSous-total : ${sousTotal.toLocaleString('fr-FR')} F\nFrais : ${fraisLivraison.toLocaleString('fr-FR')} F\n💰 TOTAL : ${total.toLocaleString('fr-FR')} F\n\n💳 Paiement : ${moyenLabel}\n📞 Téléphone : ${telephone}\n📍 Ville : ${ville}\n\n⚠️ Paiement requis avant expédition.`
      return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`
    } else {
      const msg = `Bonjour Succès Design 👋\n\n✨ COMMANDE #${ref}\n🏙️ LIVRAISON ABIDJAN\n\n${lignes.join('\n')}\n\nSous-total : ${sousTotal.toLocaleString('fr-FR')} F\nFrais : ${fraisLivraison.toLocaleString('fr-FR')} F\n💰 TOTAL : ${total.toLocaleString('fr-FR')} F\n\n📞 Téléphone : ${telephone}\n📍 Adresse : ${adresse}`
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

  const canSubmit = telephone && (typeCommande === 'abidjan' ? adresse : (ville && moyenPaiement))

  if (succes) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: 32, textAlign: 'center', background: '#faf9f7' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: '0 0 10px' }}>Commande enregistrée !</h2>
      <p style={{ color: '#666', fontSize: 15, maxWidth: 340, lineHeight: 1.6 }}>
        {typeCommande === 'abidjan'
          ? <>Votre commande est confirmée ! Nous vous contactons au <strong>{telephone}</strong> dans <strong>24h</strong>.</>
          : <>Votre demande d'expédition vers <strong>{ville}</strong> est enregistrée ! Nous vous contactons au <strong>{telephone}</strong> pour le paiement.</>}
      </p>
      <button onClick={() => router.push('/succes-design/catalogue')}
        style={{ marginTop: 28, background: '#d4a853', color: '#111', border: 'none', borderRadius: 12, padding: '14px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
        Retour au catalogue
      </button>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7', fontFamily: "'DM Sans', sans-serif", paddingBottom: 40 }}>
      <header style={{ background: '#1a1a1a', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 22, padding: 0 }}>←</button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={{ color: '#d4a853', fontSize: 16, fontWeight: 600 }}>✨ Succès Design — Commander</span>
        </div>
        <div style={{ width: 34 }} />
      </header>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px' }}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          <button onClick={() => setTypeCommande('abidjan')} style={{ padding: '14px', borderRadius: 12, cursor: 'pointer', fontWeight: 600, fontSize: 14, textAlign: 'center', background: typeCommande === 'abidjan' ? '#1a1a1a' : '#fff', color: typeCommande === 'abidjan' ? '#fff' : '#555', border: typeCommande === 'abidjan' ? '2px solid #1a1a1a' : '2px solid #ece9e3' }}>
            🏙️ Abidjan<br /><span style={{ fontSize: 11, fontWeight: 400, opacity: 0.8 }}>24h — {FRAIS_LIVRAISON_ABIDJAN.toLocaleString()} F</span>
          </button>
          <button onClick={() => setTypeCommande('expedition')} style={{ padding: '14px', borderRadius: 12, cursor: 'pointer', fontWeight: 600, fontSize: 14, textAlign: 'center', background: typeCommande === 'expedition' ? '#d4a853' : '#fff', color: typeCommande === 'expedition' ? '#111' : '#555', border: typeCommande === 'expedition' ? '2px solid #d4a853' : '2px solid #ece9e3' }}>
            📦 Expédition<br /><span style={{ fontSize: 11, fontWeight: 400, opacity: 0.8 }}>48h — {FRAIS_EXPEDITION.toLocaleString()} F</span>
          </button>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #ece9e3', padding: '16px', marginBottom: 16 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: '#888', margin: '0 0 12px', textTransform: 'uppercase' }}>Récapitulatif</h3>
          {variantes.map(v => (
            <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{produitsMap[v.produit_id]?.nom || produit?.nom}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#888' }}>Taille {v.taille} — {v.couleur}</p><p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>Quantite : {quantiteParVariante[v.id] || 1} x {prixVariante(v).toLocaleString('fr-FR')} F</p>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#d4a853' }}>{(prixVariante(v) * (quantiteParVariante[v.id] || 1)).toLocaleString('fr-FR')} F</span>
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
            <span style={{ fontSize: 16, fontWeight: 700 }}>Total</span>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{total.toLocaleString('fr-FR')} F</span>
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
          <h3 style={{ fontSize: 12, fontWeight: 600, color: '#888', margin: '0 0 16px', textTransform: 'uppercase' }}>
            {typeCommande === 'abidjan' ? 'Infos de livraison' : "Infos d'expédition"}
          </h3>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#555', display: 'block', marginBottom: 6 }}>Téléphone *</label>
            <input type="tel" value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="Ex: 07 00 00 00 00"
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e5e2dc', fontSize: 15, color: '#1a1a1a', background: '#faf9f7', outline: 'none' }} />
          </div>
          {typeCommande === 'abidjan' ? (
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#555', display: 'block', marginBottom: 6 }}>Adresse *</label>
              <textarea value={adresse} onChange={e => setAdresse(e.target.value)} placeholder="Quartier, rue..." rows={3}
                style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e5e2dc', fontSize: 14, color: '#1a1a1a', background: '#faf9f7', outline: 'none', resize: 'vertical' }} />
            </div>
          ) : (
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#555', display: 'block', marginBottom: 6 }}>Ville *</label>
              <input type="text" value={ville} onChange={e => setVille(e.target.value)} placeholder="Ex: Bouaké, Yamoussoukro..."
                style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e5e2dc', fontSize: 15, color: '#1a1a1a', background: '#faf9f7', outline: 'none' }} />
            </div>
          )}
        </div>

        {typeCommande === 'expedition' && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #ece9e3', padding: '16px', marginBottom: 20 }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: '#888', margin: '0 0 14px', textTransform: 'uppercase' }}>💳 Moyen de paiement *</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {MOYENS_PAIEMENT.map(m => (
                <button key={m.id} onClick={() => setMoyenPaiement(m.id)} style={{ padding: '12px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 14, background: moyenPaiement === m.id ? m.color : '#faf9f7', color: moyenPaiement === m.id ? '#fff' : '#555', border: moyenPaiement === m.id ? `2px solid ${m.color}` : '2px solid #ece9e3', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <span>{m.icon}</span><span style={{ fontSize: 13 }}>{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

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
          {loading ? 'Envoi...' : typeCommande === 'abidjan' ? 'Valider la commande' : "Valider l'expédition"}
        </button>
        <p style={{ textAlign: 'center', color: '#aaa', fontSize: 12, marginTop: 8 }}>
          {typeCommande === 'abidjan' ? '🏙️ Livraison Abidjan sous 24h' : '📦 Expédition sous 48h après paiement'}
        </p>
      </div>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
    </div>
  )
}

function calculerPrixReduit(produit: any, quantiteTotale: number): number {
  const prix = Number(produit.prix_vente) || 0
  if (!produit.reduction_type) return prix
  if (produit.reduction_type === 'fixe') return Math.max(0, prix - (produit.reduction_valeur || 0))
  if (produit.reduction_type === 'pourcentage') return Math.round(prix * (1 - (produit.reduction_valeur || 0) / 100))
  if (produit.reduction_type === 'quantite') {
    if (quantiteTotale < (produit.reduction_quantite_min || 1)) return prix
    return Math.max(0, produit.reduction_valeur || prix)
  }
  return prix
}

export default function SuccesCommandePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>Chargement…</div>}>
      <CommandeContent />
    </Suspense>
  )
}



