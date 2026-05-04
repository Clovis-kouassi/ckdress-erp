'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Livraisons() {
  const [commandes, setCommandes] = useState<any[]>([])
  const [livreurs, setLivreurs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const { data: cmds } = await supabase
      .from('commandes')
      .select(`id, numero, montant_total, statut, adresse_livraison, created_at, clients(nom, telephone)`)
      .neq('statut', 'annulee')
      .order('created_at', { ascending: false })

    const { data: livs } = await supabase
      .from('utilisateurs')
      .select('id, nom, prenom')
      .eq('role', 'livreur')

    setCommandes(cmds || [])
    setLivreurs(livs || [])
    setLoading(false)
  }

  async function changerStatut(id: string, statut: string, livreurId?: string) {
    const update: any = { statut }
    if (livreurId) update.livreur_id = livreurId
    if (statut === 'livree') update.date_livree = new Date().toISOString()

    const { error } = await supabase.from('commandes').update(update).eq('id', id)
    if (error) {
      alert('Erreur : ' + error.message)
    } else {
      setSuccess('✅ Statut mis à jour !')
      fetchData()
      setTimeout(() => setSuccess(''), 2000)
    }
  }

  const statutColor: any = {
    nouvelle: '#E24B4A',
    validee: '#378ADD',
    en_livraison: '#EF9F27',
    livree: '#1D9E75',
  }
  const statutLabel: any = {
    nouvelle: 'Nouvelle',
    validee: 'Validée',
    en_livraison: 'En livraison',
    livree: 'Livrée',
  }

  const colonnes = ['nouvelle', 'validee', 'en_livraison', 'livree']
  const colonnesTitres: any = {
    nouvelle: 'Nouvelles',
    validee: 'Validées',
    en_livraison: 'En livraison',
    livree: 'Livrées',
  }

  const nbLivrees = commandes.filter(c => c.statut === 'livree').length
  const nbEnCours = commandes.filter(c => c.statut === 'en_livraison').length
  const caLivre = commandes.filter(c => c.statut === 'livree').reduce((sum, c) => sum + (c.montant_total || 0), 0)

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: 'sans-serif', color: 'white' }}>
      {/* TOPBAR */}
      <div style={{ background: '#111', borderBottom: '1px solid #222', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ color: '#1D9E75', fontSize: '1.4rem', margin: 0 }}>CK Dress ERP</h1>
        <div style={{ display: 'flex', gap: '16px' }}>
          <a href="/dashboard" style={{ color: '#666', fontSize: '13px', textDecoration: 'none' }}>Dashboard</a>
          <a href="/commandes" style={{ color: '#666', fontSize: '13px', textDecoration: 'none' }}>Commandes</a>
          <a href="/stock" style={{ color: '#666', fontSize: '13px', textDecoration: 'none' }}>Stock</a>
        </div>
      </div>

      <div style={{ padding: '24px' }}>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Total commandes', value: commandes.length, color: 'white' },
            { label: 'En livraison', value: nbEnCours, color: '#EF9F27' },
            { label: 'Livrées', value: nbLivrees, color: '#1D9E75' },
            { label: 'CA livré', value: caLivre.toLocaleString('fr-FR') + ' F', color: '#1D9E75' },
          ].map((k, i) => (
            <div key={i} style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '8px' }}>{k.label}</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        {success && (
          <div style={{ background: '#0a2a1a', border: '1px solid #1D9E75', borderRadius: '8px', padding: '10px 16px', color: '#1D9E75', fontSize: '13px', marginBottom: '16px' }}>
            {success}
          </div>
        )}

        {/* KANBAN */}
        {loading ? (
          <div style={{ textAlign: 'center', color: '#555', padding: '60px' }}>Chargement...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px' }}>
            {colonnes.map(col => (
              <div key={col} style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '16px' }}>
                {/* En-tête colonne */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: statutColor[col] }}>
                    {colonnesTitres[col]}
                  </div>
                  <div style={{ background: statutColor[col] + '22', color: statutColor[col], fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '8px' }}>
                    {commandes.filter(c => c.statut === col).length}
                  </div>
                </div>

                {/* Cartes commandes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {commandes.filter(c => c.statut === col).length === 0 ? (
                    <div style={{ color: '#444', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>Aucune</div>
                  ) : (
                    commandes.filter(c => c.statut === col).map((cmd, i) => (
                      <div key={i} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <div style={{ fontSize: '11px', color: '#555' }}>#{cmd.numero}</div>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: '#1D9E75' }}>
                            {(cmd.montant_total || 0).toLocaleString('fr-FR')} F
                          </div>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '2px' }}>
                          {(cmd.clients as any)?.nom || '—'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
                          📞 {(cmd.clients as any)?.telephone || '—'}
                        </div>
                        {cmd.adresse_livraison && (
                          <div style={{ fontSize: '11px', color: '#555', marginBottom: '8px' }}>
                            📍 {cmd.adresse_livraison}
                          </div>
                        )}

                        {/* Actions selon statut */}
                        {col === 'nouvelle' && (
                          <button
                            onClick={() => changerStatut(cmd.id, 'validee')}
                            style={{ width: '100%', background: '#378ADD22', color: '#378ADD', border: '1px solid #378ADD44', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>
                            ✓ Valider
                          </button>
                        )}

                        {col === 'validee' && (
                          <button
                            onClick={() => changerStatut(cmd.id, 'en_livraison')}
                            style={{ width: '100%', background: '#EF9F2722', color: '#EF9F27', border: '1px solid #EF9F2744', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>
                            🚚 Envoyer en livraison
                          </button>
                        )}

                        {col === 'en_livraison' && (
                          <button
                            onClick={() => changerStatut(cmd.id, 'livree')}
                            style={{ width: '100%', background: '#1D9E7522', color: '#1D9E75', border: '1px solid #1D9E7544', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>
                            ✅ Confirmer livraison
                          </button>
                        )}

                        {col === 'livree' && (
                          <div style={{ fontSize: '10px', color: '#1D9E75', textAlign: 'center', padding: '4px' }}>
                            ✓ Livraison confirmée
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}