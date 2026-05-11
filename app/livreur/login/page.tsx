'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'

type Etape = 'telephone' | 'creer_mdp' | 'saisir_mdp'

export default function LivreurLoginPage() {
  const router = useRouter()
  const [etape, setEtape] = useState<Etape>('telephone')
  const [telephone, setTelephone] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [confirmerMdp, setConfirmerMdp] = useState('')
  const [livreurData, setLivreurData] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleVerifierTelephone() {
    if (!telephone) { setError('Entrez votre numéro de téléphone.'); return }
    setLoading(true)
    setError('')

    // Normaliser — accepter avec ou sans indicatif pays 225
    const tel = telephone.trim()
    const telAvecIndicatif = tel.startsWith('225') ? tel : `225${tel}`
    const telSansIndicatif = tel.startsWith('225') ? tel.slice(3) : tel

    const { data, error } = await supabase
      .from('livreurs')
      .select('*')
      .or(`telephone.eq.${tel},telephone.eq.${telAvecIndicatif},telephone.eq.${telSansIndicatif}`)
      .eq('actif', true)
      .single()

    if (error || !data) {
      setError('Ce numéro n\'est pas associé à un compte livreur.')
      setLoading(false)
      return
    }

    setLivreurData(data)
    if (!data.mot_de_passe) {
      setEtape('creer_mdp')
    } else {
      setEtape('saisir_mdp')
    }
    setLoading(false)
  }

  async function handleCreerMotDePasse() {
    if (!motDePasse || motDePasse.length < 4) {
      setError('Le mot de passe doit avoir au moins 4 caractères.')
      return
    }
    if (motDePasse !== confirmerMdp) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    setError('')

    await supabase
      .from('livreurs')
      .update({ mot_de_passe: motDePasse })
      .eq('id', livreurData.id)

    localStorage.setItem('ck_livreur', JSON.stringify({
      id: livreurData.id,
      nom: livreurData.nom,
      code: livreurData.code,
      telephone: livreurData.telephone,
    }))

    router.push(`/livreur/${livreurData.code}`)
  }

  async function handleSaisirMotDePasse() {
    if (!motDePasse) { setError('Entrez votre mot de passe.'); return }
    setLoading(true)
    setError('')

    if (motDePasse !== livreurData.mot_de_passe) {
      setError('Mot de passe incorrect.')
      setLoading(false)
      return
    }

    localStorage.setItem('ck_livreur', JSON.stringify({
      id: livreurData.id,
      nom: livreurData.nom,
      code: livreurData.code,
      telephone: livreurData.telephone,
    }))

    router.push(`/livreur/${livreurData.code}`)
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
          <p style={{ margin: '6px 0 0', fontSize: 14, color: '#888' }}>
            {etape === 'telephone' && 'Entrez votre numéro pour continuer'}
            {etape === 'creer_mdp' && `Bonjour ${livreurData?.nom} 👋`}
            {etape === 'saisir_mdp' && `Bonjour ${livreurData?.nom} 👋`}
          </p>
          {(etape === 'creer_mdp' || etape === 'saisir_mdp') && (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#aaa' }}>
              {etape === 'creer_mdp' ? '🔐 Créez votre mot de passe' : '🔒 Entrez votre mot de passe'}
            </p>
          )}
        </div>

        {/* ETAPE 1 — TELEPHONE */}
        {etape === 'telephone' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 8 }}>
                📞 Numéro de téléphone
              </label>
              <input
                type="tel"
                value={telephone}
                onChange={e => setTelephone(e.target.value)}
                placeholder="Ex: 0555303010"
                onKeyDown={e => e.key === 'Enter' && handleVerifierTelephone()}
                style={{ width: '100%', boxSizing: 'border-box', padding: '13px 16px', borderRadius: 12, border: '1.5px solid #e5e7eb', fontSize: 15, outline: 'none', color: '#1a1a1a', background: '#f8f9fa' }}
              />
            </div>

            {error && (
              <div style={{ background: '#fff0f0', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', color: '#ef4444', fontSize: 13, marginBottom: 16, fontWeight: 500 }}>
                ⚠️ {error}
              </div>
            )}

            <button onClick={handleVerifierTelephone} disabled={loading}
              style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: loading ? '#aaa' : 'linear-gradient(135deg, #1a1a2e, #0f3460)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? '⏳ Vérification...' : 'Continuer →'}
            </button>
          </div>
        )}

        {/* ETAPE 2A — CRÉER MOT DE PASSE */}
        {etape === 'creer_mdp' && (
          <div>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#1D9E75', fontWeight: 500 }}>
              ✅ Première connexion — Créez votre mot de passe personnel
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 8 }}>
                🔒 Nouveau mot de passe
              </label>
              <input
                type="password"
                value={motDePasse}
                onChange={e => setMotDePasse(e.target.value)}
                placeholder="Minimum 4 caractères"
                style={{ width: '100%', boxSizing: 'border-box', padding: '13px 16px', borderRadius: 12, border: '1.5px solid #e5e7eb', fontSize: 15, outline: 'none', color: '#1a1a1a', background: '#f8f9fa' }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 8 }}>
                🔒 Confirmer le mot de passe
              </label>
              <input
                type="password"
                value={confirmerMdp}
                onChange={e => setConfirmerMdp(e.target.value)}
                placeholder="Répétez le mot de passe"
                onKeyDown={e => e.key === 'Enter' && handleCreerMotDePasse()}
                style={{ width: '100%', boxSizing: 'border-box', padding: '13px 16px', borderRadius: 12, border: '1.5px solid #e5e7eb', fontSize: 15, outline: 'none', color: '#1a1a1a', background: '#f8f9fa' }}
              />
            </div>

            {error && (
              <div style={{ background: '#fff0f0', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', color: '#ef4444', fontSize: 13, marginBottom: 16, fontWeight: 500 }}>
                ⚠️ {error}
              </div>
            )}

            <button onClick={handleCreerMotDePasse} disabled={loading}
              style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: loading ? '#aaa' : '#1D9E75', color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 12 }}>
              {loading ? '⏳ Enregistrement...' : '✅ Créer mon mot de passe'}
            </button>

            <button onClick={() => { setEtape('telephone'); setError(''); setMotDePasse(''); setConfirmerMdp('') }}
              style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid #e5e7eb', background: 'transparent', color: '#888', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              ← Retour
            </button>
          </div>
        )}

        {/* ETAPE 2B — SAISIR MOT DE PASSE */}
        {etape === 'saisir_mdp' && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 8 }}>
                🔒 Mot de passe
              </label>
              <input
                type="password"
                value={motDePasse}
                onChange={e => setMotDePasse(e.target.value)}
                placeholder="••••••••"
                onKeyDown={e => e.key === 'Enter' && handleSaisirMotDePasse()}
                style={{ width: '100%', boxSizing: 'border-box', padding: '13px 16px', borderRadius: 12, border: '1.5px solid #e5e7eb', fontSize: 15, outline: 'none', color: '#1a1a1a', background: '#f8f9fa' }}
              />
            </div>

            {error && (
              <div style={{ background: '#fff0f0', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', color: '#ef4444', fontSize: 13, marginBottom: 16, fontWeight: 500 }}>
                ⚠️ {error}
              </div>
            )}

            <button onClick={handleSaisirMotDePasse} disabled={loading}
              style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: loading ? '#aaa' : 'linear-gradient(135deg, #1a1a2e, #0f3460)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 12 }}>
              {loading ? '⏳ Connexion...' : 'Se connecter →'}
            </button>

            <button onClick={() => { setEtape('telephone'); setError(''); setMotDePasse('') }}
              style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid #e5e7eb', background: 'transparent', color: '#888', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              ← Retour
            </button>
          </div>
        )}

        <p style={{ textAlign: 'center', color: '#ccc', fontSize: 12, marginTop: 24 }}>
          CK Dress ERP — Accès réservé aux livreurs
        </p>
      </div>
    </div>
  )
}