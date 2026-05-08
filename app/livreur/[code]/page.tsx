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
}

type Livreur = {
  id: string
  nom: string
  telephone: string
  code: string
}

const ONGLETS = ['📦 Disponibles', '🚚 Mes colis', '📊 Historique']

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
  const [motif, setMotif] = useState('')
  const [periode, setPeriode] = useState<'jour' | 'semaine' | 'mois'>('jour')

  useEffect(() => { if (code) fetchAll() }, [code])

  async function fetchAll() {
    setLoading(true)

    const { data: liv } = await supabase
      .from('livreurs')
      .select('*')
      .eq('code', code)
      .single()

    if (!liv) { setLoading(false); return }
    setLivreur(liv)

    const { data: dispo } = await supabase
      .from('commandes_catalogue')
      .select('*')
      .eq('statut', 'en_livraison')
      .is('livreur_id', null)
      .order('created_at', { ascending: false })

    const { data: encours } = await supabase
      .from('commandes_catalogue')
      .select('*')
      .eq('livreur_id', liv.id)
      .eq('statut', 'en_livraison')
      .order('created_at', { ascending: false })

    const { data: hist } = await supabase
      .from('commandes_catalogue')
      .select('*')
      .eq('livreur_id', liv.id)
      .in('statut', ['livre', 'retour'])
      .order('created_at', { ascending: false })

    setDisponibles(dispo || [])
    setMesColis(encours || [])
    setHistorique(hist || [])
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
    await supabase
      .from('commandes_catalogue')
      .update({ statut: 'livre' })
      .eq('id', commande.id)
    await fetchAll()
    setSaving(null)
  }

  async function confirmerRetour() {
    if (!motifModal) return
    setSaving(motifModal.id)
    await supabase
      .from('commandes_catalogue')
      .update({ statut: 'retour', motif_retour: motif })
      .eq('id', motifModal.id)
    setMotifModal(null)
    setMotif('')
    await fetchAll()
    setSaving(null)
  }

  const now = new Date()
  const statsCA = () => {
    return historique
      .filter(c => c.statut === 'livre')
      .filter(c => {
        const d = new Date(c.created_at)
        if (periode === 'jour') return d.toDateString() === now.toDateString()
        if (periode === 'semaine') return (now.getTime() - d.getTime()) / (1000 * 3600 * 24) <= 7
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
      .reduce((s, c) => s + (c.frais_livraison || 0), 0)
  }

  const nbLivres = historique.filter(c => c.statut === 'livre').length
  const nbRetours = historique.filter(c => c.statut === 'retour').length

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontFamily: 'sans-serif' }}>
      Chargement...
    </div>
  )

  if (!livreur) return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontFamily: 'sans-serif' }}>
      ❌ Livreur introuvable
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', fontFamily: "'Inter', sans-serif", color: '#f1f5f9' }}>

      {motifModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#1e293b', borderRadius: 16, padding: 24, maxWidth: 400, width: '100%', border: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>❌ Motif de retour</h3>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#94a3b8' }}>
              Commande #{motifModal.id.slice(0, 6).toUpperCase()} — {motifModal.nom_client || motifModal.telephone}
            </p>
            <textarea
              value={motif}
              onChange={e => setMotif(e.target.value)}
              placeholder="Ex: Client absent, adresse incorrecte, client a refusé..."
              rows={3}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 13, outline: 'none', resize: 'vertical', marginBottom: 14 }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setMotifModal(null); setMotif('') }}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>
                Annuler
              </button>
              <button onClick={confirmerRetour} disabled={!motif || saving === motifModal.id}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: !motif ? '#334155' : '#ef4444', color: '#fff', cursor: !motif ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
                {saving === motifModal.id ? '...' : 'Confirmer retour'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', padding: '16px 20px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#38bdf8' }}>🚚 {livreur.nom}</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>{livreur.code} • {livreur.telephone}</p>
          </div>
          <button onClick={fetchAll}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, color: '#64748b', padding: '6px 12px', fontSize: 11, cursor: 'pointer' }}>
            ↺ Actualiser
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 14 }}>
          {[
            { label: 'Disponibles', value: disponibles.length, color: '#38bdf8' },
            { label: 'En cours', value: mesColis.length, color: '#f59e0b' },
            { label: 'Livrés', value: nbLivres, color: '#1D9E75' },
          ].map((s, i) => (
            <div key={i} style={{ background: '#1e293b', borderRadius: 10, padding: '10px 12px', textAlign: 'center', border: '1px solid #334155' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #1e293b', background: '#0f172a' }}>
        {ONGLETS.map((o, i) => (
          <button key={i} onClick={() => setOnglet(i)}
            style={{
              flex: 1, padding: '12px 8px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: 'transparent',
              color: onglet === i ? '#38bdf8' : '#64748b',
              borderBottom: onglet === i ? '2px solid #38bdf8' : '2px solid transparent'
            }}>
            {o}
          </button>
        ))}
      </div>

      <div style={{ padding: 16 }}>

        {onglet === 0 && (
          <div>
            {disponibles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#334155' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
                <p style={{ fontSize: 14 }}>Aucun colis disponible</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {disponibles.map(cmd => (
                  <div key={cmd.id} style={{ background: '#1e293b', borderRadius: 14, padding: 16, border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', background: '#0f2744', padding: '3px 10px', borderRadius: 20 }}>
                        #{cmd.id.slice(0, 6).toUpperCase()}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#1D9E75' }}>
                        {cmd.frais_livraison?.toLocaleString('fr-FR')} F
                      </span>
                    </div>
                    <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{cmd.nom_client || '—'}</p>
                    <p style={{ margin: '0 0 4px', fontSize: 12, color: '#94a3b8' }}>📞 {cmd.telephone}</p>
                    <p style={{ margin: '0 0 4px', fontSize: 12, color: '#94a3b8' }}>📍 {cmd.adresse}</p>
                    <p style={{ margin: '0 0 12px', fontSize: 11, color: '#475569' }}>🛍️ {cmd.produit_ref} — {cmd.taille} — {cmd.variantes}</p>
                    <button
                      onClick={() => accepterColis(cmd)}
                      disabled={saving === cmd.id}
                      style={{
                        width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                        background: saving === cmd.id ? '#334155' : '#1D9E75',
                        color: '#fff', fontWeight: 700, fontSize: 14, cursor: saving === cmd.id ? 'not-allowed' : 'pointer'
                      }}>
                      {saving === cmd.id ? '...' : '✅ Accepter ce colis'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {onglet === 1 && (
          <div>
            {mesColis.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#334155' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🚚</div>
                <p style={{ fontSize: 14 }}>Aucun colis en cours</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {mesColis.map(cmd => (
                  <div key={cmd.id} style={{ background: '#1e293b', borderRadius: 14, padding: 16, border: '1px solid #f59e0b44' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', background: '#2a1f00', padding: '3px 10px', borderRadius: 20 }}>
                        #{cmd.id.slice(0, 6).toUpperCase()}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#1D9E75' }}>
                        {cmd.frais_livraison?.toLocaleString('fr-FR')} F
                      </span>
                    </div>
                    <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{cmd.nom_client || '—'}</p>
                    <p style={{ margin: '0 0 4px', fontSize: 12, color: '#94a3b8' }}>📍 {cmd.adresse}</p>
                    <p style={{ margin: '0 0 12px', fontSize: 11, color: '#475569' }}>🛍️ {cmd.produit_ref} — {cmd.taille} — {cmd.variantes}</p>

                    {/* 3 BOUTONS : LIVRÉ — APPELER — RETOUR */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => confirmerLivraison(cmd)}
                        disabled={saving === cmd.id}
                        style={{
                          flex: 1, padding: '11px', borderRadius: 10, border: 'none',
                          background: saving === cmd.id ? '#334155' : '#1D9E75',
                          color: '#fff', fontWeight: 700, fontSize: 13, cursor: saving === cmd.id ? 'not-allowed' : 'pointer'
                        }}>
                        {saving === cmd.id ? '...' : '✅ Livré'}
                      </button>
                      <a href={`tel:${cmd.telephone}`}
                        style={{
                          flex: 1, padding: '11px', borderRadius: 10, border: '1px solid #38bdf8',
                          background: 'transparent', color: '#38bdf8', fontWeight: 700, fontSize: 13,
                          cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                        }}>
                        📞 Appeler
                      </a>
                      <button
                        onClick={() => setMotifModal(cmd)}
                        disabled={saving === cmd.id}
                        style={{
                          flex: 1, padding: '11px', borderRadius: 10, border: '1px solid #ef4444',
                          background: 'transparent', color: '#ef4444', fontWeight: 700, fontSize: 13, cursor: 'pointer'
                        }}>
                        ❌ Retour
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {onglet === 2 && (
          <div>
            <div style={{ background: '#1e293b', borderRadius: 14, padding: 16, marginBottom: 16, border: '1px solid #334155' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 13, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Chiffre d'affaires</h3>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {(['jour', 'semaine', 'mois'] as const).map(p => (
                  <button key={p} onClick={() => setPeriode(p)}
                    style={{
                      flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      background: periode === p ? '#38bdf8' : '#0f172a',
                      color: periode === p ? '#0f172a' : '#64748b'
                    }}>
                    {p === 'jour' ? 'Jour' : p === 'semaine' ? 'Semaine' : 'Mois'}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#1D9E75', textAlign: 'center' }}>
                {statsCA().toLocaleString('fr-FR')} F
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 12 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1D9E75' }}>{nbLivres}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Livrés</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#ef4444' }}>{nbRetours}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Retours</div>
                </div>
              </div>
            </div>

            {historique.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#334155' }}>
                <p style={{ fontSize: 14 }}>Aucun historique</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {historique.map(cmd => (
                  <div key={cmd.id} style={{
                    background: '#1e293b', borderRadius: 12, padding: 14,
                    border: `1px solid ${cmd.statut === 'livre' ? '#1D9E7544' : '#ef444444'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: cmd.statut === 'livre' ? '#1D9E75' : '#ef4444', background: cmd.statut === 'livre' ? '#0a2e1f' : '#2a0a0a', padding: '2px 8px', borderRadius: 20 }}>
                        {cmd.statut === 'livre' ? '✅ Livré' : '❌ Retour'}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1D9E75' }}>
                        +{cmd.frais_livraison?.toLocaleString('fr-FR')} F
                      </span>
                    </div>
                    <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{cmd.nom_client || '—'}</p>
                    <p style={{ margin: '0 0 2px', fontSize: 11, color: '#64748b' }}>📍 {cmd.adresse}</p>
                    {cmd.motif_retour && (
                      <p style={{ margin: '4px 0 0', fontSize: 11, color: '#ef4444', background: '#2a0a0a', padding: '4px 8px', borderRadius: 6 }}>
                        Motif : {cmd.motif_retour}
                      </p>
                    )}
                    <p style={{ margin: '4px 0 0', fontSize: 10, color: '#334155' }}>
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