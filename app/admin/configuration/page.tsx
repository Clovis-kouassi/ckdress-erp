'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ConfigurationPage() {
  const [onglet, setOnglet] = useState<'apparence' | 'tarifs' | 'promotions' | 'contact' | 'systeme'>('apparence')
  const [config, setConfig] = useState<Record<string, string>>({})
  const [fraisLivraison, setFraisLivraison] = useState<any[]>([])
  const [promotions, setPromotions] = useState<any[]>([])
  const [ventesFlash, setVentesFlash] = useState<any[]>([])
  const [produits, setProduits] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  // Formulaires
  const [promoForm, setPromoForm] = useState({ code: '', type: 'pourcentage', valeur: 0, date_fin: '' })
  const [flashForm, setFlashForm] = useState({ produit_id: '', prix_flash: 0, date_debut: '', date_fin: '' })
  const [newCommune, setNewCommune] = useState({ commune: '', montant: 1500 })

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const [{ data: cfg }, { data: frais }, { data: promos }, { data: flash }, { data: prods }] = await Promise.all([
      supabase.from('configuration').select('*'),
      supabase.from('frais_livraison').select('*').order('commune'),
      supabase.from('promotions').select('*').order('created_at', { ascending: false }),
      supabase.from('ventes_flash').select('*, produits(nom, prix_vente)').order('created_at', { ascending: false }),
      supabase.from('produits').select('id, nom, prix_vente').eq('disponible', true).order('nom'),
    ])
    const cfgMap: Record<string, string> = {}
    cfg?.forEach(c => { cfgMap[c.cle] = c.valeur })
    setConfig(cfgMap)
    setFraisLivraison(frais || [])
    setPromotions(promos || [])
    setVentesFlash(flash || [])
    setProduits(prods || [])
  }

  const saveConfig = async (cle: string, valeur: string) => {
    await supabase.from('configuration').upsert({ cle, valeur, updated_at: new Date().toISOString() }, { onConflict: 'cle' })
    showSuccess('✅ Sauvegardé !')
    fetchAll()
  }

  const updateFrais = async (id: string, montant: number) => {
    await supabase.from('frais_livraison').update({ montant }).eq('id', id)
    showSuccess('✅ Frais mis à jour !')
    fetchAll()
  }

  const toggleFrais = async (id: string, actif: boolean) => {
    await supabase.from('frais_livraison').update({ actif: !actif }).eq('id', id)
    fetchAll()
  }

  const addCommune = async () => {
    if (!newCommune.commune) return
    await supabase.from('frais_livraison').insert(newCommune)
    setNewCommune({ commune: '', montant: 1500 })
    showSuccess('✅ Commune ajoutée !')
    fetchAll()
  }

  const deleteCommune = async (id: string) => {
    if (!confirm('Supprimer cette commune ?')) return
    await supabase.from('frais_livraison').delete().eq('id', id)
    fetchAll()
  }

  const addPromo = async () => {
    if (!promoForm.code || !promoForm.valeur) return
    setSaving(true)
    await supabase.from('promotions').insert({ ...promoForm, actif: true })
    setPromoForm({ code: '', type: 'pourcentage', valeur: 0, date_fin: '' })
    showSuccess('✅ Promotion créée !')
    fetchAll()
    setSaving(false)
  }

  const togglePromo = async (id: string, actif: boolean) => {
    await supabase.from('promotions').update({ actif: !actif }).eq('id', id)
    fetchAll()
  }

  const deletePromo = async (id: string) => {
    if (!confirm('Supprimer cette promotion ?')) return
    await supabase.from('promotions').delete().eq('id', id)
    fetchAll()
  }

  const addFlash = async () => {
    if (!flashForm.produit_id || !flashForm.prix_flash || !flashForm.date_debut || !flashForm.date_fin) return
    setSaving(true)
    await supabase.from('ventes_flash').insert({ ...flashForm, actif: true })
    setFlashForm({ produit_id: '', prix_flash: 0, date_debut: '', date_fin: '' })
    showSuccess('✅ Vente flash créée !')
    fetchAll()
    setSaving(false)
  }

  const toggleFlash = async (id: string, actif: boolean) => {
    await supabase.from('ventes_flash').update({ actif: !actif }).eq('id', id)
    fetchAll()
  }

  const deleteFlash = async (id: string) => {
    if (!confirm('Supprimer cette vente flash ?')) return
    await supabase.from('ventes_flash').delete().eq('id', id)
    fetchAll()
  }

  const showSuccess = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: '9px',
    background: '#f8f9fa', border: '1.5px solid #e5e5e5',
    color: '#1a1a1a', fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const
  }

  const labelStyle = {
    fontSize: '12px', fontWeight: 600 as const, color: '#555', display: 'block' as const, marginBottom: 6
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: "'Inter', sans-serif", color: '#1a1a1a' }}>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>
        <div>
          <h1 style={{ color: '#38bdf8', margin: 0, fontSize: '16px', fontWeight: 700 }}>⚙️ Configuration</h1>
          <p style={{ color: '#94a3b8', margin: '2px 0 0', fontSize: '11px' }}>Paramètres généraux du système</p>
        </div>
        <a href="/dashboard" style={{ padding: '7px 14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#94a3b8', textDecoration: 'none', fontSize: '12px' }}>
          ← Dashboard
        </a>
      </div>

      {/* ONGLETS */}
      <div style={{ display: 'flex', background: '#fff', margin: '16px 24px 0', borderRadius: '12px', padding: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', gap: '4px', overflowX: 'auto' }}>
        {[
          { key: 'apparence', label: '🎨 Apparence' },
          { key: 'tarifs', label: '💰 Tarifs' },
          { key: 'promotions', label: '🏷️ Promotions' },
          { key: 'contact', label: '📱 Contact' },
          { key: 'systeme', label: '⚙️ Système' },
        ].map(o => (
          <button key={o.key} onClick={() => setOnglet(o.key as any)}
            style={{ flexShrink: 0, padding: '10px 16px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, background: onglet === o.key ? '#0891b2' : 'transparent', color: onglet === o.key ? '#fff' : '#888' }}>
            {o.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px 24px' }}>

        {success && (
          <div style={{ background: '#f0fdf4', border: '1px solid #1D9E75', borderRadius: '10px', padding: '10px 16px', color: '#1D9E75', fontSize: '13px', marginBottom: '16px', fontWeight: 600 }}>
            {success}
          </div>
        )}

        {/* ONGLET APPARENCE */}
        {onglet === 'apparence' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Message bandeau */}
            <div style={{ background: '#fff', borderRadius: '14px', padding: '22px', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#1a1a1a' }}>📢 Message bandeau défilant</h3>
              <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#888' }}>Affiché en haut du catalogue client</p>
              <textarea
                value={config.message_bandeau || ''}
                onChange={e => setConfig(p => ({ ...p, message_bandeau: e.target.value }))}
                rows={2}
                placeholder="Ex: Livraison gratuite aujourd'hui ! 🚚"
                style={{ ...inputStyle, resize: 'vertical' }}
              />
              <button onClick={() => saveConfig('message_bandeau', config.message_bandeau || '')}
                style={{ marginTop: 10, padding: '9px 20px', background: '#0891b2', border: 'none', borderRadius: '9px', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                💾 Sauvegarder
              </button>
            </div>

            {/* Bannière */}
            <div style={{ background: '#fff', borderRadius: '14px', padding: '22px', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#1a1a1a' }}>🖼️ Bannière page d'accueil</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Titre principal</label>
                  <input value={config.banniere_titre || ''} onChange={e => setConfig(p => ({ ...p, banniere_titre: e.target.value }))}
                    placeholder="Style & Élégance" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Sous-titre</label>
                  <input value={config.banniere_sous_titre || ''} onChange={e => setConfig(p => ({ ...p, banniere_sous_titre: e.target.value }))}
                    placeholder="Collection CK Dress — Abidjan" style={inputStyle} />
                </div>
              </div>
              <button onClick={() => {
                saveConfig('banniere_titre', config.banniere_titre || '')
                saveConfig('banniere_sous_titre', config.banniere_sous_titre || '')
              }}
                style={{ marginTop: 12, padding: '9px 20px', background: '#0891b2', border: 'none', borderRadius: '9px', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                💾 Sauvegarder
              </button>
            </div>

            {/* Publicité */}
            <div style={{ background: '#fff', borderRadius: '14px', padding: '22px', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#1a1a1a' }}>📣 Texte publicitaire</h3>
              <textarea
                value={config.pub_texte || ''}
                onChange={e => setConfig(p => ({ ...p, pub_texte: e.target.value }))}
                rows={2}
                placeholder="Ex: Nouvelle collection disponible ! Commandez maintenant 🔥"
                style={{ ...inputStyle, resize: 'vertical' }}
              />
              <button onClick={() => saveConfig('pub_texte', config.pub_texte || '')}
                style={{ marginTop: 10, padding: '9px 20px', background: '#0891b2', border: 'none', borderRadius: '9px', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                💾 Sauvegarder
              </button>
            </div>
          </div>
        )}

        {/* ONGLET TARIFS */}
        {onglet === 'tarifs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Ajouter commune */}
            <div style={{ background: '#fff', borderRadius: '14px', padding: '22px', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#1a1a1a' }}>➕ Ajouter une commune</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
                <div>
                  <label style={labelStyle}>Nom de la commune</label>
                  <input value={newCommune.commune} onChange={e => setNewCommune(p => ({ ...p, commune: e.target.value }))}
                    placeholder="Ex: Cocody" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Frais (F CFA)</label>
                  <input type="number" value={newCommune.montant} onChange={e => setNewCommune(p => ({ ...p, montant: Number(e.target.value) }))}
                    style={inputStyle} />
                </div>
                <button onClick={addCommune}
                  style={{ padding: '10px 18px', background: '#1D9E75', border: 'none', borderRadius: '9px', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '13px', whiteSpace: 'nowrap' }}>
                  + Ajouter
                </button>
              </div>
            </div>

            {/* Liste communes */}
            <div style={{ background: '#fff', borderRadius: '14px', padding: '22px', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#1a1a1a' }}>🚚 Frais de livraison par commune</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {fraisLivraison.map(f => (
                  <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: f.actif ? '#f8f9fa' : '#f0f0f0', borderRadius: '10px', padding: '12px 16px', border: `1px solid ${f.actif ? '#e5e7eb' : '#ddd'}`, gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: f.actif ? '#1a1a1a' : '#aaa', minWidth: 120 }}>
                        📍 {f.commune}
                      </span>
                      <span style={{ fontSize: '11px', background: f.actif ? '#f0fdf4' : '#f5f5f5', color: f.actif ? '#1D9E75' : '#aaa', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>
                        {f.actif ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="number"
                        defaultValue={f.montant}
                        onBlur={e => updateFrais(f.id, Number(e.target.value))}
                        style={{ width: 100, padding: '7px 10px', borderRadius: '8px', border: '1.5px solid #0891b2', fontSize: '13px', fontWeight: 700, color: '#0891b2', outline: 'none', textAlign: 'center' }}
                      />
                      <span style={{ fontSize: '12px', color: '#888' }}>F CFA</span>
                      <button onClick={() => toggleFrais(f.id, f.actif)}
                        style={{ padding: '6px 12px', background: 'transparent', border: `1.5px solid ${f.actif ? '#E24B4A' : '#1D9E75'}`, color: f.actif ? '#E24B4A' : '#1D9E75', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                        {f.actif ? 'Désactiver' : 'Activer'}
                      </button>
                      <button onClick={() => deleteCommune(f.id)}
                        style={{ padding: '6px 10px', background: '#fff0f0', border: 'none', color: '#E24B4A', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ONGLET PROMOTIONS */}
        {onglet === 'promotions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Codes promo */}
            <div style={{ background: '#fff', borderRadius: '14px', padding: '22px', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#1a1a1a' }}>🎟️ Créer un code promo</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>Code *</label>
                  <input value={promoForm.code} onChange={e => setPromoForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                    placeholder="Ex: SUMMER20" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Type</label>
                  <select value={promoForm.type} onChange={e => setPromoForm(p => ({ ...p, type: e.target.value }))} style={inputStyle}>
                    <option value="pourcentage">Pourcentage (%)</option>
                    <option value="montant">Montant fixe (F)</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Valeur *</label>
                  <input type="number" value={promoForm.valeur} onChange={e => setPromoForm(p => ({ ...p, valeur: Number(e.target.value) }))}
                    placeholder={promoForm.type === 'pourcentage' ? 'Ex: 20' : 'Ex: 5000'} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Date fin</label>
                  <input type="datetime-local" value={promoForm.date_fin} onChange={e => setPromoForm(p => ({ ...p, date_fin: e.target.value }))}
                    style={inputStyle} />
                </div>
              </div>
              <button onClick={addPromo} disabled={saving}
                style={{ padding: '10px 24px', background: '#7c3aed', border: 'none', borderRadius: '9px', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}>
                {saving ? '...' : '+ Créer le code promo'}
              </button>
            </div>

            {/* Liste promos */}
            <div style={{ background: '#fff', borderRadius: '14px', padding: '22px', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 700, color: '#1a1a1a' }}>🎟️ Codes promo existants</h3>
              {promotions.length === 0 ? (
                <p style={{ color: '#aaa', fontSize: '13px' }}>Aucun code promo créé.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {promotions.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa', borderRadius: '10px', padding: '12px 16px', border: '1px solid #e5e7eb', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: '15px', color: '#7c3aed', fontFamily: 'monospace' }}>{p.code}</span>
                        <span style={{ marginLeft: 10, fontSize: '13px', color: '#555' }}>
                          {p.type === 'pourcentage' ? `${p.valeur}% de réduction` : `${p.valeur.toLocaleString('fr-FR')} F de réduction`}
                        </span>
                        {p.date_fin && (
                          <span style={{ marginLeft: 10, fontSize: '11px', color: '#aaa' }}>
                            expire le {new Date(p.date_fin).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <span style={{ fontSize: '11px', background: p.actif ? '#f0fdf4' : '#f5f5f5', color: p.actif ? '#1D9E75' : '#aaa', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>
                          {p.actif ? 'Actif' : 'Inactif'}
                        </span>
                        <button onClick={() => togglePromo(p.id, p.actif)}
                          style={{ padding: '5px 12px', background: 'transparent', border: `1.5px solid ${p.actif ? '#E24B4A' : '#1D9E75'}`, color: p.actif ? '#E24B4A' : '#1D9E75', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                          {p.actif ? 'Désactiver' : 'Activer'}
                        </button>
                        <button onClick={() => deletePromo(p.id)}
                          style={{ padding: '5px 10px', background: '#fff0f0', border: 'none', color: '#E24B4A', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ventes flash */}
            <div style={{ background: '#fff', borderRadius: '14px', padding: '22px', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#1a1a1a' }}>⚡ Créer une vente flash</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>Produit *</label>
                  <select value={flashForm.produit_id} onChange={e => setFlashForm(p => ({ ...p, produit_id: e.target.value }))} style={inputStyle}>
                    <option value="">Choisir un produit...</option>
                    {produits.map(p => <option key={p.id} value={p.id}>{p.nom} — {p.prix_vente?.toLocaleString('fr-FR')} F</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Prix flash (F) *</label>
                  <input type="number" value={flashForm.prix_flash} onChange={e => setFlashForm(p => ({ ...p, prix_flash: Number(e.target.value) }))}
                    placeholder="Prix réduit" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Début *</label>
                  <input type="datetime-local" value={flashForm.date_debut} onChange={e => setFlashForm(p => ({ ...p, date_debut: e.target.value }))}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Fin *</label>
                  <input type="datetime-local" value={flashForm.date_fin} onChange={e => setFlashForm(p => ({ ...p, date_fin: e.target.value }))}
                    style={inputStyle} />
                </div>
              </div>
              <button onClick={addFlash} disabled={saving}
                style={{ padding: '10px 24px', background: '#E24B4A', border: 'none', borderRadius: '9px', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}>
                {saving ? '...' : '⚡ Créer la vente flash'}
              </button>
            </div>

            {/* Liste ventes flash */}
            {ventesFlash.length > 0 && (
              <div style={{ background: '#fff', borderRadius: '14px', padding: '22px', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 700, color: '#1a1a1a' }}>⚡ Ventes flash actives</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {ventesFlash.map(v => (
                    <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff8e6', borderRadius: '10px', padding: '12px 16px', border: '1px solid #fde68a', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: '#1a1a1a' }}>{v.produits?.nom}</span>
                        <span style={{ marginLeft: 10, fontSize: '13px', color: '#E24B4A', fontWeight: 700 }}>
                          {v.prix_flash?.toLocaleString('fr-FR')} F
                        </span>
                        <span style={{ marginLeft: 6, fontSize: '11px', color: '#aaa', textDecoration: 'line-through' }}>
                          {v.produits?.prix_vente?.toLocaleString('fr-FR')} F
                        </span>
                        <span style={{ marginLeft: 10, fontSize: '11px', color: '#888' }}>
                          jusqu'au {new Date(v.date_fin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => toggleFlash(v.id, v.actif)}
                          style={{ padding: '5px 12px', background: 'transparent', border: `1.5px solid ${v.actif ? '#E24B4A' : '#1D9E75'}`, color: v.actif ? '#E24B4A' : '#1D9E75', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                          {v.actif ? 'Désactiver' : 'Activer'}
                        </button>
                        <button onClick={() => deleteFlash(v.id)}
                          style={{ padding: '5px 10px', background: '#fff0f0', border: 'none', color: '#E24B4A', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ONGLET CONTACT */}
        {onglet === 'contact' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#fff', borderRadius: '14px', padding: '22px', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: 700, color: '#1a1a1a' }}>📱 Informations de contact</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>📞 Numéro WhatsApp (avec indicatif)</label>
                  <input value={config.whatsapp || ''} onChange={e => setConfig(p => ({ ...p, whatsapp: e.target.value }))}
                    placeholder="Ex: 2250700000000" style={inputStyle} />
                  <button onClick={() => saveConfig('whatsapp', config.whatsapp || '')}
                    style={{ marginTop: 8, padding: '8px 18px', background: '#25D366', border: 'none', borderRadius: '9px', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                    💾 Sauvegarder
                  </button>
                </div>
                <div>
                  <label style={labelStyle}>🕐 Horaires d'ouverture</label>
                  <input value={config.horaires || ''} onChange={e => setConfig(p => ({ ...p, horaires: e.target.value }))}
                    placeholder="Ex: Lun-Sam : 8h-20h" style={inputStyle} />
                  <button onClick={() => saveConfig('horaires', config.horaires || '')}
                    style={{ marginTop: 8, padding: '8px 18px', background: '#0891b2', border: 'none', borderRadius: '9px', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                    💾 Sauvegarder
                  </button>
                </div>
                <div>
                  <label style={labelStyle}>📍 Adresse physique</label>
                  <input value={config.adresse_physique || ''} onChange={e => setConfig(p => ({ ...p, adresse_physique: e.target.value }))}
                    placeholder="Ex: Cocody, Abidjan" style={inputStyle} />
                  <button onClick={() => saveConfig('adresse_physique', config.adresse_physique || '')}
                    style={{ marginTop: 8, padding: '8px 18px', background: '#0891b2', border: 'none', borderRadius: '9px', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                    💾 Sauvegarder
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ONGLET SYSTEME */}
        {onglet === 'systeme' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Mode maintenance */}
            <div style={{ background: '#fff', borderRadius: '14px', padding: '22px', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 700, color: '#1a1a1a' }}>🔧 Mode maintenance</h3>
              <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#888' }}>Active le mode maintenance sur le catalogue client. Les clients verront un message d'indisponibilité.</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ background: config.mode_maintenance === 'true' ? '#fff0f0' : '#f0fdf4', border: `1px solid ${config.mode_maintenance === 'true' ? '#fecaca' : '#bbf7d0'}`, borderRadius: '10px', padding: '12px 20px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: config.mode_maintenance === 'true' ? '#E24B4A' : '#1D9E75' }}>
                    {config.mode_maintenance === 'true' ? '🔴 Maintenance activée' : '🟢 Site en ligne'}
                  </span>
                </div>
                <button onClick={() => saveConfig('mode_maintenance', config.mode_maintenance === 'true' ? 'false' : 'true')}
                  style={{ padding: '10px 20px', background: config.mode_maintenance === 'true' ? '#1D9E75' : '#E24B4A', border: 'none', borderRadius: '9px', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}>
                  {config.mode_maintenance === 'true' ? '✅ Désactiver la maintenance' : '🔧 Activer la maintenance'}
                </button>
              </div>
            </div>

            {/* Raccourcis */}
            <div style={{ background: '#fff', borderRadius: '14px', padding: '22px', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#1a1a1a' }}>🔗 Raccourcis</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                {[
                  { label: '👥 Utilisateurs', href: '/admin/utilisateurs', color: '#7c3aed' },
                  { label: '📦 Commandes', href: '/commandes', color: '#E24B4A' },
                  { label: '🚚 Livraisons', href: '/livraisons', color: '#EF9F27' },
                  { label: '📦 Stock', href: '/gestionnaire-stock', color: '#0891b2' },
                  { label: '🎨 Catalogue CK', href: '/catalogue', color: '#1D9E75' },
                  { label: '✨ Catalogue SD', href: '/succes-design/catalogue', color: '#d4a853' },
                ].map(l => (
                  <a key={l.href} href={l.href}
                    style={{ display: 'block', padding: '12px 16px', background: l.color + '11', border: `1.5px solid ${l.color}33`, borderRadius: '10px', textDecoration: 'none', color: l.color, fontSize: '13px', fontWeight: 600, textAlign: 'center' }}>
                    {l.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}