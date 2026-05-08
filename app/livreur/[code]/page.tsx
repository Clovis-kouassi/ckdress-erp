'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
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
  quantite: number
  quantite_livree?: number
  montant_livree?: number
  image_url?: string
  images?: { couleur: string; url: string }[]
}

type Livreur = {
  id: string
  nom: string
  telephone: string
  code: string
}

const ONGLETS = ['📦 Dispo', '🚚 Mes colis', '📊 Historique']

const MOTIFS_RETOUR = [
  { id: 'absent', label: '🏠 Client absent' },
  { id: 'injoignable', label: '📵 Client injoignable' },
  { id: 'refuse', label: '🚫 Client a refusé' },
  { id: 'adresse', label: '📍 Adresse introuvable' },
  { id: 'endommage', label: '📦 Colis endommagé' },
  { id: 'autre', label: '❓ Autre' },
]

export default function LivreurPage() {
  const params = useParams()
  const code = params?.code as string

  const [livreur, setLivreur] = useState<Livreur | null>(null)
  const [onglet, setOnglet] = useState(0)
  const [disponibles, setDisponibles] = useState<Commande[]>([])
  const [mesColis, setMesColis] = useState<Commande[]>([])
  const [historique, setHistorique] = useState<Commande[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [motifModal, setMotifModal] = useState<Commande | null>(null)
  const [motifChoisi, setMotifChoisi] = useState('')
  const [quantiteLivree, setQuantiteLivree] = useState(0)
  const [periode, setPeriode] = useState<'jour' | 'semaine' | 'mois'>('jour')

  useEffect(() => { if (code) fetchAll() }, [code])

  async function fetchAll() {
    setLoading(true)
    const { data: liv } = await supabase.from('livreurs').select('*').eq('code', code).single()
    if (!liv) { setLoading(false); return }
    setLivreur(liv)

    const [{ data: dispo }, { data: encours }, { data: hist }, { data: stockData }] = await Promise.all([
      supabase.from('commandes_catalogue').select('*').eq('statut', 'en_livraison').is('livreur_id', null).order('created_at', { ascending: false }),
      supabase.from('commandes_catalogue').select('*').eq('livreur_id', liv.id).eq('statut', 'en_livraison').order('created_at', { ascending: false }),
      supabase.from('commandes_catalogue').select('*').eq('livreur_id', liv.id).in('statut', ['livre', 'retour']).order('created_at', { ascending: false }),
      supabase.from('stock').select('produit_id, couleur, image_url, produits(reference)'),
    ])

    const enrichir = (cmds: any[]) => cmds.map(cmd => {
      const couleurs = (cmd.variantes || '').split(',').map((c: string) => c.trim()).filter(Boolean)
      const images = couleurs.map((couleur: string) => {
        const match = (stockData || []).find((s: any) =>
          s.produits?.reference === cmd.produit_ref &&
          s.couleur?.toLowerCase() === couleur.toLowerCase() &&
          s.image_url
        )
        return match ? { couleur, url: match.image_url } : null
      }).filter(Boolean) as { couleur: string; url: string }[]
      return { ...cmd, image_url: images[0]?.url || null, images }
    })

    setDisponibles(enrichir(dispo || []))
    setMesColis(enrichir(encours || []))
    setHistorique(enrichir(hist || []))
    setLoading(false)
  }

  async function accepterColis(commande: Commande) {
    if (!livreur) return
    setSaving(commande.id)
    const { error } = await supabase
      .from('commandes_catalogue')
      .update({ livreur_id: livreur.id })
      .eq('id', commande.id)
      .is('livreur_id', null)
    if (error) alert('Ce colis vient d\'être pris par un autre livreur !')
    await fetchAll()
    setSaving(null)
  }

  async function confirmerLivraison(commande: Commande) {
    setSaving(commande.id)
    await supabase.from('commandes_catalogue').update({
      statut: 'livre',
      quantite_livree: commande.quantite || 1,
      montant_livree: commande.montant_total,
    }).eq('id', commande.id)
    await fetchAll()
    setSaving(null)
  }

  function ouvrirRetour(cmd: Commande) {
    setMotifModal(cmd)
    setMotifChoisi('')
    setQuantiteLivree(0)
  }

  async function confirmerRetour() {
    if (!motifModal || !motifChoisi) return
    setSaving(motifModal.id)

    const qtteTotale = motifModal.quantite || 1
    const prixUnitaire = (motifModal.montant_total - motifModal.frais_livraison) / qtteTotale
    const montantLivre = quantiteLivree * prixUnitaire
    const fraisLivraison = quantiteLivree > 0 ? motifModal.frais_livraison : 0

    // Si livraison partielle → livré + retour partiel
    // Si 0 livré → retour total
    const statut = quantiteLivree > 0 ? 'livre' : 'retour'

    await supabase.from('commandes_catalogue').update({
      statut,
      motif_retour: motifChoisi,
      quantite_livree: quantiteLivree,
      montant_livree: montantLivre + fraisLivraison,
    }).eq('id', motifModal.id)

    setMotifModal(null)
    setMotifChoisi('')
    setQuantiteLivree(0)
    await fetchAll()
    setSaving(null)
  }

  const now = new Date()
  const statsCA = () => historique
    .filter(c => c.statut === 'livre')
    .filter(c => {
      const d = new Date(c.created_at)
      if (periode === 'jour') return d.toDateString() === now.toDateString()
      if (periode === 'semaine') return (now.getTime() - d.getTime()) / (1000 * 3600 * 24) <= 7
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((s, c) => s + (c.montant_livree || c.frais_livraison || 0), 0)

  const nbLivres = historique.filter(c => c.statut === 'livre').length
  const nbRetours = historique.filter(c => c.statut === 'retour').length

  // Calcul automatique dans le modal
  const qtteTotale = motifModal?.quantite || 1
  const prixUnitaire = motifModal ? (motifModal.montant_total - motifModal.frais_livraison) / qtteTotale : 0
  const montantEncaisse = quantiteLivree * prixUnitaire + (quantiteLivree > 0 ? (motifModal?.frais_livraison || 0) : 0)
  const montantRetour = motifModal ? motifModal.montant_total - montantEncaisse : 0

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontFamily: 'sans-serif', fontSize: 14 }}>
      Chargement...
    </div>
  )

  if (!livreur) return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontFamily: 'sans-serif' }}>
      ❌ Livreur introuvable
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: "'Inter', sans-serif", color: '#1a1a1a', maxWidth: 480, margin: '0 auto' }}>

      {/* MODAL RETOUR AMÉLIORÉ */}
      {motifModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '20px 20px 40px', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ width: 40, height: 4, background: '#e5e7eb', borderRadius: 2, margin: '0 auto 16px' }} />
            
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>Retour de colis</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#888' }}>
              #{motifModal.id.slice(0, 6).toUpperCase()} — {motifModal.nom_client || motifModal.telephone}
            </p>

            {/* MOTIF */}
            <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>Motif du retour *</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
              {MOTIFS_RETOUR.map(m => (
                <button key={m.id} onClick={() => setMotifChoisi(m.label)}
                  style={{
                    padding: '12px 8px', borderRadius: 10, border: `2px solid ${motifChoisi === m.label ? '#ef4444' : '#e5e7eb'}`,
                    background: motifChoisi === m.label ? '#fff0f0' : '#f8f9fa',
                    color: motifChoisi === m.label ? '#ef4444' : '#555',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'center'
                  }}>
                  {m.label}
                </button>
              ))}
            </div>

            {/* QUANTITÉ LIVRÉE */}
            <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>
              Quantité livrée (sur {qtteTotale})
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <button onClick={() => setQuantiteLivree(Math.max(0, quantiteLivree - 1))}
                style={{ width: 44, height: 44, borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#f8f9fa', fontSize: 20, cursor: 'pointer', fontWeight: 700, color: '#555' }}>
                −
              </button>
              <div style={{ flex: 1, textAlign: 'center', fontSize: 28, fontWeight: 700, color: '#1a1a1a' }}>
                {quantiteLivree}
              </div>
              <button onClick={() => setQuantiteLivree(Math.min(qtteTotale, quantiteLivree + 1))}
                style={{ width: 44, height: 44, borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#f8f9fa', fontSize: 20, cursor: 'pointer', fontWeight: 700, color: '#555' }}>
                +
              </button>
            </div>

            {/* RÉSUMÉ AUTOMATIQUE */}
            <div style={{ background: '#f8f9fa', borderRadius: 12, padding: '14px', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: '#888' }}>Total commande</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{motifModal.montant_total?.toLocaleString('fr-FR')} F</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ fontSize: 13, color: '#888' }}>Quantité retournée</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>{qtteTotale - quantiteLivree} article(s)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1D9E75' }}>💰 Montant encaissé</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1D9E75' }}>{montantEncaisse.toLocaleString('fr-FR')} F</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#ef4444' }}>📦 Montant retour</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#ef4444' }}>{montantRetour.toLocaleString('fr-FR')} F</span>
              </div>
            </div>

            {/* BOUTONS */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setMotifModal(null); setMotifChoisi(''); setQuantiteLivree(0) }}
                style={{ flex: 1, padding: '14px', borderRadius: 12, border: '1px solid #e5e7eb', background: 'transparent', color: '#888', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                Annuler
              </button>
              <button onClick={confirmerRetour} disabled={!motifChoisi || saving === motifModal.id}
                style={{ flex: 2, padding: '14px', borderRadius: 12, border: 'none', background: !motifChoisi ? '#e5e7eb' : '#ef4444', color: !motifChoisi ? '#888' : '#fff', cursor: !motifChoisi ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700 }}>
                {saving === motifModal.id ? '...' : 'Confirmer le retour'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)', padding: '20px 16px 16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#38bdf8' }}>🚚 {livreur.nom}</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>{livreur.code} • {livreur.telephone}</p>
          </div>
          <button onClick={fetchAll}
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, color: '#fff', padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
            ↺
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {[
            { label: 'Disponibles', value: disponibles.length, color: '#38bdf8' },
            { label: 'En cours', value: mesColis.length, color: '#f59e0b' },
            { label: 'Livrés', value: nbLivres, color: '#1D9E75' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ONGLETS */}
      <div style={{ display: 'flex', background: '#fff', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 130, zIndex: 9 }}>
        {ONGLETS.map((o, i) => (
          <button key={i} onClick={() => setOnglet(i)}
            style={{
              flex: 1, padding: '14px 4px', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
              background: 'transparent', color: onglet === i ? '#38bdf8' : '#aaa',
              borderBottom: onglet === i ? '3px solid #38bdf8' : '3px solid transparent'
            }}>
            {o}
          </button>
        ))}
      </div>

      <div style={{ padding: '12px 12px 80px' }}>

        {/* ONGLET 1 — DISPONIBLES */}
        {onglet === 0 && (
          <div>
            {disponibles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: '#ccc' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
                <p style={{ fontSize: 15, fontWeight: 600 }}>Aucun colis disponible</p>
                <p style={{ fontSize: 13, marginTop: 4 }}>Revenez plus tard</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {disponibles.map(cmd => (
                  <div key={cmd.id} style={{ background: '#fff', borderRadius: 14, padding: 14, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                      <div style={{ width: 64, height: 64, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {cmd.image_url
                          ? <img src={cmd.image_url} alt=" " style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ fontSize: 24, opacity: 0.3 }}>👗</span>
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', background: '#eff6ff', padding: '2px 8px', borderRadius: 20 }}>
                            #{cmd.id.slice(0, 6).toUpperCase()}
                          </span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#1D9E75' }}>{cmd.frais_livraison?.toLocaleString('fr-FR')} F</span>
                        </div>
                        <p style={{ margin: '0 0 3px', fontSize: 13, color: '#555' }}>📞 {cmd.telephone}</p>
                        <p style={{ margin: '0 0 3px', fontSize: 12, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {cmd.adresse}</p>
                        <p style={{ margin: 0, fontSize: 11, color: '#aaa' }}>🛍️ {cmd.produit_ref} — {cmd.taille}</p>
                      </div>
                    </div>
                    <button onClick={() => accepterColis(cmd)} disabled={saving === cmd.id}
                      style={{
                        width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                        background: saving === cmd.id ? '#e5e7eb' : '#1D9E75',
                        color: saving === cmd.id ? '#888' : '#fff', fontWeight: 700, fontSize: 15,
                        cursor: saving === cmd.id ? 'not-allowed' : 'pointer'
                      }}>
                      {saving === cmd.id ? '...' : '✅ Accepter ce colis'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ONGLET 2 — MES COLIS */}
        {onglet === 1 && (
          <div>
            {mesColis.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: '#ccc' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🚚</div>
                <p style={{ fontSize: 15, fontWeight: 600 }}>Aucun colis en cours</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {mesColis.map(cmd => (
                  <div key={cmd.id} style={{ background: '#fff', borderRadius: 16, border: '1px solid #fde68a', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>

                    {cmd.images && cmd.images.filter(img => img.url).length > 0 && (
                      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '10px 12px 6px', background: '#fffbf0' }}>
                        {cmd.images.filter(img => img.url).map((img, i) => (
                          <div key={i} style={{ flexShrink: 0, borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
                            <img src={img.url} alt=" "
                              style={{ width: cmd.images!.filter(img => img.url).length === 1 ? 220 : 140, height: 160, objectFit: 'cover', display: 'block' }} />
                            <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20 }}>
                              {img.couleur}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', background: '#fff8e6', padding: '4px 12px', borderRadius: 20, border: '1px solid #fde68a' }}>
                          #{cmd.id.slice(0, 6).toUpperCase()}
                        </span>
                        <span style={{ fontSize: 11, color: '#aaa' }}>
                          {new Date(cmd.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>{cmd.nom_client || '—'}</p>

                      <div style={{ background: '#f8f9fa', borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
                        <p style={{ margin: '0 0 4px', fontSize: 13, color: '#555' }}>🛍️ <strong>{cmd.produit_ref}</strong> — Taille {cmd.taille}</p>
                        <p style={{ margin: '0 0 4px', fontSize: 13, color: '#555' }}>🎨 {cmd.variantes}</p>
                        {cmd.quantite > 1 && <p style={{ margin: '0', fontSize: 13, color: '#555' }}>📦 Quantité : <strong>{cmd.quantite}</strong></p>}
                        {cmd.note && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#aaa' }}>📝 {cmd.note}</p>}
                      </div>

                      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                        <div style={{ flex: 1, background: '#f8f9fa', borderRadius: 10, padding: '10px', textAlign: 'center' }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{cmd.montant_total?.toLocaleString('fr-FR')} F</div>
                          <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>Total commande</div>
                        </div>
                        <div style={{ flex: 1, background: '#f0fdf4', borderRadius: 10, padding: '10px', textAlign: 'center' }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#1D9E75' }}>{cmd.frais_livraison?.toLocaleString('fr-FR')} F</div>
                          <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>Mes frais</div>
                        </div>
                      </div>

                      <p style={{ margin: '0 0 14px', fontSize: 13, color: '#555' }}>📍 {cmd.adresse}</p>

                      <button onClick={() => confirmerLivraison(cmd)} disabled={saving === cmd.id}
                        style={{
                          width: '100%', padding: '15px', borderRadius: 12, border: 'none', marginBottom: 8,
                          background: saving === cmd.id ? '#e5e7eb' : '#1D9E75',
                          color: saving === cmd.id ? '#888' : '#fff', fontWeight: 700, fontSize: 15, cursor: saving === cmd.id ? 'not-allowed' : 'pointer'
                        }}>
                        {saving === cmd.id ? '...' : '✅ Confirmer la livraison'}
                      </button>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <a href={`tel:${cmd.telephone}`}
                          style={{
                            flex: 1, padding: '13px', borderRadius: 12, border: '1.5px solid #38bdf8',
                            background: '#eff6ff', color: '#38bdf8', fontWeight: 700, fontSize: 14,
                            textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                          }}>
                          📞 Appeler
                        </a>
                        <button onClick={() => ouvrirRetour(cmd)} disabled={saving === cmd.id}
                          style={{
                            flex: 1, padding: '13px', borderRadius: 12, border: '1.5px solid #ef4444',
                            background: '#fff0f0', color: '#ef4444', fontWeight: 700, fontSize: 14, cursor: 'pointer'
                          }}>
                          ❌ Retour
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ONGLET 3 — HISTORIQUE */}
        {onglet === 2 && (
          <div>
            <div style={{ background: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 14, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>💰 Chiffre d'affaires</h3>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {(['jour', 'semaine', 'mois'] as const).map(p => (
                  <button key={p} onClick={() => setPeriode(p)}
                    style={{
                      flex: 1, padding: '10px 4px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                      background: periode === p ? '#38bdf8' : '#f0f2f5',
                      color: periode === p ? '#fff' : '#888'
                    }}>
                    {p === 'jour' ? 'Jour' : p === 'semaine' ? '7 jours' : 'Mois'}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#1D9E75', textAlign: 'center', marginBottom: 16 }}>
                {statsCA().toLocaleString('fr-FR')} F
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1, background: '#f0fdf4', borderRadius: 12, padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#1D9E75' }}>{nbLivres}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>✅ Livrés</div>
                </div>
                <div style={{ flex: 1, background: '#fff0f0', borderRadius: 12, padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444' }}>{nbRetours}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>❌ Retours</div>
                </div>
              </div>
            </div>

            {historique.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#ccc' }}>
                <p style={{ fontSize: 15 }}>Aucun historique</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {historique.map(cmd => (
                  <div key={cmd.id} style={{
                    background: '#fff', borderRadius: 14, padding: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    border: `1px solid ${cmd.statut === 'livre' ? '#bbf7d0' : '#fecaca'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: cmd.statut === 'livre' ? '#1D9E75' : '#ef4444', background: cmd.statut === 'livre' ? '#f0fdf4' : '#fff0f0', padding: '3px 10px', borderRadius: 20 }}>
                        {cmd.statut === 'livre' ? '✅ Livré' : '❌ Retour'}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#1D9E75' }}>
                        +{(cmd.montant_livree || cmd.frais_livraison || 0).toLocaleString('fr-FR')} F
                      </span>
                    </div>
                    <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{cmd.nom_client || '—'}</p>
                    <p style={{ margin: '0 0 4px', fontSize: 12, color: '#888' }}>📍 {cmd.adresse}</p>
                    {cmd.quantite_livree !== undefined && cmd.quantite > 1 && (
                      <p style={{ margin: '0 0 4px', fontSize: 12, color: '#888' }}>
                        📦 {cmd.quantite_livree}/{cmd.quantite} articles livrés
                      </p>
                    )}
                    {cmd.motif_retour && (
                      <p style={{ margin: '6px 0 0', fontSize: 12, color: '#ef4444', background: '#fff0f0', padding: '6px 10px', borderRadius: 8 }}>
                        Motif : {cmd.motif_retour}
                      </p>
                    )}
                    <p style={{ margin: '6px 0 0', fontSize: 11, color: '#ccc' }}>
                      {new Date(cmd.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}