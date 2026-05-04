'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Livreur {
  id: string
  nom: string
  telephone: string
  code: string
  actif: boolean
}

export default function LivreursPage() {
  const [livreurs, setLivreurs] = useState<Livreur[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [nom, setNom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchLivreurs() }, [])

  const fetchLivreurs = async () => {
    const { data } = await supabase.from('livreurs').select('*').order('created_at')
    setLivreurs(data || [])
    setLoading(false)
  }

  const addLivreur = async () => {
    if (!nom || !telephone) return
    setSaving(true)
    const code = `LIV-${String(livreurs.length + 1).padStart(3, '0')}`
    await supabase.from('livreurs').insert({ nom, telephone, code })
    setNom('')
    setTelephone('')
    setShowForm(false)
    fetchLivreurs()
    setSaving(false)
  }

  const toggleActif = async (id: string, actif: boolean) => {
    await supabase.from('livreurs').update({ actif: !actif }).eq('id', id)
    fetchLivreurs()
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', fontFamily: 'sans-serif', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ color: 'white', margin: 0, fontSize: '22px' }}>🚚 Livreurs</h1>
          <p style={{ color: '#555', margin: '4px 0 0', fontSize: '13px' }}>{livreurs.length} livreur(s)</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ background: '#1D9E75', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
          + Nouveau livreur
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ color: 'white', margin: '0 0 16px', fontSize: '15px' }}>Nouveau livreur</h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom complet" style={{ flex: 1, minWidth: '200px', padding: '10px 14px', borderRadius: '8px', background: '#1a1a1a', border: '1px solid #333', color: 'white', fontSize: '14px' }} />
            <input value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="Téléphone" style={{ flex: 1, minWidth: '200px', padding: '10px 14px', borderRadius: '8px', background: '#1a1a1a', border: '1px solid #333', color: 'white', fontSize: '14px' }} />
            <button onClick={addLivreur} disabled={saving} style={{ padding: '10px 20px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      {loading ? <p style={{ color: '#555' }}>Chargement...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {livreurs.map(livreur => (
            <div key={livreur.id} style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <span style={{ color: 'white', fontWeight: 600, fontSize: '15px' }}>{livreur.nom}</span>
                  <span style={{ background: livreur.actif ? '#1a2e25' : '#1a1a1a', border: `1px solid ${livreur.actif ? '#1D9E75' : '#333'}`, color: livreur.actif ? '#1D9E75' : '#555', fontSize: '11px', padding: '2px 8px', borderRadius: '20px' }}>
                    {livreur.actif ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                <p style={{ color: '#666', margin: 0, fontSize: '13px' }}>📞 {livreur.telephone}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ background: '#0a1a12', border: '1px solid #1a3a28', borderRadius: '8px', padding: '8px 12px' }}>
                  <p style={{ color: '#444', margin: '0 0 2px', fontSize: '11px' }}>Lien livreur</p>
                  <p style={{ color: '#1D9E75', margin: 0, fontSize: '12px', fontFamily: 'monospace' }}>/livreur/{livreur.code}</p>
                </div>
                <button onClick={() => navigator.clipboard.writeText(`${baseUrl}/livreur/${livreur.code}`)} style={{ padding: '8px 14px', background: 'transparent', border: '1px solid #333', color: '#888', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                  📋 Copier
                </button>
                <button onClick={() => toggleActif(livreur.id, livreur.actif)} style={{ padding: '8px 14px', background: 'transparent', border: `1px solid ${livreur.actif ? '#5a2020' : '#1D9E75'}`, color: livreur.actif ? '#ff6b6b' : '#1D9E75', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                  {livreur.actif ? 'Désactiver' : 'Activer'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}