'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LandingConfigPage() {
  const [textes, setTextes] = useState<any[]>([])
  const [promos, setPromos] = useState<any[]>([])
  const [onglet, setOnglet] = useState<'textes' | 'promos'>('textes')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  const [newTexte, setNewTexte] = useState('')
  const [newPromo, setNewPromo] = useState({
    nom: '', description: '', prix_original: 0, prix_promo: 0,
    badge: '', lien: '/catalogue', date_expiration: '', actif: true
  })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const [{ data: t }, { data: p }] = await Promise.all([
      supabase.from('landing_textes').select('*').order('ordre'),
      supabase.from('landing_promos').select('*').order('ordre'),
    ])
    setTextes(t || [])
    setPromos(p || [])
  }

  const showSuccess = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 2500)
  }

  // TEXTES
  const ajouterTexte = async () => {
    if (!newTexte.trim()) return
    setSaving(true)
    await supabase.from('landing_textes').insert({ texte: newTexte, actif: true, ordre: textes.length })
    setNewTexte('')
    showSuccess('✅ Texte ajouté !')
    fetchData()
    setSaving(false)
  }

  const toggleTexte = async (id: string, actif: boolean) => {
    await supabase.from('landing_textes').update({ actif: !actif }).eq('id', id)
    fetchData()
  }

  const supprimerTexte = async (id: string) => {
    if (!confirm('Supprimer ce texte ?')) return
    await supabase.from('landing_textes').delete().eq('id', id)
    showSuccess('🗑️ Texte supprimé')
    fetchData()
  }

  const modifierTexte = async (id: string, texte: string) => {
    await supabase.from('landing_textes').update({ texte }).eq('id', id)
    showSuccess('✅ Texte modifié !')
    fetchData()
  }

  // PROMOS
  const ajouterPromo = async () => {
    if (!newPromo.nom) return
    setSaving(true)
    await supabase.from('landing_promos').insert({ ...newPromo, ordre: promos.length })
    setNewPromo({ nom: '', description: '', prix_original: 0, prix_promo: 0, badge: '', lien: '/catalogue', date_expiration: '', actif: true })
    showSuccess('✅ Promo ajoutée !')
    fetchData()
    setSaving(false)
  }

  const togglePromo = async (id: string, actif: boolean) => {
    await supabase.from('landing_promos').update({ actif: !actif }).eq('id', id)
    fetchData()
  }

  const supprimerPromo = async (id: string) => {
    if (!confirm('Supprimer cette promo ?')) return
    await supabase.from('landing_promos').delete().eq('id', id)
    showSuccess('🗑️ Promo supprimée')
    fetchData()
  }

  const inputStyle: any = {
    width: '100%', padding: '10px 12px', borderRadius: 9,
    background: '#f8f9fa', border: '1.5px solid #e5e5e5',
    color: '#1a1a1a', fontSize: 13, outline: 'none', boxSizing: 'border-box'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: "'Inter', sans-serif" }}>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: '#38bdf8', margin: 0, fontSize: 16, fontWeight: 700 }}>🎨 Configuration Landing Page</h1>
          <p style={{ color: '#94a3b8', margin: '2px 0 0', fontSize: 11 }}>Gérez le contenu affiché sur www.ckdress.store</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <a href="/" target="_blank"
            style={{ background: 'rgba(212,168,83,0.15)', border: '1px solid rgba(212,168,83,0.3)', borderRadius: 6, color: '#d4a853', padding: '6px 14px', fontSize: 11, cursor: 'pointer', textDecoration: 'none', fontWeight: 600 }}>
            👁️ Voir le site
          </a>
          <a href="/dashboard"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#94a3b8', padding: '6px 12px', fontSize: 11, textDecoration: 'none' }}>
            ← Dashboard
          </a>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {success && (
          <div style={{ background: '#f0fdf4', border: '1px solid #1D9E75', borderRadius: 10, padding: '10px 16px', color: '#1D9E75', fontSize: 13, marginBottom: 14, fontWeight: 600 }}>
            {success}
          </div>
        )}

        {/* TABS */}
        <div style={{ display: 'flex', background: '#fff', borderRadius: 12, padding: 4, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', gap: 2, marginBottom: 20, width: 'fit-content' }}>
          {[
            { key: 'textes', label: '📢 Textes défilants' },
            { key: 'promos', label: '🔥 Promotions' },
          ].map(o => (
            <button key={o.key} onClick={() => setOnglet(o.key as any)}
              style={{ padding: '9px 20px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: onglet === o.key ? '#0891b2' : 'transparent', color: onglet === o.key ? '#fff' : '#888' }}>
              {o.label}
            </button>
          ))}
        </div>

        {/* ONGLET TEXTES */}
        {onglet === 'textes' && (
          <div style={{ maxWidth: 700 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#0891b2' }}>➕ Ajouter un texte défilant</h3>
              <div style={{ display: 'flex', gap: 10 }}>
                <input value={newTexte} onChange={e => setNewTexte(e.target.value)}
                  placeholder="Ex: 🎉 Jusqu'au 31 Mai — Achetez 2 Polos livraison GRATUITE !"
                  onKeyDown={e => e.key === 'Enter' && ajouterTexte()}
                  style={{ ...inputStyle, flex: 1 }} />
                <button onClick={ajouterTexte} disabled={saving}
                  style={{ padding: '10px 20px', background: '#0891b2', border: 'none', borderRadius: 9, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}>
                  {saving ? '...' : '+ Ajouter'}
                </button>
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 11, color: '#aaa' }}>💡 Appuyez sur Entrée pour ajouter rapidement</p>
            </div>

            {/* Liste textes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {textes.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: 12, padding: '40px', textAlign: 'center', color: '#aaa', fontSize: 13 }}>
                  Aucun texte défilant — ajoutez-en un !
                </div>
              ) : textes.map((t, i) => (
                <div key={t.id} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: t.actif ? '1.5px solid rgba(8,145,178,0.2)' : '1.5px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#aaa', fontWeight: 600, minWidth: 20 }}>#{i + 1}</span>
                    <input
                      defaultValue={t.texte}
                      onBlur={e => { if (e.target.value !== t.texte) modifierTexte(t.id, e.target.value) }}
                      style={{ ...inputStyle, flex: 1, background: t.actif ? '#f0f9ff' : '#f8f9fa', color: t.actif ? '#0891b2' : '#aaa' }}
                    />
                    <button onClick={() => toggleTexte(t.id, t.actif)}
                      style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12, background: t.actif ? '#f0fdf4' : '#f5f5f5', color: t.actif ? '#1D9E75' : '#aaa', whiteSpace: 'nowrap' }}>
                      {t.actif ? '✅ Actif' : '⏸️ Inactif'}
                    </button>
                    <button onClick={() => supprimerTexte(t.id)}
                      style={{ padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#fff0f0', color: '#E24B4A', fontWeight: 600, fontSize: 12 }}>
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ONGLET PROMOS */}
        {onglet === 'promos' && (
          <div style={{ maxWidth: 800 }}>
            {/* Formulaire ajout promo */}
            <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#0891b2' }}>➕ Ajouter une promotion</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Nom produit *</label>
                  <input value={newPromo.nom} onChange={e => setNewPromo(p => ({ ...p, nom: e.target.value }))}
                    placeholder="Ex: Polo Classic" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Badge promo</label>
                  <input value={newPromo.badge} onChange={e => setNewPromo(p => ({ ...p, badge: e.target.value }))}
                    placeholder="Ex: 🔥 -20% ou 🎁 Livraison offerte" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Prix original (F)</label>
                  <input type="number" value={newPromo.prix_original} onChange={e => setNewPromo(p => ({ ...p, prix_original: Number(e.target.value) }))}
                    placeholder="Ex: 6000" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Prix promo (F)</label>
                  <input type="number" value={newPromo.prix_promo} onChange={e => setNewPromo(p => ({ ...p, prix_promo: Number(e.target.value) }))}
                    placeholder="Ex: 5000" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Description</label>
                  <input value={newPromo.description} onChange={e => setNewPromo(p => ({ ...p, description: e.target.value }))}
                    placeholder="Ex: Offre valable jusqu'au 31 mai" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Date expiration</label>
                  <input type="date" value={newPromo.date_expiration} onChange={e => setNewPromo(p => ({ ...p, date_expiration: e.target.value }))}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Lien catalogue</label>
                  <select value={newPromo.lien} onChange={e => setNewPromo(p => ({ ...p, lien: e.target.value }))}
                    style={{ ...inputStyle }}>
                    <option value="/catalogue">CK Design</option>
                    <option value="/succes-design/catalogue">Succès Design</option>
                  </select>
                </div>
              </div>
              <button onClick={ajouterPromo} disabled={saving}
                style={{ padding: '11px 28px', background: '#0891b2', border: 'none', borderRadius: 9, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                {saving ? '...' : '🔥 Ajouter la promotion'}
              </button>
            </div>

            {/* Liste promos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {promos.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: 12, padding: '40px', textAlign: 'center', color: '#aaa', fontSize: 13 }}>
                  Aucune promotion — ajoutez-en une !
                </div>
              ) : promos.map((p, i) => (
                <div key={p.id} style={{ background: '#fff', borderRadius: 12, padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: p.actif ? '1.5px solid rgba(8,145,178,0.2)' : '1.5px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{p.nom}</span>
                        {p.badge && <span style={{ background: '#E24B4A', color: '#fff', fontSize: 10, padding: '2px 8px', borderRadius: 100, fontWeight: 700 }}>{p.badge}</span>}
                        {p.date_expiration && <span style={{ fontSize: 11, color: '#aaa' }}>Expire: {new Date(p.date_expiration).toLocaleDateString('fr-FR')}</span>}
                      </div>
                      <p style={{ margin: 0, fontSize: 12, color: '#888' }}>{p.description}</p>
                      <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                        <span style={{ fontSize: 12, color: '#aaa', textDecoration: 'line-through' }}>{p.prix_original?.toLocaleString()} F</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#d4a853' }}>{p.prix_promo?.toLocaleString()} F</span>
                        <span style={{ fontSize: 11, color: '#0891b2' }}>{p.lien === '/catalogue' ? 'CK Design' : 'Succès Design'}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button onClick={() => togglePromo(p.id, p.actif)}
                        style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12, background: p.actif ? '#f0fdf4' : '#f5f5f5', color: p.actif ? '#1D9E75' : '#aaa' }}>
                        {p.actif ? '✅ Active' : '⏸️ Inactive'}
                      </button>
                      <button onClick={() => supprimerPromo(p.id)}
                        style={{ padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#fff0f0', color: '#E24B4A', fontWeight: 600, fontSize: 12 }}>
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}