'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

type Commande = {
  id: string; telephone: string; adresse: string; produit_ref: string; taille: string
  variantes: string; montant_total: number; frais_livraison: number; statut: string
  source: string; nom_client: string; note: string; created_at: string; livreur_id?: string
  image_url?: string; images?: { couleur: string; url: string }[]; activite?: string
}
type Livreur = { id: string; nom: string; code: string }

const STATUTS = [
  { key: 'nouveau', label: '🆕 Nouvelles', color: '#E24B4A', bg: '#fff0f0', border: '#fecaca' },
  { key: 'en_preparation', label: '📦 En préparation', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  { key: 'en_livraison', label: '🚚 En livraison', color: '#BA7517', bg: '#fff8e6', border: '#fde68a' },
  { key: 'livre', label: '✅ Livrées', color: '#1D9E75', bg: '#f0fdf4', border: '#bbf7d0' },
]

const STATUTS_SUIVANTS: Record<string, { key: string; label: string; color: string }> = {
  nouveau: { key: 'en_preparation', label: '📦 Mettre en préparation', color: '#7c3aed' },
  en_preparation: { key: 'en_livraison', label: '🚚 Envoyer en livraison', color: '#BA7517' },
  en_livraison: { key: 'livre', label: '✅ Confirmer livraison', color: '#1D9E75' },
}

export default function CommandesPage() {
  const [commandes, setCommandes] = useState<Commande[]>([])
  const [livreurs, setLivreurs] = useState<Livreur[]>([])
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState('')
  const [commandeDetail, setCommandeDetail] = useState<Commande | null>(null)
  const [livreurChoisi, setLivreurChoisi] = useState('')
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('ck_user') || '{}')
    setUser(u)
    fetchData(u)
  }, [])

  async function fetchData(u?: any) {
    setLoading(true)
    const currentUser = u || user

    // Filtre selon activité
    const isGlobal = !currentUser?.activite || currentUser.activite === 'ck_dress'

    let cmdsQuery = supabase
      .from('commandes_catalogue')
      .select('*')
      .neq('statut', 'annule')
      .order('created_at', { ascending: false })

    if (!isGlobal) {
      cmdsQuery = cmdsQuery.eq('activite', currentUser.activite)
    }

    const [{ data: cmds }, { data: livs }, { data: stockData }] = await Promise.all([
      cmdsQuery,
      supabase.from('livreurs').select('*').eq('actif', true).order('nom'),
      supabase.from('boutique_stock').select('produit_id, couleur, image_url, produits(reference)'),
    ])

    const commandesAvecImages = (cmds || []).map(cmd => {
      const couleurs = (cmd.variantes || '').split(',').map((c: string) => c.trim()).filter(Boolean)
      const images = couleurs.map((couleur: string) => {
        const match = (stockData || []).find((s: any) =>
          s.produits?.reference === cmd.produit_ref &&
          s.couleur?.toLowerCase() === couleur.toLowerCase() &&
          s.image_url
        )
        return match ? { couleur, url: match.image_url } : null
      }).filter(Boolean) as { couleur: string; url: string }[]

      return {
        ...cmd,
        image_url: images[0]?.url || null,
        images,
      }
    })

    setCommandes(commandesAvecImages)
    setLivreurs(livs || [])
    setLoading(false)
  }

  async function changerStatut(id: string, statut: string, livreurId?: string) {
    setSaving(true)
    const update: any = { statut }
    if (livreurId) update.livreur_id = livreurId
    await supabase.from('commandes_catalogue').update(update).eq('id', id)
    setSuccess('✅ Statut mis à jour !')
    setTimeout(() => setSuccess(''), 2000)
    await fetchData()
    if (commandeDetail?.id === id) {
      setCommandeDetail(prev => prev ? { ...prev, statut, livreur_id: livreurId || prev.livreur_id } : null)
    }
    setSaving(false)
  }

  async function annulerCommande(id: string) {
    if (!confirm('Annuler cette commande ?')) return
    await supabase.from('commandes_catalogue').update({ statut: 'annule' }).eq('id', id)
    setCommandeDetail(null)
    setSuccess('❌ Commande annulée')
    setTimeout(() => setSuccess(''), 2000)
    fetchData()
  }

  const getLivreurNom = (id?: string) => livreurs.find(l => l.id === id)?.nom || null

  const stats = {
    total: commandes.length,
    nouveau: commandes.filter(c => c.statut === 'nouveau').length,
    en_preparation: commandes.filter(c => c.statut === 'en_preparation').length,
    en_livraison: commandes.filter(c => c.statut === 'en_livraison').length,
    livre: commandes.filter(c => c.statut === 'livre').length,
    ca: commandes.filter(c => c.statut === 'livre').reduce((s, c) => s + (c.montant_total || 0), 0),
  }

  const ouvrirDetail = (cmd: Commande) => {
    setCommandeDetail(cmd)
    setLivreurChoisi(cmd.livreur_id || '')
  }

  const isGlobal = !user?.activite || user?.activite === 'ck_dress'

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: "'Inter', sans-serif", color: '#1a1a1a' }}>

      {commandeDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setCommandeDetail(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 500, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Commande #{commandeDetail.id.slice(0, 6).toUpperCase()}</h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#888' }}>
                  {new Date(commandeDetail.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button onClick={() => setCommandeDetail(null)}
                style={{ background: '#f0f0f0', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>

            {(() => {
              const s = STATUTS.find(s => s.key === commandeDetail.statut)
              return s ? (
                <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.label}</span>
                  {isGlobal && commandeDetail.activite && (
                    <span style={{ marginLeft: 10, fontSize: 11, color: '#888' }}>
                      {commandeDetail.activite === 'ck_design' ? '🎨 CK Design' : '✨ Succès Design'}
                    </span>
                  )}
                </div>
              ) : null
            })()}

            {commandeDetail.images && commandeDetail.images.length > 0 ? (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                  {commandeDetail.images.map((img, i) => (
                    <div key={i} style={{ flexShrink: 0, borderRadius: 10, overflow: 'hidden', border: '1px solid #e5e7eb', position: 'relative' }}>
                      <img src={img.url} alt={img.couleur}
                        style={{ width: commandeDetail.images!.length === 1 ? '100%' : 160, height: 180, objectFit: 'cover', display: 'block' }}
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                      <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>
                        {img.couleur}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 14, borderRadius: 12, border: '1px solid #e5e7eb', height: 120, background: 'linear-gradient(135deg, #f0ece4, #e8e1d5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, opacity: 0.3 }}>
                👗
              </div>
            )}

            <div style={{ background: '#f8f9fa', borderRadius: 12, padding: 16, marginBottom: 14 }}>
              <h4 style={{ margin: '0 0 10px', fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>Infos client</h4>
              <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 600 }}>{commandeDetail.nom_client || '—'}</p>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: '#555' }}>📞 {commandeDetail.telephone}</p>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: '#555' }}>📍 {commandeDetail.adresse}</p>
            </div>

            <div style={{ background: '#f8f9fa', borderRadius: 12, padding: 16, marginBottom: 14 }}>
              <h4 style={{ margin: '0 0 10px', fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>Détails commande</h4>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: '#555' }}>🛍️ Réf: <strong>{commandeDetail.produit_ref}</strong> — Taille {commandeDetail.taille}</p>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: '#555' }}>🎨 Variantes: {commandeDetail.variantes}</p>
              {commandeDetail.note && <p style={{ margin: '0 0 4px', fontSize: 12, color: '#aaa' }}>📝 {commandeDetail.note}</p>}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid #e5e7eb' }}>
                <span style={{ fontSize: 13, color: '#888' }}>Frais livraison</span>
                <span style={{ fontSize: 13, color: '#888' }}>{commandeDetail.frais_livraison?.toLocaleString('fr-FR')} F</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>Total</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#1D9E75' }}>{commandeDetail.montant_total?.toLocaleString('fr-FR')} F</span>
              </div>
            </div>

            {commandeDetail.livreur_id && (
              <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '10px 14px', marginBottom: 14, border: '1px solid #bbf7d0' }}>
                <p style={{ margin: 0, fontSize: 13, color: '#1D9E75', fontWeight: 600 }}>
                  🚚 Livreur assigné : {getLivreurNom(commandeDetail.livreur_id)}
                </p>
              </div>
            )}

            {STATUTS_SUIVANTS[commandeDetail.statut] && (
              <div style={{ marginBottom: 14 }}>
                <h4 style={{ margin: '0 0 10px', fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>Changer le statut</h4>

                {commandeDetail.statut === 'en_preparation' && (
                  <div style={{ marginBottom: 12 }}>
                    <button onClick={() => changerStatut(commandeDetail.id, 'en_livraison')} disabled={saving}
                      style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, background: saving ? '#aaa' : '#BA7517', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', marginBottom: 10 }}>
                      {saving ? '...' : '🚚 Envoyer en livraison'}
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
                      <span style={{ fontSize: 11, color: '#aaa', fontWeight: 500 }}>ou assigner à un livreur spécifique</span>
                      <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
                    </div>
                    <select value={livreurChoisi} onChange={e => setLivreurChoisi(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1.5px solid #e5e5e5', background: '#f8f9fa', color: '#1a1a1a', fontSize: 13, outline: 'none', marginBottom: 8 }}>
                      <option value="">Choisir un livreur... (optionnel)</option>
                      {livreurs.map(l => <option key={l.id} value={l.id}>{l.nom} ({l.code})</option>)}
                    </select>
                    {livreurChoisi && (
                      <button onClick={() => changerStatut(commandeDetail.id, 'en_livraison', livreurChoisi)} disabled={saving}
                        style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1.5px solid #BA7517', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13, background: '#fff8e6', color: '#BA7517' }}>
                        {saving ? '...' : `🎯 Assigner à ${livreurs.find(l => l.id === livreurChoisi)?.nom}`}
                      </button>
                    )}
                  </div>
                )}

                {commandeDetail.statut !== 'en_preparation' && (
                  <button onClick={() => changerStatut(commandeDetail.id, STATUTS_SUIVANTS[commandeDetail.statut].key)} disabled={saving}
                    style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, background: saving ? '#aaa' : STATUTS_SUIVANTS[commandeDetail.statut].color, color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                    {saving ? '...' : STATUTS_SUIVANTS[commandeDetail.statut].label}
                  </button>
                )}
              </div>
            )}

            {commandeDetail.statut === 'livre' && (
              <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '12px 14px', marginBottom: 14, textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 14, color: '#1D9E75', fontWeight: 700 }}>✅ Commande livrée avec succès !</p>
              </div>
            )}

            {commandeDetail.statut !== 'livre' && (
              <button onClick={() => annulerCommande(commandeDetail.id)}
                style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1.5px solid #fecaca', background: '#fff0f0', color: '#E24B4A', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                ❌ Annuler la commande
              </button>
            )}
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1 style={{ color: '#38bdf8', margin: 0, fontSize: '16px', fontWeight: 700 }}>📋 Commandes</h1>
          {!isGlobal && (
            <span style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 600 }}>
              {user?.activite === 'ck_design' ? '🎨 CK Design' : '✨ Succès Design'}
            </span>
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'Dashboard', path: '/dashboard' },
              { label: 'Commandes', path: '/commandes' },
              { label: 'Livraisons', path: '/livraisons' },
            ].map(nav => (
              <a key={nav.path} href={nav.path} style={{ color: nav.path === '/commandes' ? '#38bdf8' : '#94a3b8', fontSize: '12px', textDecoration: 'none', fontWeight: nav.path === '/commandes' ? 600 : 400 }}>
                {nav.label}
              </a>
            ))}
          </div>
        </div>
        <button onClick={() => fetchData()} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#94a3b8', padding: '6px 12px', fontSize: '11px', cursor: 'pointer' }}>
          ↺ Actualiser
        </button>
      </div>

      <div style={{ padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Total', value: stats.total, color: '#1a1a1a', bg: '#fff' },
            { label: 'Nouvelles', value: stats.nouveau, color: '#E24B4A', bg: '#fff0f0' },
            { label: 'Préparation', value: stats.en_preparation, color: '#7c3aed', bg: '#f5f3ff' },
            { label: 'En livraison', value: stats.en_livraison, color: '#BA7517', bg: '#fff8e6' },
            { label: 'Livrées', value: stats.livre, color: '#1D9E75', bg: '#f0fdf4' },
            { label: 'CA livré', value: stats.ca.toLocaleString('fr-FR') + ' F', color: '#1D9E75', bg: '#f0fdf4' },
          ].map((k, i) => (
            <div key={i} style={{ background: k.bg, border: '1px solid #e5e7eb', borderRadius: '12px', padding: '12px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 600 }}>{k.label}</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        {success && (
          <div style={{ background: '#f0fdf4', border: '1px solid #1D9E75', borderRadius: '10px', padding: '10px 16px', color: '#1D9E75', fontSize: '13px', marginBottom: '14px', fontWeight: 600 }}>
            {success}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', color: '#aaa', padding: '60px' }}>Chargement...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {STATUTS.map(statut => {
              const cmds = commandes.filter(c => c.statut === statut.key)
              return (
                <div key={statut.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: statut.color }}>{statut.label}</span>
                      <span style={{ background: statut.bg, border: `1px solid ${statut.border}`, color: statut.color, fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 20 }}>
                        {cmds.length}
                      </span>
                    </div>
                    {cmds.length > 4 && (
                      <button style={{ background: 'none', border: `1px solid ${statut.color}`, color: statut.color, borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        Voir tout →
                      </button>
                    )}
                  </div>

                  {cmds.length === 0 ? (
                    <div style={{ background: '#fff', borderRadius: 12, padding: '20px', textAlign: 'center', color: '#ccc', fontSize: 13, border: '1px solid #e5e7eb' }}>
                      Aucune commande
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
                      {cmds.map(cmd => (
                        <div key={cmd.id} onClick={() => ouvrirDetail(cmd)}
                          style={{ background: '#fff', borderRadius: 14, padding: 0, minWidth: 200, maxWidth: 200, border: `1.5px solid ${statut.border}`, cursor: 'pointer', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', transition: 'transform 0.1s', overflow: 'hidden' }}
                          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
                          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>

                          {cmd.image_url ? (
                            <img src={cmd.image_url} alt={cmd.produit_ref}
                              style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }}
                              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                          ) : (
                            <div style={{ width: '100%', height: 110, background: 'linear-gradient(135deg, #f0ece4, #e8e1d5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, opacity: 0.3 }}>
                              👗
                            </div>
                          )}

                          <div style={{ padding: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: statut.color, background: statut.bg, padding: '2px 8px', borderRadius: 20 }}>
                                #{cmd.id.slice(0, 6).toUpperCase()}
                              </span>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#1D9E75' }}>
                                {cmd.montant_total?.toLocaleString('fr-FR')} F
                              </span>
                            </div>

                            {/* Badge activité visible uniquement en vue globale */}
                            {isGlobal && cmd.activite && (
                              <span style={{ fontSize: 10, background: '#f0f0f0', color: '#888', padding: '1px 7px', borderRadius: 20, marginBottom: 6, display: 'inline-block' }}>
                                {cmd.activite === 'ck_design' ? '🎨 CK Design' : '✨ Succès Design'}
                              </span>
                            )}

                            <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {cmd.nom_client || '—'}
                            </p>
                            <p style={{ margin: '0 0 3px', fontSize: 11, color: '#888' }}>📞 {cmd.telephone}</p>
                            <p style={{ margin: '0 0 3px', fontSize: 11, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              📍 {cmd.adresse}
                            </p>
                            <p style={{ margin: '0 0 8px', fontSize: 11, color: '#aaa' }}>
                              🛍️ {cmd.produit_ref} — {cmd.taille}
                            </p>
                            {cmd.livreur_id && (
                              <p style={{ margin: '0 0 8px', fontSize: 11, color: '#1D9E75', fontWeight: 600 }}>
                                🚚 {getLivreurNom(cmd.livreur_id)}
                              </p>
                            )}
                            <p style={{ margin: 0, fontSize: 10, color: '#ccc' }}>
                              {new Date(cmd.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}

                      {cmds.length > 4 && (
                        <div style={{ minWidth: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <button style={{ background: statut.bg, border: `1.5px solid ${statut.border}`, color: statut.color, borderRadius: '50%', width: 44, height: 44, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                            →
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}