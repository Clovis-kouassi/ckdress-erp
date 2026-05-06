'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const STATUTS: Record<string, { label: string; color: string }> = {
  nouveau: { label: 'Nouveau', color: '#E24B4A' },
  en_preparation: { label: 'En préparation', color: '#378ADD' },
  en_livraison: { label: 'En livraison', color: '#EF9F27' },
  livre: { label: 'Livré', color: '#1D9E75' },
  annule: { label: 'Annulé', color: '#555' },
}

export default function CommercialPage() {
  const [commandes, setCommandes] = useState<any[]>([])
  const [produits, setProduits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet] = useState<'commandes' | 'nouvelle' | 'stats'>('commandes')
  const [user, setUser] = useState<any>(null)
  const [form, setForm] = useState({
    telephone: '', adresse: '', produit_ref: '',
    taille: '', variantes: '', montant_total: 0,
    frais_livraison: 1500, note: ''
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('ck_user') || '{}')
    setUser(u)
    fetchData()
  }, [])

  const fetchData = async () => {
    const [{ data: cmds }, { data: prods }] = await Promise.all([
      supabase.from('commandes_catalogue').select('*').order('created_at', { ascending: false }),
      supabase.from('produits').select('*').eq('disponible', true),
    ])
    setCommandes(cmds || [])
    setProduits(prods || [])
    setLoading(false)
  }

  const creerCommande = async () => {
    if (!form.telephone || !form.produit_ref) return
    setSaving(true)
    const ref = Math.random().toString(36).slice(2, 8).toUpperCase()
    await supabase.from('commandes_catalogue').insert({
      ...form,
      statut: 'nouveau',
      source: 'commercial',
      note: `REF: ${ref} | Créé par commercial`,
    })
    setForm({ telephone: '', adresse: '', produit_ref: '', taille: '', variantes: '', montant_total: 0, frais_livraison: 1500, note: '' })
    setSuccess('✅ Commande créée !')
    setTimeout(() => setSuccess(''), 2000)
    fetchData()
    setOnglet('commandes')
    setSaving(false)
  }

  const caTotal = commandes.reduce((s, c) => s + (c.montant_total || 0), 0)
  const caJour = commandes.filter(c => c.created_at?.startsWith(new Date().toISOString().split('T')[0])).reduce((s, c) => s + (c.montant_total || 0), 0)
  const nouvelles = commandes.filter(c => c.statut === 'nouveau').length
  const livrees = commandes.filter(c => c.statut === 'livre').length

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: 'sans-serif', color: 'white' }}>

      {/* HEADER */}
      <div style={{ background: '#111', borderBottom: '1px solid #222', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: '#378ADD', margin: 0, fontSize: '16px', fontWeight: 700 }}>💼 Espace Commercial</h1>
          <p style={{ color: '#555', margin: '2px 0 0', fontSize: '11px' }}>{user?.nom} — {user?.activite}</p>
        </div>
        <button onClick={() => { localStorage.removeItem('ck_user'); window.location.href = '/login' }}
          style={{ background: 'none', border: '0.5px solid #333', borderRadius: '6px', color: '#555', padding: '5px 10px', fontSize: '11px', cursor: 'pointer' }}>
          Déconnexion
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', padding: '16px 16px 0' }}>
        {[
          { label: 'CA Total', value: caTotal.toLocaleString('fr-FR') + ' F', color: '#378ADD' },
          { label: "CA aujourd'hui", value: caJour.toLocaleString('fr-FR') + ' F', color: '#1D9E75' },
          { label: 'Nouvelles', value: nouvelles, color: '#E24B4A' },
          { label: 'Livrées', value: livrees, color: '#1D9E75' },
        ].map((k, i) => (
          <div key={i} style={{ background: '#111', border: '1px solid #222', borderRadius: '10px', padding: '12px 14px' }}>
            <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', marginBottom: '4px' }}>{k.label}</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* ONGLETS */}
      <div style={{ display: 'flex', borderBottom: '1px solid #222', background: '#111', margin: '16px 0 0' }}>
        {[
          { key: 'commandes', label: '📦 Commandes' },
          { key: 'nouvelle', label: '➕ Nouvelle commande' },
          { key: 'stats', label: '📊 Statistiques' },
        ].map(o => (
          <button key={o.key} onClick={() => setOnglet(o.key as any)}
            style={{ flex: 1, padding: '12px', background: 'transparent', border: 'none', color: onglet === o.key ? '#378ADD' : '#555', fontSize: '13px', fontWeight: 600, cursor: 'pointer', borderBottom: onglet === o.key ? '2px solid #378ADD' : '2px solid transparent' }}>
            {o.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px' }}>
        {success && (
          <div style={{ background: '#0a2a1a', border: '1px solid #1D9E75', borderRadius: '8px', padding: '10px 16px', color: '#1D9E75', fontSize: '13px', marginBottom: '12px' }}>
            {success}
          </div>
        )}

        {/* COMMANDES */}
        {onglet === 'commandes' && (
          <div>
            {loading ? <p style={{ color: '#555' }}>Chargement...</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {commandes.map(cmd => (
                  <div key={cmd.id} style={{ background: '#111', border: '1px solid #222', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '10px', color: '#555' }}>#{cmd.id.slice(0, 6).toUpperCase()}</span>
                        <span style={{ fontSize: '10px', background: (STATUTS[cmd.statut]?.color || '#555') + '22', color: STATUTS[cmd.statut]?.color || '#555', padding: '2px 8px', borderRadius: '10px' }}>
                          {STATUTS[cmd.statut]?.label || cmd.statut}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>{cmd.produit_ref} — Taille {cmd.taille}</p>
                      <p style={{ margin: '2px 0 0', color: '#888', fontSize: '12px' }}>📞 {cmd.telephone} · 📍 {cmd.adresse}</p>
                      <p style={{ margin: '2px 0 0', color: '#555', fontSize: '11px' }}>
                        {new Date(cmd.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span style={{ color: '#1D9E75', fontWeight: 700, fontSize: '14px' }}>{cmd.montant_total?.toLocaleString('fr-FR')} F</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* NOUVELLE COMMANDE */}
        {onglet === 'nouvelle' && (
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '20px', maxWidth: '500px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: '#378ADD' }}>➕ Nouvelle commande client</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Téléphone client *</label>
                <input value={form.telephone} onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))}
                  placeholder="Ex: 0700000000"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#1a1a1a', border: '1px solid #333', color: 'white', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Adresse livraison</label>
                <input value={form.adresse} onChange={e => setForm(p => ({ ...p, adresse: e.target.value }))}
                  placeholder="Quartier, rue..."
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#1a1a1a', border: '1px solid #333', color: 'white', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Produit *</label>
                <select value={form.produit_ref} onChange={e => {
                  const prod = produits.find(p => p.reference === e.target.value)
                  setForm(p => ({ ...p, produit_ref: e.target.value, montant_total: (prod?.prix_vente || 0) + p.frais_livraison }))
                }}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#1a1a1a', border: '1px solid #333', color: 'white', fontSize: '13px' }}>
                  <option value="">Choisir un produit...</option>
                  {produits.map(p => <option key={p.id} value={p.reference}>{p.nom} — {p.prix_vente?.toLocaleString('fr-FR')} F</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Taille</label>
                  <select value={form.taille} onChange={e => setForm(p => ({ ...p, taille: e.target.value }))}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#1a1a1a', border: '1px solid #333', color: 'white', fontSize: '13px' }}>
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Couleur(s)</label>
                  <input value={form.variantes} onChange={e => setForm(p => ({ ...p, variantes: e.target.value }))}
                    placeholder="Ex: Noir, Blanc"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#1a1a1a', border: '1px solid #333', color: 'white', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Note</label>
                <input value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                  placeholder="Note optionnelle..."
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#1a1a1a', border: '1px solid #333', color: 'white', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ background: '#0a1a12', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#666' }}>Total</span>
                <span style={{ color: '#1D9E75', fontWeight: 700 }}>{form.montant_total.toLocaleString('fr-FR')} F</span>
              </div>
              <button onClick={creerCommande} disabled={saving}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#378ADD', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>
                {saving ? '...' : '✅ Créer la commande'}
              </button>
            </div>
          </div>
        )}

        {/* STATS */}
        {onglet === 'stats' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              {Object.entries(STATUTS).map(([key, val]) => {
                const count = commandes.filter(c => c.statut === key).length
                const ca = commandes.filter(c => c.statut === key).reduce((s, c) => s + (c.montant_total || 0), 0)
                return (
                  <div key={key} style={{ background: '#111', border: '1px solid #222', borderRadius: '10px', padding: '14px' }}>
                    <div style={{ fontSize: '11px', color: val.color, textTransform: 'uppercase', marginBottom: '6px' }}>{val.label}</div>
                    <div style={{ fontSize: '22px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>{count}</div>
                    <div style={{ fontSize: '12px', color: '#1D9E75' }}>{ca.toLocaleString('fr-FR')} F</div>
                  </div>
                )
              })}
            </div>

            {/* Top produits */}
            <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '16px' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '13px', color: '#888', textTransform: 'uppercase' }}>🏆 Top produits commandés</h3>
              {Object.entries(
                commandes.reduce((acc: any, c) => {
                  acc[c.produit_ref] = (acc[c.produit_ref] || 0) + 1
                  return acc
                }, {})
              ).sort(([,a]: any, [,b]: any) => b - a).slice(0, 5).map(([ref, count]: any) => (
                <div key={ref} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1a1a1a' }}>
                  <span style={{ color: '#888', fontSize: '13px' }}>{ref}</span>
                  <span style={{ color: '#378ADD', fontWeight: 600, fontSize: '13px' }}>{count} commandes</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}