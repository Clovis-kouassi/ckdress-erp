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
  const [livreurs, setLivreurs] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet] = useState<'utilisateurs' | 'categories'>('utilisateurs')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [form, setForm] = useState({
    nom: '', email: '', telephone: '', mot_de_passe: '',
    role: 'commercial', activite: 'ck_design', code_ref: ''
  })
  const [catForm, setCatForm] = useState({ nom: '', activite: 'ck_design', ordre: 0 })

  const [editUser, setEditUser] = useState<any>(null)
  const [editForm, setEditForm] = useState({
    nom: '', email: '', role: '', activite: '', mot_de_passe: ''
  })
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('ck_user') || '{}')
    setCurrentUser(user)
    fetchData()
  }, [])

  const fetchData = async () => {
    const [{ data: users }, { data: cats }, { data: livs }] = await Promise.all([
      supabase.from('utilisateurs').select('*').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('activite').order('ordre'),
      supabase.from('livreurs').select('*').order('created_at'),
    ])
    setUtilisateurs(users || [])
    setCategories(cats || [])
    setLivreurs(livs || [])
    setLoading(false)
  }

  const openEditModal = (u: any) => {
    setEditUser(u)
    setEditForm({
      nom: u.nom || '',
      email: u.role === 'livreur' ? u.email?.replace('@livreur.ck', '') : (u.email || ''),
      role: u.role || '',
      activite: u.activite || 'ck_design',
      mot_de_passe: '',
    })
  }

  const closeEditModal = () => {
    setEditUser(null)
    setEditForm({ nom: '', email: '', role: '', activite: '', mot_de_passe: '' })
  }

  const saveEdit = async () => {
    if (!editUser) return
    if (!editForm.nom) { alert('Le nom est obligatoire.'); return }
    setEditSaving(true)
    const updates: any = {
      nom: editForm.nom,
      role: editForm.role,
      activite: editForm.activite,
    }
    if (editUser.role === 'livreur' || editForm.role === 'livreur') {
      updates.email = `${editForm.email.trim()}@livreur.ck`
    } else {
      if (editForm.email) updates.email = editForm.email
    }
    if (editForm.mot_de_passe) {
      updates.mot_de_passe = editForm.mot_de_passe
    }
    await supabase.from('utilisateurs').update(updates).eq('id', editUser.id)
    if (editUser.role === 'livreur' && editUser.code_ref) {
      await supabase.from('livreurs').update({ nom: editForm.nom }).eq('code', editUser.code_ref)
    }
    closeEditModal()
    fetchData()
    setEditSaving(false)
  }

  const addUser = async () => {
    const isLivreur = form.role === 'livreur'
    if (!form.nom) return
    if (isLivreur && !form.telephone) { alert('Le téléphone est obligatoire pour un livreur.'); return }
    if (!isLivreur && (!form.email || !form.mot_de_passe)) { alert('Email et mot de passe obligatoires.'); return }
    setSaving(true)

    if (isLivreur) {
      // CORRECTION : récupérer le vrai nombre de livreurs depuis la DB en temps réel
      const { count } = await supabase
        .from('livreurs')
        .select('*', { count: 'exact', head: true })

      const numeroSuivant = (count || 0) + 1
      const code = `LIV-${String(numeroSuivant).padStart(3, '0')}`

      // Vérifier que le code n'existe pas déjà
      const { data: codeExist } = await supabase
        .from('livreurs')
        .select('id')
        .eq('code', code)
        .single()

      const codeFinal = codeExist
        ? `LIV-${String(numeroSuivant + 1).padStart(3, '0')}`
        : code

      // Insérer dans livreurs
      const { data: livreurData, error: livreurError } = await supabase
        .from('livreurs')
        .insert({
          nom: form.nom,
          telephone: form.telephone.trim(),
          code: codeFinal,
          actif: true,
          mot_de_passe: null,
        })
        .select()
        .single()

      if (livreurError || !livreurData) {
        alert('Erreur lors de la création du livreur : ' + livreurError?.message)
        setSaving(false)
        return
      }

      // Insérer dans utilisateurs avec le même code
      const { error: userError } = await supabase.from('utilisateurs').insert({
        nom: form.nom,
        email: `${form.telephone.trim()}@livreur.ck`,
        mot_de_passe: null,
        role: 'livreur',
        activite: form.activite,
        code_ref: codeFinal,
        actif: true,
      })

      if (userError) {
        alert('Erreur lors de la création de l\'utilisateur livreur : ' + userError?.message)
        // Supprimer le livreur créé pour éviter les doublons
        await supabase.from('livreurs').delete().eq('id', livreurData.id)
        setSaving(false)
        return
      }

    } else {
      await supabase.from('utilisateurs').insert({
        nom: form.nom,
        email: form.email,
        mot_de_passe: form.mot_de_passe,
        role: form.role,
        activite: form.activite,
        code_ref: form.code_ref,
        actif: true,
      })
    }

    setForm({ nom: '', email: '', telephone: '', mot_de_passe: '', role: 'commercial', activite: 'ck_design', code_ref: '' })
    setShowForm(false)
    fetchData()
    setSaving(false)
  }

  const addCategorie = async () => {
    if (!catForm.nom) return
    setSaving(true)
    await supabase.from('categories').insert(catForm)
    setCatForm({ nom: '', activite: 'ck_design', ordre: 0 })
    fetchData()
    setSaving(false)
  }

  const deleteCategorie = async (id: string) => {
    if (!confirm('Supprimer cette catégorie ?')) return
    await supabase.from('categories').delete().eq('id', id)
    fetchData()
  }

  const toggleActif = async (id: string, actif: boolean) => {
    await supabase.from('utilisateurs').update({ actif: !actif }).eq('id', id)
    fetchData()
  }

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      super_admin: '#E24B4A', manager: '#7c3aed', comptable: '#d4a853',
      commercial: '#378ADD', gestionnaire_stock: '#0891b2',
      livreur: '#EF9F27', boutique: '#1D9E75', atelier: '#888'
    }
    return colors[role] || '#888'
  }

  const isLivreur = form.role === 'livreur'
  const categoriesCK = categories.filter(c => c.activite === 'ck_design')
  const categoriesSD = categories.filter(c => c.activite === 'succes_design')

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: "'Inter', sans-serif", color: '#1a1a1a' }}>

      {/* MODAL MODIFICATION */}
      {editUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1a1a1a' }}>✏️ Modifier l'utilisateur</h2>
              <button onClick={closeEditModal} style={{ background: '#f5f5f5', border: 'none', borderRadius: '8px', width: 32, height: 32, cursor: 'pointer', fontSize: '16px', color: '#888' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Nom complet *</label>
                <input value={editForm.nom} onChange={e => setEditForm(p => ({ ...p, nom: e.target.value }))} placeholder="Nom complet"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>
                  {editUser.role === 'livreur' ? '📞 Téléphone' : '✉️ Email'}
                </label>
                <input value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                  placeholder={editUser.role === 'livreur' ? 'Téléphone' : 'Email'}
                  type={editUser.role === 'livreur' ? 'tel' : 'email'}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Rôle</label>
                <select value={editForm.role} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}>
                  {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Activité</label>
                <select value={editForm.activite} onChange={e => setEditForm(p => ({ ...p, activite: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}>
                  {ACTIVITES.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>
                  Nouveau mot de passe <span style={{ color: '#aaa', fontWeight: 400 }}>(laisser vide = inchangé)</span>
                </label>
                <input value={editForm.mot_de_passe} onChange={e => setEditForm(p => ({ ...p, mot_de_passe: e.target.value }))}
                  placeholder="••••••••" type="password"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '22px' }}>
              <button onClick={closeEditModal} style={{ flex: 1, padding: '11px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', borderRadius: '9px', color: '#888', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                Annuler
              </button>
              <button onClick={saveEdit} disabled={editSaving} style={{ flex: 2, padding: '11px', background: '#7c3aed', border: 'none', borderRadius: '9px', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '13px', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
                {editSaving ? 'Enregistrement...' : '✅ Enregistrer les modifications'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>
        <div>
          <h1 style={{ color: '#38bdf8', margin: 0, fontSize: '16px', fontWeight: 700 }}>⚙️ Administration</h1>
          <p style={{ color: '#94a3b8', margin: '2px 0 0', fontSize: '11px' }}>{utilisateurs.length} utilisateur(s) · {categories.length} catégorie(s)</p>
        </div>
        <a href="/dashboard" style={{ padding: '7px 14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#94a3b8', textDecoration: 'none', fontSize: '12px' }}>
          ← Dashboard
        </a>
      </div>

      {/* ONGLETS */}
      <div style={{ display: 'flex', background: '#fff', margin: '16px 24px 0', borderRadius: '12px', padding: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', gap: '4px' }}>
        {[
          { key: 'utilisateurs', label: '👥 Utilisateurs' },
          { key: 'categories', label: '🏷️ Catégories catalogue' },
        ].map(o => (
          <button key={o.key} onClick={() => setOnglet(o.key as any)}
            style={{ flex: 1, padding: '10px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, background: onglet === o.key ? '#0891b2' : 'transparent', color: onglet === o.key ? '#fff' : '#888' }}>
            {o.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px 24px' }}>

        {/* ONGLET UTILISATEURS */}
        {onglet === 'utilisateurs' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              {currentUser?.role === 'super_admin' && (
                <button onClick={() => setShowForm(!showForm)}
                  style={{ background: '#1D9E75', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '9px', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 12px rgba(29,158,117,0.3)' }}>
                  + Nouvel utilisateur
                </button>
              )}
            </div>

            {showForm && (
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '22px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
                <h3 style={{ color: '#1a1a1a', margin: '0 0 16px', fontSize: '15px', fontWeight: 700 }}>Nouvel utilisateur</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                  <input value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} placeholder="Nom complet *"
                    style={{ padding: '10px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', outline: 'none' }} />
                  <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                    style={{ padding: '10px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', outline: 'none' }}>
                    {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                  <select value={form.activite} onChange={e => setForm(p => ({ ...p, activite: e.target.value }))}
                    style={{ padding: '10px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', outline: 'none' }}>
                    {ACTIVITES.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                  </select>
                  {isLivreur ? (
                    <input value={form.telephone} onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))}
                      placeholder="📞 Téléphone * (Ex: 0555303010)" type="tel"
                      style={{ padding: '10px 12px', borderRadius: '9px', background: '#fff8e6', border: '1.5px solid #fde68a', color: '#1a1a1a', fontSize: '13px', outline: 'none' }} />
                  ) : (
                    <>
                      <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Email *" type="email"
                        style={{ padding: '10px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', outline: 'none' }} />
                      <input value={form.mot_de_passe} onChange={e => setForm(p => ({ ...p, mot_de_passe: e.target.value }))} placeholder="Mot de passe *" type="password"
                        style={{ padding: '10px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', outline: 'none' }} />
                    </>
                  )}
                </div>
                {isLivreur && (
                  <div style={{ background: '#fff8e6', border: '1px solid #fde68a', borderRadius: '9px', padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#92400e' }}>
                    ⚠️ Le livreur se connectera avec son <strong>numéro de téléphone</strong> sur <strong>/livreur/login</strong> et créera son mot de passe à la première connexion. Le code est généré automatiquement.
                  </div>
                )}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setShowForm(false)}
                    style={{ padding: '10px 20px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', borderRadius: '9px', color: '#888', cursor: 'pointer', fontWeight: 600 }}>
                    Annuler
                  </button>
                  <button onClick={addUser} disabled={saving}
                    style={{ padding: '10px 24px', background: '#1D9E75', border: 'none', borderRadius: '9px', color: 'white', cursor: 'pointer', fontWeight: 700, boxShadow: '0 4px 12px rgba(29,158,117,0.3)' }}>
                    {saving ? 'Enregistrement...' : 'Créer'}
                  </button>
                </div>
              </div>
            )}

            {loading ? <p style={{ color: '#aaa' }}>Chargement...</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {utilisateurs.map(u => (
                  <div key={u.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span style={{ color: '#1a1a1a', fontWeight: 700, fontSize: '15px' }}>{u.nom}</span>
                        <span style={{ background: getRoleColor(u.role) + '22', color: getRoleColor(u.role), fontSize: '11px', padding: '2px 10px', borderRadius: '20px', fontWeight: 600 }}>
                          {ROLES.find(r => r.id === u.role)?.label || u.role}
                        </span>
                        <span style={{ background: '#f0fdf4', color: '#1D9E75', fontSize: '11px', padding: '2px 10px', borderRadius: '20px' }}>
                          {ACTIVITES.find(a => a.id === u.activite)?.label || u.activite}
                        </span>
                      </div>
                      <p style={{ color: '#888', margin: '0 0 2px', fontSize: '13px' }}>
                        {u.role === 'livreur' ? `📞 ${u.email?.replace('@livreur.ck', '')}` : `✉️ ${u.email}`}
                      </p>
                      {u.code_ref && (
                        <p style={{ color: '#aaa', margin: 0, fontSize: '12px', fontFamily: 'monospace' }}>🔗 {u.code_ref}</p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', background: u.actif ? '#f0fdf4' : '#f5f5f5', color: u.actif ? '#1D9E75' : '#aaa', padding: '3px 10px', borderRadius: '20px', fontWeight: 600 }}>
                        {u.actif ? 'Actif' : 'Inactif'}
                      </span>
                      {(currentUser?.role === 'super_admin' || currentUser?.role === 'manager') && (
                        <>
                          <button onClick={() => openEditModal(u)}
                            style={{ padding: '6px 14px', background: '#ede9fe', border: '1.5px solid #7c3aed', color: '#7c3aed', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                            ✏️ Modifier
                          </button>
                          <button onClick={() => toggleActif(u.id, u.actif)}
                            style={{ padding: '6px 14px', background: 'transparent', border: `1.5px solid ${u.actif ? '#E24B4A' : '#1D9E75'}`, color: u.actif ? '#E24B4A' : '#1D9E75', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                            {u.actif ? 'Désactiver' : 'Activer'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ONGLET CATEGORIES */}
        {onglet === 'categories' && (
          <div>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '22px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#0891b2' }}>🏷️ Ajouter une catégorie</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: '12px', marginBottom: '14px' }}>
                <input value={catForm.nom} onChange={e => setCatForm(p => ({ ...p, nom: e.target.value }))}
                  placeholder="Nom catégorie * (ex: Polo, Chemise...)"
                  style={{ padding: '10px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', outline: 'none' }} />
                <select value={catForm.activite} onChange={e => setCatForm(p => ({ ...p, activite: e.target.value }))}
                  style={{ padding: '10px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', outline: 'none' }}>
                  <option value="ck_design">CK Design</option>
                  <option value="succes_design">Succès Design</option>
                </select>
                <input type="number" value={catForm.ordre} onChange={e => setCatForm(p => ({ ...p, ordre: Number(e.target.value) }))}
                  placeholder="Ordre"
                  style={{ padding: '10px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', outline: 'none' }} />
              </div>
              <button onClick={addCategorie} disabled={saving}
                style={{ padding: '10px 24px', background: '#0891b2', border: 'none', borderRadius: '9px', color: 'white', cursor: 'pointer', fontWeight: 700 }}>
                {saving ? '...' : '+ Ajouter'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '18px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: 700, color: '#1D9E75', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  🎨 CK Design — {categoriesCK.length}
                </h3>
                {categoriesCK.map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa', borderRadius: '9px', padding: '10px 14px', marginBottom: '8px', border: '1px solid #e5e7eb' }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '14px' }}>{c.nom}</span>
                      <span style={{ marginLeft: 8, fontSize: '11px', color: '#aaa' }}>ordre: {c.ordre}</span>
                    </div>
                    <button onClick={() => deleteCategorie(c.id)}
                      style={{ background: '#fff0f0', color: '#E24B4A', border: 'none', borderRadius: '7px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                      🗑️
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '18px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: 700, color: '#d4a853', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  ✨ Succès Design — {categoriesSD.length}
                </h3>
                {categoriesSD.map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa', borderRadius: '9px', padding: '10px 14px', marginBottom: '8px', border: '1px solid #e5e7eb' }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '14px' }}>{c.nom}</span>
                      <span style={{ marginLeft: 8, fontSize: '11px', color: '#aaa' }}>ordre: {c.ordre}</span>
                    </div>
                    <button onClick={() => deleteCategorie(c.id)}
                      style={{ background: '#fff0f0', color: '#E24B4A', border: 'none', borderRadius: '7px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}