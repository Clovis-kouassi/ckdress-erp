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

const MENU_LINKS = [
  { label: '📦 Commandes', href: '/commandes' },
  { label: '🚚 Livraisons', href: '/livraisons' },
  { label: '⚙️ Production', href: '/production' },
  { label: '🏪 Boutiques', href: '/admin/boutiques' },
  { label: '🌐 Catalogue', href: '/catalogue' },
  { label: '✨ Succès Design', href: '/succes-design' },
  { label: '👤 Utilisateurs', href: '/admin/utilisateurs' },
]

export default function Dashboard() {
  const [commandes, setCommandes] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, count: 0, nouvelles: 0, enLivraison: 0 })
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<any[]>([])
  const [badge, setBadge] = useState(0)
  const [showNotifs, setShowNotifs] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [user, setUser] = useState<any>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('ck_user') || '{}')
    setUser(u)
    fetchData()
    setupRealtime()
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => { supabase.removeAllChannels(); document.removeEventListener('mousedown', handleClick) }
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
    const [{ data: cmds }, { data: all }] = await Promise.all([
      supabase.from('commandes_catalogue').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('commandes_catalogue').select('montant_total, statut, note, created_at'),
    ])
    const caTotal = all?.reduce((s, c) => s + (c.montant_total || 0), 0) || 0
    setCommandes(cmds || [])
    setStats({
      total: caTotal,
      count: all?.length || 0,
      nouvelles: all?.filter(c => c.statut === 'nouveau').length || 0,
      enLivraison: all?.filter(c => c.statut === 'en_livraison').length || 0,
    })
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f5', fontFamily: 'sans-serif', color: '#1a1a1a' }}>

      {/* TOPBAR */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e5e5', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{ color: '#1D9E75', fontSize: '1.3rem', margin: 0 }}>CK Dress ERP</h1>
          <span style={{ color: '#ddd' }}>|</span>
          <span style={{ color: '#999', fontSize: '12px' }}>{user?.nom || 'Super Admin'}</span>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>

          {/* MENU HAMBURGER */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              style={{ background: showMenu ? '#f0fdf4' : 'none', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '18px', height: '2px', background: showMenu ? '#1D9E75' : '#888', borderRadius: '2px' }} />
              <div style={{ width: '18px', height: '2px', background: showMenu ? '#1D9E75' : '#888', borderRadius: '2px' }} />
              <div style={{ width: '18px', height: '2px', background: showMenu ? '#1D9E75' : '#888', borderRadius: '2px' }} />
            </button>

            {showMenu && (
              <div style={{ position: 'absolute', right: 0, top: '46px', width: '220px', background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', zIndex: 1000, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid #f0f0f0' }}>
                  <p style={{ margin: 0, fontSize: '11px', color: '#aaa', textTransform: 'uppercase', fontWeight: 600 }}>Navigation</p>
                </div>
                {MENU_LINKS.map(l => (
                  <a key={l.href} href={l.href}
                    style={{ display: 'flex', alignItems: 'center', padding: '11px 16px', textDecoration: 'none', color: '#555', fontSize: '13px', fontWeight: 500, borderBottom: '1px solid #f9f9f9' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f0fdf4'; (e.currentTarget as HTMLElement).style.color = '#1D9E75' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#555' }}>
                    {l.label}
                  </a>
                ))}
                <div style={{ padding: '8px' }}>
                  <button onClick={() => { localStorage.removeItem('ck_user'); window.location.href = '/login' }}
                    style={{ width: '100%', padding: '10px', background: '#fff5f5', border: 'none', borderRadius: '8px', color: '#E24B4A', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                    🚪 Déconnexion
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* NOTIFICATIONS */}
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
        </div>
      </div>

      <div style={{ padding: '20px 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#aaa', padding: '60px' }}>Chargement...</div>
        ) : (
          <>
            {/* KPIs */}
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

            {/* MENU RACCOURCIS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px', marginBottom: '20px' }}>
              {MENU_LINKS.map((link, i) => (
                <a key={i} href={link.href} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '10px', padding: '14px', textAlign: 'center', textDecoration: 'none', color: '#666', fontSize: '13px', fontWeight: 500, display: 'block', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1D9E75'; (e.currentTarget as HTMLElement).style.color = '#1D9E75' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e5e5e5'; (e.currentTarget as HTMLElement).style.color = '#666' }}>
                  {link.label}
                </a>
              ))}
            </div>

            {/* DERNIÈRES COMMANDES */}
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}