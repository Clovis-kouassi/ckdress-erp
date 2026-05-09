'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

interface Livreur {
  id: string
  nom: string
  telephone: string
  code: string
  actif: boolean
  mot_de_passe?: string
}

export default function LivreursPage() {
  const [livreurs, setLivreurs] = useState<Livreur[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [nom, setNom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchLivreurs() }, [])

  const fetchLivreurs = async () => {
    const { data } = await supabase.from('livreurs').select('*').order('created_at')
    setLivreurs(data || [])
    setLoading(false)
  }

  const addLivreur = async () => {
    if (!nom) { setError('Le nom est obligatoire.'); return }
    if (!telephone) { setError('Le téléphone est obligatoire — c\'est avec ça que le livreur se connecte !'); return }

    // Vérifier si le téléphone existe déjà
    const { data: existing } = await supabase.from('livreurs').select('id').eq('telephone', telephone.trim()).single()
    if (existing) { setError('Ce numéro est déjà utilisé par un autre livreur.'); return }

    setSaving(true)
    setError('')
    const code = `LIV-${String(livreurs.length + 1).padStart(3, '0')}`
    await supabase.from('livreurs').insert({
      nom,
      telephone: telephone.trim(),
      code,
      actif: true,
      mot_de_passe: null,
    })
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

  const resetMotDePasse = async (id: string) => {
    if (!confirm('Réinitialiser le mot de passe ? Le livreur devra en créer un nouveau à sa prochaine connexion.')) return
    await supabase.from('livreurs').update({ mot_de_passe: null }).eq('id', id)
    fetchLivreurs()
  }

  const loginUrl = typeof window !== 'undefined' ? `${window.location.origin}/livreur/login` : ''

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', fontFamily: 'sans-serif', padding: '24px' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ color: 'white', margin: 0, fontSize: '22px' }}>🚚 Livreurs</h1>
          <p style={{ color: '#555', margin: '4px 0 0', fontSize: '13px' }}>{livreurs.length} livreur(s)</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setError('') }}
          style={{ background: '#1D9E75', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
          + Nouveau livreur
        </button>
      </div>

      {/* LIEN DE CONNEXION */}
      <div style={{ background: '#0a1a12', border: '1px solid #1a3a28', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <p style={{ color: '#444', margin: '0 0 4px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Lien de connexion livreurs</p>
          <p style={{ color: '#1D9E75', margin: 0, fontSize: '13px', fontFamily: 'monospace' }}>{loginUrl}</p>
        </div>
        <button onClick={() => navigator.clipboard.writeText(loginUrl)}
          style={{ padding: '8px 14px', background: 'transparent', border: '1px solid #1D9E75', color: '#1D9E75', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
          📋 Copier le lien
        </button>
      </div>

      {/* FORMULAIRE */}
      {showForm && (
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ color: 'white', margin: '0 0 6px', fontSize: '15px' }}>Nouveau livreur</h3>
          <p style={{ color: '#555', margin: '0 0 16px', fontSize: '12px' }}>
            ⚠️ Le numéro de téléphone est obligatoire — c'est avec ça que le livreur se connecte.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: error ? 12 : 0 }}>
            <input value={nom} onChange={e => setNom(e.target.value)}
              placeholder="Nom complet *"
              style={{ flex: 1, minWidth: '200px', padding: '10px 14px', borderRadius: '8px', background: '#1a1a1a', border: '1px solid #333', color: 'white', fontSize: '14px' }} />
            <input value={telephone} onChange={e => setTelephone(e.target.value)}
              placeholder="Téléphone * (Ex: 2250700000001)"
              type="tel"
              style={{ flex: 1, minWidth: '200px', padding: '10px 14px', borderRadius: '8px', background: '#1a1a1a', border: `1px solid ${error && !telephone ? '#ef4444' : '#333'}`, color: 'white', fontSize: '14px' }} />
            <button onClick={addLivreur} disabled={saving}
              style={{ padding: '10px 20px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
          {error && (
            <div style={{ background: '#2a0a0a', border: '1px solid #5a2020', borderRadius: '8px', padding: '10px 14px', color: '#ff6b6b', fontSize: '13px', marginTop: 12 }}>
              ⚠️ {error}
            </div>
          )}
        </div>
      )}

      {/* LISTE */}
      {loading ? <p style={{ color: '#555' }}>Chargement...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {livreurs.map(livreur => (
            <div key={livreur.id} style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span style={{ color: 'white', fontWeight: 600, fontSize: '15px' }}>{livreur.nom}</span>
                  <span style={{ background: livreur.actif ? '#1a2e25' : '#1a1a1a', border: `1px solid ${livreur.actif ? '#1D9E75' : '#333'}`, color: livreur.actif ? '#1D9E75' : '#555', fontSize: '11px', padding: '2px 8px', borderRadius: '20px' }}>
                    {livreur.actif ? 'Actif' : 'Inactif'}
                  </span>
                  {/* Statut mot de passe */}
                  <span style={{ background: livreur.mot_de_passe ? '#1a2535' : '#2a1a00', border: `1px solid ${livreur.mot_de_passe ? '#3b82f6' : '#f59e0b'}`, color: livreur.mot_de_passe ? '#38bdf8' : '#f59e0b', fontSize: '11px', padding: '2px 8px', borderRadius: '20px' }}>
                    {livreur.mot_de_passe ? '🔒 Mot de passe créé' : '⚠️ Pas encore connecté'}
                  </span>
                </div>
                <p style={{ color: '#666', margin: '0 0 2px', fontSize: '13px' }}>📞 {livreur.telephone}</p>
                <p style={{ color: '#444', margin: 0, fontSize: '12px', fontFamily: 'monospace' }}>Code: {livreur.code}</p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* Reset mot de passe */}
                {livreur.mot_de_passe && (
                  <button onClick={() => resetMotDePasse(livreur.id)}
                    style={{ padding: '8px 14px', background: 'transparent', border: '1px solid #444', color: '#888', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                    🔄 Reset mdp
                  </button>
                )}
                <button onClick={() => toggleActif(livreur.id, livreur.actif)}
                  style={{ padding: '8px 14px', background: 'transparent', border: `1px solid ${livreur.actif ? '#5a2020' : '#1D9E75'}`, color: livreur.actif ? '#ff6b6b' : '#1D9E75', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
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