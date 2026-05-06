'use client'
import { useEffect, useState, useRef } from 'react'
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
  annule: { label: 'Annulé', color: '#999' },
}

const CATEGORIES_DEPENSE = ['Achat stock', 'Transport', 'Salaires', 'Loyer', 'Marketing', 'Autre']

export default function Dashboard() {
  const [commandes, setCommandes] = useState<any[]>([])
  const [depenses, setDepenses] = useState<any[]>([])
  const [ventesB, setVentesB] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, count: 0, nouvelles: 0, enLivraison: 0 })
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<any[]>([])
  const [badge, setBadge] = useState(0)
  const [showNotifs, setShowNotifs] = useState(false)
  const [onglet, setOnglet] = useState<'overview' | 'comptabilite'>('overview')
  const [showDepenseForm, setShowDepenseForm] = useState(false)
  const [depenseForm, setDepenseForm] = useState({ libelle: '', montant: 0, categorie: 'Achat stock', activite: 'ck_design', date_depense: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('ck_user') || '{}')
    setUser(u)
    fetchData()
    setupRealtime()
    return () => { supabase.removeAllChannels() }
  }, [])

  const playSound = () => {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.4)
    } catch (e) {}
  }

  const setupRealtime = () => {
    supabase.channel('commandes_realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'commandes_catalogue' }, (payload) => {
        const cmd = payload.new as any
        const ancien = payload.old as any
        if (cmd.statut !== ancien.statut) {
          setNotifications(prev => [{ id: Date.now(), message: `Commande #${cmd.id.slice(0, 6).toUpperCase()} → ${STATUTS[cmd.statut]?.label}`, statut: cmd.statut, time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }, ...prev].slice(0, 20))
          setBadge(prev => prev + 1)
          playSound()
          fetchData()
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'commandes_catalogue' }, (payload) => {
        const cmd = payload.new as any
        setNotifications(prev => [{ id: Date.now(), message: `Nouvelle commande #${cmd.id.slice(0, 6).toUpperCase()} — ${cmd.telephone}`, statut: 'nouveau', time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }, ...prev].slice(0, 20))
        setBadge(prev => prev + 1)
        playSound()
        fetchData()
      })
      .subscribe()
  }

  async function fetchData() {
    const [{ data: cmds }, { data: all }, { data: deps }, { data: ventes }] = await Promise.all([
      supabase.from('commandes_catalogue').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('commandes_catalogue').select('montant_total, statut, note, created_at'),
      supabase.from('depenses').select('*').order('date_depense', { ascending: false }),
      supabase.from('ventes_boutique').select('total, created_at'),
    ])
    const caTotal = all?.reduce((s, c) => s + (c.montant_total || 0), 0) || 0
    setCommandes(cmds || [])
    setDepenses(deps || [])
    setVentesB(ventes || [])
    setStats({
      total: caTotal,
      count: all?.length || 0,
      nouvelles: all?.filter(c => c.statut === 'nouveau').length || 0,
      enLivraison: all?.filter(c => c.statut === 'en_livraison').length || 0,
    })
    setLoading(false)
  }

  const ajouterDepense = async () => {
    if (!depenseForm.libelle || !depenseForm.montant) return
    setSaving(true)
    await supabase.from('depenses').insert(depenseForm)
    setDepenseForm({ libelle: '', montant: 0, categorie: 'Achat stock', activite: 'ck_design', date_depense: new Date().toISOString().split('T')[0] })
    setShowDepenseForm(false)
    fetchData()
    setSaving(false)
  }

  const caCommandes = stats.total
  const caVentesBoutiques = ventesB.reduce((s, v) => s + (v.total || 0), 0)
  const caTotal = caCommandes + caVentesBoutiques
  const totalDepenses = depenses.reduce((s, d) => s + (d.montant || 0), 0)
  const benefice = caTotal - totalDepenses
  const caCKDesign = commandes.filter(c => !c.note?.includes('EXPÉDITION')).reduce((s, c) => s + (c.montant_total || 0), 0)
  const caSuccesDesign = commandes.filter(c => c.note?.includes('EXPÉDITION')).reduce((s, c) => s + (c.montant_total || 0), 0)
  const depensesCKDesign = depenses.filter(d => d.activite === 'ck_design').reduce((s, d) => s + (d.montant || 0), 0)
  const depensesSuccesDesign = depenses.filter(d => d.activite === 'succes_design').reduce((s, d) => s + (d.montant || 0), 0)
  const caJour = commandes.filter(c => c.created_at?.startsWith(new Date().toISOString().split('T')[0])).reduce((s, c) => s + (c.montant_total || 0), 0)
  const caSemaine = commandes.filter(c => new Date(c.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).reduce((s, c) => s + (c.montant_total || 0), 0)
  const depensesParCategorie = CATEGORIES_DEPENSE.map(cat => ({ cat, total: depenses.filter(d => d.categorie === cat).reduce((s, d) => s + (d.montant || 0), 0) })).filter(c => c.total > 0)
  const derniers7Jours = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000)
    const dateStr = date.toISOString().split('T')[0]
    const ca = commandes.filter(c => c.created_at?.startsWith(dateStr)).reduce((s, c) => s + (c.montant_total || 0), 0)
    const dep = depenses.filter(d => d.date_depense === dateStr).reduce((s, d) => s + (d.montant || 0), 0)
    return { date, dateStr, ca, dep }
  })
  const maxVal = Math.max(...derniers7Jours.map(d => Math.max(d.ca, d.dep)), 1)

  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f5', fontFamily: 'sans-serif', color: '#1a1a1a' }}>

      {/* TOPBAR */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e5e5', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{ color: '#1D9E75', fontSize: '1.3rem', margin: 0 }}>CK Dress ERP</h1>
          <span style={{ color: '#ddd' }}>|</span>
          <span style={{ color: '#999', fontSize: '12px' }}>{user?.nom || 'Super Admin'}</span>
        </div>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          {[
            { label: 'Commandes', href: '/commandes' },
            { label: 'Livraisons', href: '/livraisons' },
            { label: 'Production', href: '/production' },
            { label: 'Boutiques', href: '/admin/boutiques' },
            { label: 'Livreurs', href: '/livreurs' },
            { label: 'Utilisateurs', href: '/admin/utilisateurs' },
          ].map(l => (
            <a key={l.href} href={l.href} style={{ color: '#888', fontSize: '12px', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#1D9E75')}
              onMouseLeave={e => (e.currentTarget.style.color = '#888')}>
              {l.label}
            </a>
          ))}
          <div style={{ position: 'relative' }}>
            <button onClick={() => { setShowNotifs(!showNotifs); setBadge(0) }}
              style={{ background: 'none', border: '1px solid #e5e5e5', borderRadius: '8px', color: badge > 0 ? '#1D9E75' : '#888', padding: '6px 12px', cursor: 'pointer', fontSize: '16px', position: 'relative' }}>
              🔔
              {badge > 0 && (
                <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#E24B4A', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </button>
            {showNotifs && (
              <div style={{ position: 'absolute', right: 0, top: '40px', width: '320px', background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', zIndex: 1000, maxHeight: '400px', overflow: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: '#1a1a1a' }}>Notifications</span>
                  <button onClick={() => setNotifications([])} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '12px' }}>Effacer</button>
                </div>
                {notifications.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>Aucune notification</div>
                ) : notifications.map(n => (
                  <div key={n.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f5f5f5', display: 'flex', gap: '10px' }}>
                    <span>{n.statut === 'nouveau' ? '🆕' : n.statut === 'en_livraison' ? '🚚' : '✅'}</span>
                    <div>
                      <p style={{ margin: 0, fontSize: '13px', color: '#1a1a1a' }}>{n.message}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#aaa' }}>{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => { localStorage.removeItem('ck_user'); window.location.href = '/login' }}
            style={{ background: 'none', border: '1px solid #e5e5e5', borderRadius: '6px', color: '#888', padding: '5px 10px', fontSize: '11px', cursor: 'pointer' }}>
            Déconnexion
          </button>
        </div>
      </div>

      {/* ONGLETS */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e5e5', background: '#fff' }}>
        {[
          { key: 'overview', label: '🏠 Vue générale' },
          { key: 'comptabilite', label: '📊 Comptabilité' },
        ].map(o => (
          <button key={o.key} onClick={() => setOnglet(o.key as any)}
            style={{ padding: '14px 24px', background: 'transparent', border: 'none', color: onglet === o.key ? '#1D9E75' : '#888', fontSize: '13px', fontWeight: 600, cursor: 'pointer', borderBottom: onglet === o.key ? '2px solid #1D9E75' : '2px solid transparent' }}>
            {o.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '20px 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#aaa', padding: '60px' }}>Chargement...</div>
        ) : (
          <>
            {onglet === 'overview' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
                  {[
                    { label: 'CA Total', value: stats.total.toLocaleString('fr-FR') + ' F', color: '#1D9E75', sub: 'Toutes commandes' },
                    { label: 'Commandes', value: stats.count.toString(), color: '#1a1a1a', sub: 'Total enregistrées' },
                    { label: 'Nouvelles', value: stats.nouvelles.toString(), color: stats.nouvelles > 0 ? '#E24B4A' : '#aaa', sub: 'À traiter' },
                    { label: 'En livraison', value: stats.enLivraison.toString(), color: '#EF9F27', sub: 'En cours' },
                  ].map((kpi, i) => (
                    <div key={i} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                      <div style={{ fontSize: '11px', color: '#aaa', textTransform: 'uppercase', marginBottom: '8px' }}>{kpi.label}</div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: kpi.color }}>{kpi.value}</div>
                      <div style={{ fontSize: '12px', color: '#bbb', marginTop: '4px' }}>{kpi.sub}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                  {[
                    { label: '📦 Commandes', href: '/commandes' },
                    { label: '🚚 Livraisons', href: '/livraisons' },
                    { label: '🏪 Boutiques', href: '/admin/boutiques' },
                    { label: '⚙️ Production', href: '/production' },
                    { label: '👥 Livreurs', href: '/livreurs' },
                    { label: '🌐 Catalogue', href: '/catalogue' },
                    { label: '👤 Utilisateurs', href: '/admin/utilisateurs' },
                  ].map((link, i) => (
                    <a key={i} href={link.href} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '10px', padding: '14px', textAlign: 'center', textDecoration: 'none', color: '#666', fontSize: '13px', fontWeight: 500, display: 'block', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1D9E75'; (e.currentTarget as HTMLElement).style.color = '#1D9E75' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e5e5e5'; (e.currentTarget as HTMLElement).style.color = '#666' }}>
                      {link.label}
                    </a>
                  ))}
                </div>

                <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '14px', color: '#aaa', margin: 0, textTransform: 'uppercase' }}>Dernières commandes</h2>
                    <a href="/commandes" style={{ background: '#1D9E75', color: 'white', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', textDecoration: 'none', fontWeight: '600' }}>Voir tout →</a>
                  </div>
                  {commandes.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#aaa', padding: '40px' }}>Aucune commande</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {commandes.map((cmd, i) => (
                        <div key={i} style={{ background: '#f9f9f9', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', border: '1px solid #f0f0f0' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <span style={{ fontSize: '11px', color: '#aaa' }}>#{cmd.id.slice(0, 6).toUpperCase()}</span>
                              <span style={{ fontSize: '11px', background: (STATUTS[cmd.statut]?.color || '#aaa') + '22', color: STATUTS[cmd.statut]?.color || '#aaa', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                                {STATUTS[cmd.statut]?.label || cmd.statut}
                              </span>
                            </div>
                            <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>📞 {cmd.telephone} · 📍 {cmd.adresse}</p>
                            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#aaa' }}>
                              {new Date(cmd.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1D9E75' }}>{cmd.montant_total?.toLocaleString('fr-FR')} F</p>
                            <a href={`/commandes/${cmd.id}`} style={{ fontSize: '11px', color: '#aaa', textDecoration: 'none' }}>Voir détail →</a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {onglet === 'comptabilite' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
                  {[
                    { label: 'CA Total', value: caTotal.toLocaleString('fr-FR') + ' F', color: '#1D9E75', icon: '💰' },
                    { label: 'Dépenses totales', value: totalDepenses.toLocaleString('fr-FR') + ' F', color: '#E24B4A', icon: '💸' },
                    { label: 'Bénéfice net', value: benefice.toLocaleString('fr-FR') + ' F', color: benefice >= 0 ? '#1D9E75' : '#E24B4A', icon: '📈' },
                    { label: 'Marge', value: caTotal > 0 ? Math.round((benefice / caTotal) * 100) + '%' : '0%', color: benefice >= 0 ? '#d4a853' : '#E24B4A', icon: '📊' },
                  ].map((k, i) => (
                    <div key={i} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                      <div style={{ fontSize: '20px', marginBottom: '8px' }}>{k.icon}</div>
                      <div style={{ fontSize: '11px', color: '#aaa', textTransform: 'uppercase', marginBottom: '6px' }}>{k.label}</div>
                      <div style={{ fontSize: '22px', fontWeight: 700, color: k.color }}>{k.value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                  {[
                    { title: '⚙️ CK Design', ca: caCKDesign, dep: depensesCKDesign },
                    { title: '🛍️ Succès Design', ca: caSuccesDesign, dep: depensesSuccesDesign },
                  ].map((act, i) => (
                    <div key={i} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                      <h3 style={{ margin: '0 0 14px', fontSize: '13px', color: '#aaa', textTransform: 'uppercase' }}>{act.title}</h3>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: '#888', fontSize: '13px' }}>CA</span>
                        <span style={{ color: '#1D9E75', fontWeight: 700 }}>{act.ca.toLocaleString('fr-FR')} F</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: '#888', fontSize: '13px' }}>Dépenses</span>
                        <span style={{ color: '#E24B4A', fontWeight: 700 }}>{act.dep.toLocaleString('fr-FR')} F</span>
                      </div>
                      <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#888', fontSize: '13px' }}>Bénéfice</span>
                        <span style={{ color: (act.ca - act.dep) >= 0 ? '#1D9E75' : '#E24B4A', fontWeight: 700 }}>
                          {(act.ca - act.dep).toLocaleString('fr-FR')} F
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                  <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <h3 style={{ margin: '0 0 10px', fontSize: '13px', color: '#aaa', textTransform: 'uppercase' }}>📅 CA aujourd'hui</h3>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#1D9E75' }}>{caJour.toLocaleString('fr-FR')} F</div>
                  </div>
                  <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <h3 style={{ margin: '0 0 10px', fontSize: '13px', color: '#aaa', textTransform: 'uppercase' }}>📅 CA cette semaine</h3>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#378ADD' }}>{caSemaine.toLocaleString('fr-FR')} F</div>
                  </div>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '18px', marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '13px', color: '#aaa', textTransform: 'uppercase' }}>📊 CA vs Dépenses — 7 derniers jours</h3>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', background: '#1D9E75', borderRadius: '2px' }} /><span style={{ fontSize: '11px', color: '#aaa' }}>CA</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', background: '#E24B4A', borderRadius: '2px' }} /><span style={{ fontSize: '11px', color: '#aaa' }}>Dépenses</span></div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '140px' }}>
                    {derniers7Jours.map((d, i) => (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                        <div style={{ width: '100%', display: 'flex', gap: '2px', alignItems: 'flex-end', justifyContent: 'center' }}>
                          <div style={{ flex: 1, background: '#1D9E75', borderRadius: '3px 3px 0 0', height: `${Math.max(2, (d.ca / maxVal) * 120)}px` }} />
                          <div style={{ flex: 1, background: '#E24B4A', borderRadius: '3px 3px 0 0', height: `${Math.max(2, (d.dep / maxVal) * 120)}px` }} />
                        </div>
                        <span style={{ fontSize: '10px', color: '#aaa' }}>{d.date.toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                  <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <h3 style={{ margin: '0 0 14px', fontSize: '13px', color: '#aaa', textTransform: 'uppercase' }}>💸 Dépenses par catégorie</h3>
                    {depensesParCategorie.length === 0 ? (
                      <p style={{ color: '#aaa', fontSize: '13px' }}>Aucune dépense enregistrée</p>
                    ) : depensesParCategorie.map((c, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                        <span style={{ color: '#666', fontSize: '13px' }}>{c.cat}</span>
                        <span style={{ color: '#E24B4A', fontWeight: 600, fontSize: '13px' }}>{c.total.toLocaleString('fr-FR')} F</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <h3 style={{ margin: 0, fontSize: '13px', color: '#aaa', textTransform: 'uppercase' }}>📋 Dernières dépenses</h3>
                      <button onClick={() => setShowDepenseForm(!showDepenseForm)}
                        style={{ background: '#E24B4A', color: 'white', border: 'none', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                        + Ajouter
                      </button>
                    </div>
                    {showDepenseForm && (
                      <div style={{ background: '#f9f9f9', borderRadius: '8px', padding: '12px', marginBottom: '12px', border: '1px solid #f0f0f0' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <input value={depenseForm.libelle} onChange={e => setDepenseForm(p => ({ ...p, libelle: e.target.value }))}
                            placeholder="Libellé *"
                            style={{ padding: '8px', borderRadius: '6px', background: '#fff', border: '1px solid #e5e5e5', color: '#1a1a1a', fontSize: '12px' }} />
                          <input type="number" value={depenseForm.montant} onChange={e => setDepenseForm(p => ({ ...p, montant: Number(e.target.value) }))}
                            placeholder="Montant (F)"
                            style={{ padding: '8px', borderRadius: '6px', background: '#fff', border: '1px solid #e5e5e5', color: '#1a1a1a', fontSize: '12px' }} />
                          <select value={depenseForm.categorie} onChange={e => setDepenseForm(p => ({ ...p, categorie: e.target.value }))}
                            style={{ padding: '8px', borderRadius: '6px', background: '#fff', border: '1px solid #e5e5e5', color: '#1a1a1a', fontSize: '12px' }}>
                            {CATEGORIES_DEPENSE.map(c => <option key={c}>{c}</option>)}
                          </select>
                          <select value={depenseForm.activite} onChange={e => setDepenseForm(p => ({ ...p, activite: e.target.value }))}
                            style={{ padding: '8px', borderRadius: '6px', background: '#fff', border: '1px solid #e5e5e5', color: '#1a1a1a', fontSize: '12px' }}>
                            <option value="ck_design">CK Design</option>
                            <option value="succes_design">Succès Design</option>
                            <option value="general">Général</option>
                          </select>
                          <input type="date" value={depenseForm.date_depense} onChange={e => setDepenseForm(p => ({ ...p, date_depense: e.target.value }))}
                            style={{ padding: '8px', borderRadius: '6px', background: '#fff', border: '1px solid #e5e5e5', color: '#1a1a1a', fontSize: '12px' }} />
                          <button onClick={ajouterDepense} disabled={saving}
                            style={{ padding: '8px', background: '#E24B4A', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>
                            {saving ? '...' : 'Enregistrer'}
                          </button>
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflow: 'auto' }}>
                      {depenses.slice(0, 10).map(d => (
                        <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                          <div>
                            <p style={{ margin: 0, fontSize: '12px', color: '#1a1a1a' }}>{d.libelle}</p>
                            <p style={{ margin: 0, fontSize: '10px', color: '#aaa' }}>{d.categorie} · {d.date_depense}</p>
                          </div>
                          <span style={{ color: '#E24B4A', fontWeight: 600, fontSize: '13px' }}>{d.montant?.toLocaleString('fr-FR')} F</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}