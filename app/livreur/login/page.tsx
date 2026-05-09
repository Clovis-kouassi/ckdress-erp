'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'

export default function LivreurLoginPage() {
  const router = useRouter()
  const [telephone, setTelephone] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!telephone || !motDePasse) {
      setError('Renseignez votre téléphone et mot de passe.')
      return
    }
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('livreurs')
      .select('*')
      .eq('telephone', telephone.trim())
      .eq('mot_de_passe', motDePasse)
      .eq('actif', true)
      .single()

    if (error || !data) {
      setError('Numéro de téléphone ou mot de passe incorrect.')
      setLoading(false)
      return
    }

    // Sauvegarder le livreur en localStorage
    localStorage.setItem('ck_livreur', JSON.stringify({
      id: data.id,
      nom: data.nom,
      code: data.code,
      telephone: data.telephone,
    }))

    router.push(`/livreur/${data.code}`)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f0f2f5', fontFamily: "'Inter', sans-serif", padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '40px 28px', width: '100%', maxWidth: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>
            🚚
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a1a' }}>Espace Livreur</h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: '#888' }}>CK Dress — Connexion</p>
        </div>

        {/* Champs */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 8 }}>
            📞 Numéro de téléphone
          </label>
          <input
            type="tel"
            value={telephone}
            onChange={e => setTelephone(e.target.value)}
            placeholder="Ex: 2250700000001"
            style={{ width: '100%', boxSizing: 'border-box', padding: '13px 16px', borderRadius: 12, border: '1.5px solid #e5e7eb', fontSize: 15, outline: 'none', color: '#1a1a1a', background: '#f8f9fa' }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 8 }}>
            🔒 Mot de passe
          </label>
          <input
            type="password"
            value={motDePasse}
            onChange={e => setMotDePasse(e.target.value)}
            placeholder="••••••••"
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ width: '100%', boxSizing: 'border-box', padding: '13px 16px', borderRadius: 12, border: '1.5px solid #e5e7eb', fontSize: 15, outline: 'none', color: '#1a1a1a', background: '#f8f9fa' }}
          />
        </div>

        {error && (
          <div style={{ background: '#fff0f0', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', color: '#ef4444', fontSize: 13, marginBottom: 16, fontWeight: 500 }}>
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: loading ? '#aaa' : 'linear-gradient(135deg, #1a1a2e, #0f3460)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? '⏳ Connexion...' : 'Se connecter →'}
        </button>

        <p style={{ textAlign: 'center', color: '#ccc', fontSize: 12, marginTop: 24 }}>
          CK Dress ERP — Accès réservé aux livreurs
        </p>
      </div>
    </div>
  )
}