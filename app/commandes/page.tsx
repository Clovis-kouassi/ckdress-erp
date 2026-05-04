'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
}

const STATUTS: Record<string, { label: string; color: string; bg: string }> = {
  nouveau: { label: 'Nouveau', color: '#92400e', bg: '#fef3c7' },
  en_preparation: { label: 'En préparation', color: '#1e40af', bg: '#dbeafe' },
  en_livraison: { label: 'En livraison', color: '#5b21b6', bg: '#ede9fe' },
  livre: { label: 'Livré', color: '#065f46', bg: '#d1fae5' },
  annule: { label: 'Annulé', color: '#991b1b', bg: '#fee2e2' },
}

export default function CommandesPage() {
  const router = useRouter()
  const [commandes, setCommandes] = useState<Commande[]>([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState('tous')

  useEffect(() => {
    fetchCommandes()
  }, [])

  async function fetchCommandes() {
    setLoading(true)
    const { data } = await supabase
      .from('commandes_catalogue')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setCommandes(data)
    setLoading(false)
  }

  async function changerStatut(id: string, statut: string) {
    await supabase.from('commandes_catalogue').update({ statut }).eq('id', id)
    fetchCommandes()
  }

  const commandesFiltrees = filtre === 'tous'
    ? commandes
    : commandes.filter(c => c.statut === filtre)

  const stats = {
    total: commandes.length,
    nouveau: commandes.filter(c => c.statut === 'nouveau').length,
    en_livraison: commandes.filter(c => c.statut === 'en_livraison').length,
    livre: commandes.filter(c => c.statut === 'livre').length,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <header style={{ background: '#1a1a1a', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 20 }}>←</button>
          <span style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>Commandes Catalogue</span>
        </div>
        <button
          onClick={fetchCommandes}
          style={{ background: '#d4a853', color: '#1a1a1a', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          Actualiser
        </button>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total commandes', value: stats.total, color: '#1a1a1a' },
            { label: 'Nouvelles', value: stats.nouveau, color: '#d97706' },
            { label: 'En livraison', value: stats.en_livraison, color: '#7c3aed' },
            { label: 'Livrées', value: stats.livre, color: '#059669' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: '16px', border: '1px solid #e5e7eb' }}>
              <p style={{ margin: 0, fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</p>
              <p style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { key: 'tous', label: 'Toutes' },
            { key: 'nouveau', label: 'Nouvelles' },
            { key: 'en_preparation', label: 'En préparation' },
            { key: 'en_livraison', label: 'En livraison' },
            { key: 'livre', label: 'Livrées' },
            { key: 'annule', label: 'Annulées' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFiltre(f.key)}
              style={{
                padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                background: filtre === f.key ? '#1a1a1a' : '#fff',
                color: filtre === f.key ? '#fff' : '#555',
                border: filtre === f.key ? '1.5px solid #1a1a1a' : '1.5px solid #e5e7eb',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Liste commandes */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>Chargement...</div>
        ) : commandesFiltrees.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <p>Aucune commande {filtre !== 'tous' ? 'dans cette catégorie' : ''}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {commandesFiltrees.map(cmd => (
              <div key={cmd.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>

                  {/* Infos commande */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: '#aaa' }}>
                        #{cmd.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20,
                        background: STATUTS[cmd.statut]?.bg || '#f3f4f6',
                        color: STATUTS[cmd.statut]?.color || '#555',
                      }}>
                        {STATUTS[cmd.statut]?.label || cmd.statut}
                      </span>
                      <span style={{ fontSize: 11, color: '#bbb' }}>
                        via {cmd.source === 'whatsapp' ? '📱 WhatsApp' : '🌐 Formulaire'}
                      </span>
                    </div>

                    <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>
                      {cmd.produit_ref} — Taille {cmd.taille}
                    </p>
                    <p style={{ margin: '2px 0', fontSize: 13, color: '#666' }}>
                      Couleurs : {cmd.variantes}
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>
                      📞 {cmd.telephone} · 📍 {cmd.adresse}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#bbb' }}>
                      {new Date(cmd.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* Montant + actions */}
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>
                      {cmd.montant_total?.toLocaleString('fr-FR')} F
                    </p>
                    <p style={{ margin: '0 0 12px', fontSize: 12, color: '#aaa' }}>
                      dont {cmd.frais_livraison?.toLocaleString('fr-FR')} F livraison
                    </p>

                    {/* Changer statut */}
                    <select
                      value={cmd.statut}
                      onChange={e => changerStatut(cmd.id, e.target.value)}
                      style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12, cursor: 'pointer', background: '#f9fafb', color: '#1a1a1a' }}
                    >
                      <option value="nouveau">Nouveau</option>
                      <option value="en_preparation">En préparation</option>
                      <option value="en_livraison">En livraison</option>
                      <option value="livre">Livré</option>
                      <option value="annule">Annulé</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
    </div>
  )
}