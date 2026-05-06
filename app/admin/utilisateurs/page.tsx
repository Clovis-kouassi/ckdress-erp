'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ROLES = [
  { id: 'super_admin', label: 'Super Admin' },
  { id: 'manager', label: 'Manager' },
  { id: 'comptable', label: 'Comptable' },
  { id: 'commercial', label: 'Commercial' },
  { id: 'gestionnaire_stock', label: 'Gestionnaire Stock' },
  { id: 'livreur', label: 'Livreur' },
  { id: 'boutique', label: 'Boutique' },
  { id: 'atelier', label: 'Atelier' },
]

const ACTIVITES = [
  { id: 'ck_dress', label: 'CK Dress (Global)' },
  { id: 'ck_design', label: 'CK Design' },
  { id: 'succes_design', label: 'Succès Design' },
]

export default function UtilisateursPage() {
  const [utilisateurs, setUtilisateurs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [form, setForm] = useState({ nom: '', email: '', mot_de_passe: '', role: 'commercial', activite: 'ck_design', code_ref: '' })

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('ck_user') || '{}')
    setCurrentUser(user)
    fetchUtilisateurs()
  }, [])

  const fetchUtilisateurs = async () => {
    const { data } = await supabase.from('utilisateurs').select('*').order('created_at', { ascending: false })
    setUtilisateurs(data || [])
    setLoading(false)
  }

  const addUser = async () => {
    if (!form.nom || !form.email || !form.mot_de_passe) return
    setSaving(true)
    await supabase.from('utilisateurs').insert(form)
    setForm({ nom: '', email: '', mot_de_passe: '', role: 'commercial', activite: 'ck_design', code_ref: '' })
    setShowForm(false)
    fetchUtilisateurs()
    setSaving(false)
  }

  const toggleActif = async (id: string, actif: boolean) => {
    await supabase.from('utilisateurs').update({ actif: !actif }).eq('id', id)
    fetchUtilisateurs()
  }

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      super_admin: '#E24B4A', manager: '#7c3aed', comptable: '#d4a853',
      commercial: '#378ADD', gestionnaire_stock: '#0891b2',
      livreur: '#EF9F27', boutique: '#1D9E75', atelier: '#888'
    }
    return colors[role] || '#888'
  }

  const needsCodeRef = (role: string) => ['livreur', 'boutique', 'atelier'].includes(role)

  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f5', fontFamily: 'sans-serif', color: '#1a1a1a' }}>

      {/* TOPBAR */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e5e5', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div>
          <h1 style={{ color: '#1a1a1a', margin: 0, fontSize: '20px', fontWeight: 700 }}>👥 Gestion des utilisateurs</h1>
          <p style={{ color: '#aaa', margin: '4px 0 0', fontSize: '13px' }}>{utilisateurs.length} utilisateur(s)</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <a href="/dashboard" style={{ padding: '10px 16px', background: 'transparent', border: '1px solid #e5e5e5', borderRadius: '8px', color: '#888', textDecoration: 'none', fontSize: '13px' }}>
            ← Dashboard
          </a>
          {(currentUser?.role === 'super_admin' || currentUser?.role === 'manager') && (
            <button onClick={() => setShowForm(!showForm)}
              style={{ background: '#1D9E75', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
              + Nouvel utilisateur
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '24px' }}>
        {showForm && (
          <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <h3 style={{ color: '#1a1a1a', margin: '0 0 16px', fontSize: '15px' }}>Nouvel utilisateur</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
              <input value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))}
                placeholder="Nom complet *"
                style={{ padding: '10px', borderRadius: '8px', background: '#f9f9f9', border: '1px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px' }} />
              <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="Email *" type="email"
                style={{ padding: '10px', borderRadius: '8px', background: '#f9f9f9', border: '1px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px' }} />
              <input value={form.mot_de_passe} onChange={e => setForm(p => ({ ...p, mot_de_passe: e.target.value }))}
                placeholder="Mot de passe *" type="password"
                style={{ padding: '10px', borderRadius: '8px', background: '#f9f9f9', border: '1px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px' }} />
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                style={{ padding: '10px', borderRadius: '8px', background: '#f9f9f9', border: '1px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px' }}>
                {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
              <select value={form.activite} onChange={e => setForm(p => ({ ...p, activite: e.target.value }))}
                style={{ padding: '10px', borderRadius: '8px', background: '#f9f9f9', border: '1px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px' }}>
                {ACTIVITES.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
              {needsCodeRef(form.role) && (
                <input value={form.code_ref} onChange={e => setForm(p => ({ ...p, code_ref: e.target.value }))}
                  placeholder={form.role === 'livreur' ? 'Code livreur (ex: LIV-001)' : form.role === 'boutique' ? 'Token boutique' : 'Code atelier (ex: ATL-001)'}
                  style={{ padding: '10px', borderRadius: '8px', background: '#f9f9f9', border: '1px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px' }} />
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowForm(false)}
                style={{ padding: '10px 20px', background: 'transparent', border: '1px solid #e5e5e5', borderRadius: '8px', color: '#888', cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={addUser} disabled={saving}
                style={{ padding: '10px 24px', background: '#1D9E75', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                {saving ? 'Enregistrement...' : 'Créer'}
              </button>
            </div>
          </div>
        )}

        {loading ? <p style={{ color: '#aaa' }}>Chargement...</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {utilisateurs.map(u => (
              <div key={u.id} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#1a1a1a', fontWeight: 600, fontSize: '15px' }}>{u.nom}</span>
                    <span style={{ background: getRoleColor(u.role) + '22', color: getRoleColor(u.role), fontSize: '11px', padding: '2px 10px', borderRadius: '20px', fontWeight: 600 }}>
                      {ROLES.find(r => r.id === u.role)?.label || u.role}
                    </span>
                    <span style={{ background: '#f0fdf4', color: '#1D9E75', fontSize: '11px', padding: '2px 10px', borderRadius: '20px' }}>
                      {ACTIVITES.find(a => a.id === u.activite)?.label || u.activite}
                    </span>
                  </div>
                  <p style={{ color: '#888', margin: '0 0 2px', fontSize: '13px' }}>✉️ {u.email}</p>
                  {u.code_ref && (
                    <p style={{ color: '#aaa', margin: 0, fontSize: '12px', fontFamily: 'monospace' }}>🔗 {u.code_ref}</p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', background: u.actif ? '#f0fdf4' : '#f5f5f5', color: u.actif ? '#1D9E75' : '#aaa', padding: '3px 10px', borderRadius: '20px' }}>
                    {u.actif ? 'Actif' : 'Inactif'}
                  </span>
                  {(currentUser?.role === 'super_admin' || currentUser?.role === 'manager') && (
                    <button onClick={() => toggleActif(u.id, u.actif)}
                      style={{ padding: '6px 14px', background: 'transparent', border: `1px solid ${u.actif ? '#E24B4A' : '#1D9E75'}`, color: u.actif ? '#E24B4A' : '#1D9E75', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>
                      {u.actif ? 'Désactiver' : 'Activer'}
                    </button>
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