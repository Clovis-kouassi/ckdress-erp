'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) { setError('Remplissez tous les champs.'); return }
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('utilisateurs')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('mot_de_passe', password)
      .eq('actif', true)
      .single()

    if (error || !data) {
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
      return
    }

    localStorage.setItem('ck_user', JSON.stringify({
      id: data.id,
      nom: data.nom,
      email: data.email,
      role: data.role,
      activite: data.activite,
      code_ref: data.code_ref,
    }))

    const redirects: Record<string, string> = {
      super_admin: '/dashboard',
      manager: '/dashboard',
      comptable: '/dashboard',
      commercial: '/commercial',
      gestionnaire_stock: '/gestionnaire-stock',
      livreur: `/livreur/${data.code_ref || 'LIV-001'}`,
      boutique: `/boutique/${data.code_ref || ''}`,
      atelier: `/atelier/${data.code_ref || ''}`,
    }

    window.location.href = redirects[data.role] || '/dashboard'
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#111', border: '1px solid #222', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '400px' }}>

        {/* LOGO */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img
            src="/logo-ckdress.png"
            alt="CK Dress"
            style={{ height: '70px', objectFit: 'contain', marginBottom: '16px', filter: 'brightness(0) invert(1)' }}
          />
          <p style={{ color: '#555', fontSize: '13px', margin: 0 }}>Connectez-vous à votre espace</p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="votre@email.com"
            autoComplete="off"
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #333', background: '#1a1a1a', color: 'white', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #333', background: '#1a1a1a', color: 'white', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
          />
        </div>

        {error && (
          <div style={{ background: '#2a1010', border: '1px solid #5a2020', borderRadius: '8px', padding: '10px 14px', color: '#ff6b6b', fontSize: '13px', marginBottom: '16px' }}>
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ width: '100%', padding: '13px', borderRadius: '8px', background: loading ? '#0a5c3f' : '#1D9E75', color: 'white', border: 'none', fontSize: '15px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? '⏳ Connexion...' : 'Se connecter →'}
        </button>

        <p style={{ textAlign: 'center', color: '#333', fontSize: '11px', marginTop: '24px' }}>
          CK Dress ERP — Accès réservé au personnel
        </p>
      </div>
    </div>
  )
}