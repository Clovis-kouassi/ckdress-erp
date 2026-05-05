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
  annule: { label: 'Annulé', color: '#555' },
}

export default function Dashboard() {
  const [commandes, setCommandes] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, count: 0, nouvelles: 0, enLivraison: 0 })
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<any[]>([])
  const [badge, setBadge] = useState(0)
  const [showNotifs, setShowNotifs] = useState(false)
  const audioRef = useRef<AudioContext | null>(null)

  useEffect(() => {
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
    supabase
      .channel('commandes_realtime')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'commandes_catalogue',
      }, (payload) => {
        const cmd = payload.new as any
        const ancien = payload.old as any
        if (cmd.statut !== ancien.statut) {
          const notif = {
            id: Date.now(),
            message: `Commande #${cmd.id.slice(0, 6).toUpperCase()} → ${STATUTS[cmd.statut]?.label || cmd.statut}`,
            statut: cmd.statut,
            time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          }
          setNotifications(prev => [notif, ...prev].slice(0, 20))
          setBadge(prev => prev + 1)
          playSound()
          fetchData()
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'commandes_catalogue',
      }, (payload) => {
        const cmd = payload.new as any
        const notif = {
          id: Date.now(),
          message: `Nouvelle commande #${cmd.id.slice(0, 6).toUpperCase()} — ${cmd.telephone}`,
          statut: 'nouveau',
          time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        }
        setNotifications(prev => [notif, ...prev].slice(0, 20))
        setBadge(prev => prev + 1)
        playSound()
        fetchData()
      })
      .subscribe()
  }

  async function fetchData() {
    const { data: cmds } = await supabase
      .from('commandes_catalogue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    const { data: all } = await supabase
      .from('commandes_catalogue')
      .select('montant_total, statut')

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
    <div style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: 'sans-serif', color: 'white' }}>

      {/* TOPBAR */}
      <div style={{ background: '#111', borderBottom: '1px solid #222', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ color: '#1D9E75', fontSize: '1.4rem', margin: 0 }}>CK Dress ERP</h1>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <a href="/commandes" style={{ color: '#666', fontSize: '13px', textDecoration: 'none' }}>Commandes</a>
          <a href="/livraisons" style={{ color: '#666', fontSize: '13px', textDecoration: 'none' }}>Livraisons</a>
          <a href="/production" style={{ color: '#666', fontSize: '13px', textDecoration: 'none' }}>Production</a>
          <a href="/admin/boutiques" style={{ color: '#666', fontSize: '13px', textDecoration: 'none' }}>Boutiques</a>
          <a href="/livreurs" style={{ color: '#666', fontSize: '13px', textDecoration: 'none' }}>Livreurs</a>

          {/* Cloche notifications */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowNotifs(!showNotifs); setBadge(0) }}
              style={{ background: 'none', border: '0.5px solid #333', borderRadius: '8px', color: badge > 0 ? '#1D9E75' : '#666', padding: '6px 12px', cursor: 'pointer', fontSize: '16px', position: 'relative' }}
            >
              🔔
              {badge > 0 && (
                <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#E24B4A', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </button>

            {/* Dropdown notifications */}
            {showNotifs && (
              <div style={{ position: 'absolute', right: 0, top: '40px', width: '320px', background: '#111', border: '1px solid #222', borderRadius: '12px', zIndex: 1000, maxHeight: '400px', overflow: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>Notifications</span>
                  <button onClick={() => setNotifications([])} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '12px' }}>Tout effacer</button>
                </div>
                {notifications.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#555', fontSize: '13px' }}>
                    Aucune notification
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div key={notif.id} style={{ padding: '12px 16px', borderBottom: '1px solid #1a1a1a', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '18px' }}>
                        {notif.statut === 'nouveau' ? '🆕' : notif.statut === 'en_livraison' ? '🚚' : notif.statut === 'livre' ? '✅' : '📦'}
                      </span>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: '13px', color: 'white' }}>{notif.message}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#555' }}>{notif.time}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#555', padding: '60px' }}>Chargement...</div>
        ) : (
          <>
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {[
                { label: 'CA Total', value: stats.total.toLocaleString('fr-FR') + ' F', color: '#1D9E75', sub: 'Toutes commandes' },
                { label: 'Commandes', value: stats.count.toString(), color: 'white', sub: 'Total enregistrées' },
                { label: 'Nouvelles', value: stats.nouvelles.toString(), color: stats.nouvelles > 0 ? '#E24B4A' : '#555', sub: 'À traiter' },
                { label: 'En livraison', value: stats.enLivraison.toString(), color: '#EF9F27', sub: 'En cours' },
              ].map((kpi, i) => (
                <div key={i} style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '8px' }}>{kpi.label}</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: kpi.color }}>{kpi.value}</div>
                  <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>{kpi.sub}</div>
                </div>
              ))}
            </div>

            {/* Liens rapides */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px', marginBottom: '24px' }}>
              {[
                { label: '📦 Commandes', href: '/commandes' },
                { label: '🚚 Livraisons', href: '/livraisons' },
                { label: '🏪 Boutiques', href: '/admin/boutiques' },
                { label: '⚙️ Production', href: '/production' },
                { label: '👥 Livreurs', href: '/livreurs' },
                { label: '🌐 Catalogue', href: '/catalogue' },
              ].map((link, i) => (
                <a key={i} href={link.href} style={{ background: '#111', border: '1px solid #222', borderRadius: '10px', padding: '14px', textAlign: 'center', textDecoration: 'none', color: '#888', fontSize: '13px', fontWeight: 500, display: 'block' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1D9E75'; (e.currentTarget as HTMLElement).style.color = '#1D9E75' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#222'; (e.currentTarget as HTMLElement).style.color = '#888' }}
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Dernières commandes */}
            <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '14px', color: '#888', margin: 0, textTransform: 'uppercase' }}>Dernières commandes</h2>
                <a href="/commandes" style={{ background: '#1D9E75', color: 'white', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', textDecoration: 'none', fontWeight: '600' }}>
                  Voir tout →
                </a>
              </div>

              {commandes.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#555', padding: '40px' }}>Aucune commande</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {commandes.map((cmd, i) => (
                    <div key={i} style={{ background: '#1a1a1a', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '11px', color: '#555' }}>#{cmd.id.slice(0, 6).toUpperCase()}</span>
                          <span style={{ fontSize: '11px', background: (STATUTS[cmd.statut]?.color || '#555') + '22', color: STATUTS[cmd.statut]?.color || '#555', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                            {STATUTS[cmd.statut]?.label || cmd.statut}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', color: '#888' }}>📞 {cmd.telephone} · 📍 {cmd.adresse}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#555' }}>
                          {new Date(cmd.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1D9E75' }}>{cmd.montant_total?.toLocaleString('fr-FR')} F</p>
                        <a href={`/commandes/${cmd.id}`} style={{ fontSize: '11px', color: '#555', textDecoration: 'none' }}>Voir détail →</a>
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