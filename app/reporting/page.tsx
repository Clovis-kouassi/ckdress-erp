'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const PERIODES = [
  { key: 'tous', label: 'Tout' },
  { key: 'jour', label: "Aujourd'hui" },
  { key: 'semaine', label: 'Cette semaine' },
  { key: 'mois', label: 'Ce mois' },
  { key: 'annee', label: 'Cette année' },
]

const PART_GAINS = 0.30
const PART_REINVEST = 0.70

export default function ReportingPage() {
  const [commandes, setCommandes] = useState<any[]>([])
  const [stock, setStock] = useState<any[]>([])
  const [produits, setProduits] = useState<any[]>([])
  const [livreurs, setLivreurs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [periode, setPeriode] = useState<string>('tous')
  const [user, setUser] = useState<any>(null)
  const [onglet, setOnglet] = useState<'finances' | 'commandes' | 'produits' | 'stock' | 'clients'>('finances')

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('ck_user') || '{}')
    setUser(u)
    fetchData(u)
  }, [])

  const fetchData = async (u: any) => {
    const isGlobal = u?.activite === 'ck_dress' || !u?.activite
    const [{ data: cmds }, { data: stk }, { data: prods }, { data: livs }] = await Promise.all([
      isGlobal
        ? supabase.from('commandes_catalogue').select('*').order('created_at', { ascending: false })
        : supabase.from('commandes_catalogue').select('*').eq('activite', u.activite).order('created_at', { ascending: false }),
      supabase.from('stock').select('*, produits(nom, prix_achat, prix_vente, activite)').order('quantite'),
      supabase.from('produits').select('*, stock(quantite)').eq('disponible', true).order('nom'),
      supabase.from('livreurs').select('*').eq('actif', true),
    ])
    setCommandes(cmds || [])
    setStock(stk || [])
    setProduits(prods || [])
    setLivreurs(livs || [])
    setLoading(false)
  }

  // Filtrer par période
  const filtrer = (date: string) => {
    if (periode === 'tous') return true
    const now = new Date()
    const d = new Date(date)
    if (periode === 'jour') return d.toDateString() === now.toDateString()
    if (periode === 'semaine') return (now.getTime() - d.getTime()) / (1000 * 3600 * 24) <= 7
    if (periode === 'mois') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    if (periode === 'annee') return d.getFullYear() === now.getFullYear()
    return true
  }

  const cmdsFiltrees = commandes.filter(c => filtrer(c.created_at))
  const cmdsLivrees = cmdsFiltrees.filter(c => c.statut === 'livre')
  const cmdsAnnulees = cmdsFiltrees.filter(c => c.statut === 'annule')
  const cmdsEnAttente = cmdsFiltrees.filter(c => ['nouveau', 'en_preparation'].includes(c.statut))
  const cmdsEnLivraison = cmdsFiltrees.filter(c => c.statut === 'en_livraison')

  // KPI 1 — CA Total
  const caTotal = cmdsFiltrees.reduce((s, c) => s + (c.montant_total || 0), 0)

  // KPI 2 — CA Livré
  const caLivre = cmdsLivrees.reduce((s, c) => s + (c.montant_total || 0), 0)

  // KPI 3 & 4 — Gains et Réinvestissement (sur CA livré - frais livraison)
  const montantNetLivre = cmdsLivrees.reduce((s, c) => s + ((c.montant_total || 0) - (c.frais_livraison || 0)), 0)
  const gains = montantNetLivre * PART_GAINS
  const reinvest = montantNetLivre * PART_REINVEST

  // KPI 5 — Panier moyen
  const panierMoyen = cmdsFiltrees.length > 0 ? caTotal / cmdsFiltrees.length : 0

  // KPI 6 — CA par activité
  const caCkDesign = cmdsFiltrees.filter(c => c.note?.includes('CK DESIGN') || c.activite === 'ck_design').reduce((s, c) => s + (c.montant_total || 0), 0)
  const caSuccesDesign = cmdsFiltrees.filter(c => c.note?.includes('SUCCES DESIGN') || c.activite === 'succes_design').reduce((s, c) => s + (c.montant_total || 0), 0)

  // KPI 7 — Taux de livraison
  const tauxLivraison = cmdsFiltrees.length > 0 ? Math.round((cmdsLivrees.length / cmdsFiltrees.length) * 100) : 0

  // KPI 8 — Commandes en attente
  const nbEnAttente = cmdsEnAttente.length

  // KPI 9 — Commandes annulées + montant perdu
  const montantPerdu = cmdsAnnulees.reduce((s, c) => s + (c.montant_total || 0), 0)

  // KPI 10 — Délai moyen livraison (approximation)
  const delaiMoyen = '~24h' // statique pour l'instant

  // KPI 11 — Top 5 produits
  const compteProduits: Record<string, { nom: string; count: number; ca: number }> = {}
  cmdsFiltrees.forEach(c => {
    const ref = c.produit_ref || 'Inconnu'
    if (!compteProduits[ref]) compteProduits[ref] = { nom: ref, count: 0, ca: 0 }
    compteProduits[ref].count++
    compteProduits[ref].ca += c.montant_total || 0
  })
  const top5 = Object.values(compteProduits).sort((a, b) => b.count - a.count).slice(0, 5)

  // KPI 12 — Valeur totale du stock
  const valeurStock = stock.reduce((s, item) => {
    const prixAchat = (item.produits as any)?.prix_achat || 0
    return s + (item.quantite * prixAchat)
  }, 0)

  // KPI 13 — Articles critiques
  const articlesCritiques = stock.filter(s => s.quantite <= 3)

  // KPI 14 — Abidjan vs Expédition
  const nbAbidjan = cmdsFiltrees.filter(c => !c.note?.includes('EXPÉDITION') && !c.note?.toLowerCase().includes('expedition')).length
  const nbExpedition = cmdsFiltrees.filter(c => c.note?.includes('EXPÉDITION') || c.note?.toLowerCase().includes('expedition')).length

  // KPI 15 — Source commandes
  const nbWhatsapp = cmdsFiltrees.filter(c => c.source === 'whatsapp').length
  const nbFormulaire = cmdsFiltrees.filter(c => c.source === 'formulaire').length

  const formatF = (n: number) => Math.round(n).toLocaleString('fr-FR') + ' F'

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: "'Inter', sans-serif", color: '#1a1a1a' }}>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>
        <div>
          <h1 style={{ color: '#38bdf8', margin: 0, fontSize: '16px', fontWeight: 700 }}>📊 Reporting & Analyses</h1>
          <p style={{ color: '#94a3b8', margin: '2px 0 0', fontSize: '11px' }}>{user?.nom} — Données en temps réel</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => fetchData(user)}
            style={{ background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 8, color: '#38bdf8', padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
            ↺ Actualiser
          </button>
          <a href="/dashboard" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: '#94a3b8', padding: '6px 14px', fontSize: 12, textDecoration: 'none' }}>
            ← Dashboard
          </a>
        </div>
      </div>

      <div style={{ padding: '16px 24px' }}>

        {/* FILTRE PÉRIODE */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {PERIODES.map(p => (
            <button key={p.key} onClick={() => setPeriode(p.key)}
              style={{ padding: '8px 18px', borderRadius: 20, border: `1.5px solid ${periode === p.key ? '#0891b2' : '#e5e7eb'}`, background: periode === p.key ? '#0891b2' : '#fff', color: periode === p.key ? '#fff' : '#555', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: periode === p.key ? '0 4px 12px rgba(8,145,178,0.3)' : 'none' }}>
              {p.label}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', background: '#fff', borderRadius: 20, padding: '6px 16px', border: '1px solid #e5e7eb', fontSize: 12, color: '#888' }}>
            {cmdsFiltrees.length} commande{cmdsFiltrees.length > 1 ? 's' : ''} sur la période
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#aaa', padding: '60px', fontSize: 16 }}>⏳ Chargement des données...</div>
        ) : (
          <>
            {/* ✅ SECTION GAINS — toujours visible en haut */}
            <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)', borderRadius: 16, padding: '24px 28px', marginBottom: 20, border: '1px solid rgba(212,168,83,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <span style={{ fontSize: 20 }}>💰</span>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#d4a853' }}>Répartition des Gains</h2>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginLeft: 'auto' }}>Sur commandes livrées uniquement</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                {[
                  { label: 'CA Livré', value: formatF(caLivre), color: '#38bdf8', sub: `${cmdsLivrees.length} commandes`, icon: '📦' },
                  { label: 'Montant Net', value: formatF(montantNetLivre), color: '#a78bfa', sub: 'Après frais livraison', icon: '🧾' },
                  { label: `Vos Gains (${Math.round(PART_GAINS * 100)}%)`, value: formatF(gains), color: '#d4a853', sub: 'Votre part', icon: '🎯' },
                  { label: `Réinvestissement (${Math.round(PART_REINVEST * 100)}%)`, value: formatF(reinvest), color: '#1D9E75', sub: 'Part projet', icon: '🔄' },
                ].map((k, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px 18px', border: `1px solid ${k.color}33` }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>{k.icon} {k.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{k.sub}</div>
                  </div>
                ))}
              </div>

              {/* Barre de répartition visuelle */}
              <div style={{ marginTop: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: '#d4a853', fontWeight: 600 }}>🎯 Vos gains 30%</span>
                  <span style={{ fontSize: 11, color: '#1D9E75', fontWeight: 600 }}>🔄 Réinvestissement 70%</span>
                </div>
                <div style={{ height: 10, borderRadius: 20, background: 'rgba(255,255,255,0.1)', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: '30%', background: 'linear-gradient(90deg, #d4a853, #f0c970)', borderRadius: '20px 0 0 20px' }} />
                  <div style={{ width: '70%', background: 'linear-gradient(90deg, #1D9E75, #34d399)', borderRadius: '0 20px 20px 0' }} />
                </div>
              </div>
            </div>

            {/* ONGLETS */}
            <div style={{ display: 'flex', background: '#fff', borderRadius: 12, padding: 4, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', gap: 2, marginBottom: 16, overflowX: 'auto' }}>
              {[
                { key: 'finances', label: '💰 Finances' },
                { key: 'commandes', label: '📦 Commandes' },
                { key: 'produits', label: '🏆 Top Produits' },
                { key: 'stock', label: '📊 Stock' },
                { key: 'clients', label: '👥 Clients' },
              ].map(o => (
                <button key={o.key} onClick={() => setOnglet(o.key as any)}
                  style={{ flexShrink: 0, padding: '9px 16px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: onglet === o.key ? '#0891b2' : 'transparent', color: onglet === o.key ? '#fff' : '#888' }}>
                  {o.label}
                </button>
              ))}
            </div>

            {/* ✅ ONGLET FINANCES */}
            {onglet === 'finances' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                  {[
                    { label: 'CA Total', value: formatF(caTotal), color: '#0891b2', bg: '#e0f7fa', sub: 'Toutes commandes', icon: '💵' },
                    { label: 'CA Livré', value: formatF(caLivre), color: '#1D9E75', bg: '#f0fdf4', sub: 'Commandes livrées', icon: '✅' },
                    { label: 'Panier Moyen', value: formatF(panierMoyen), color: '#7c3aed', bg: '#f5f3ff', sub: 'Par commande', icon: '🛒' },
                  ].map((k, i) => (
                    <div key={i} style={{ background: k.bg, borderRadius: 14, padding: '20px 22px', border: `1px solid ${k.color}22` }}>
                      <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>{k.icon} {k.label}</div>
                      <div style={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.value}</div>
                      <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>{k.sub}</div>
                    </div>
                  ))}
                </div>

                {/* CA par activité */}
                <div style={{ background: '#fff', borderRadius: 14, padding: '22px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>📊 CA par activité</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {[
                      { label: 'CK Design', value: caCkDesign, color: '#d4a853', bg: 'rgba(212,168,83,0.08)', total: caTotal },
                      { label: 'Succès Design', value: caSuccesDesign, color: '#0891b2', bg: 'rgba(8,145,178,0.08)', total: caTotal },
                    ].map((a, i) => (
                      <div key={i} style={{ background: a.bg, borderRadius: 12, padding: '18px 20px', border: `1px solid ${a.color}22` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{a.label}</span>
                          <span style={{ fontSize: 12, color: a.color, fontWeight: 700 }}>
                            {a.total > 0 ? Math.round((a.value / a.total) * 100) : 0}%
                          </span>
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: a.color, marginBottom: 10 }}>{formatF(a.value)}</div>
                        <div style={{ height: 6, borderRadius: 20, background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                          <div style={{ width: `${a.total > 0 ? (a.value / a.total) * 100 : 0}%`, height: '100%', background: a.color, borderRadius: 20 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Montant perdu */}
                {cmdsAnnulees.length > 0 && (
                  <div style={{ background: '#fff5f5', borderRadius: 14, padding: '18px 22px', border: '1px solid #fecaca' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#E24B4A' }}>❌ Commandes annulées</h3>
                        <p style={{ margin: 0, fontSize: 13, color: '#888' }}>{cmdsAnnulees.length} commande{cmdsAnnulees.length > 1 ? 's' : ''} annulée{cmdsAnnulees.length > 1 ? 's' : ''}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#E24B4A' }}>{formatF(montantPerdu)}</div>
                        <div style={{ fontSize: 11, color: '#aaa' }}>Montant perdu</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ✅ ONGLET COMMANDES */}
            {onglet === 'commandes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                  {[
                    { label: 'Total', value: cmdsFiltrees.length, color: '#1a1a1a', bg: '#fff', icon: '📦' },
                    { label: 'En attente', value: nbEnAttente, color: '#E24B4A', bg: '#fff0f0', icon: '⏳' },
                    { label: 'En livraison', value: cmdsEnLivraison.length, color: '#EF9F27', bg: '#fff8e6', icon: '🚚' },
                    { label: 'Livrées', value: cmdsLivrees.length, color: '#1D9E75', bg: '#f0fdf4', icon: '✅' },
                  ].map((k, i) => (
                    <div key={i} style={{ background: k.bg, borderRadius: 14, padding: '20px 22px', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                      <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>{k.icon} {k.label}</div>
                      <div style={{ fontSize: 32, fontWeight: 800, color: k.color }}>{k.value}</div>
                    </div>
                  ))}
                </div>

                {/* Taux de livraison */}
                <div style={{ background: '#fff', borderRadius: 14, padding: '22px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>🎯 Taux de livraison</h3>
                    <span style={{ fontSize: 28, fontWeight: 800, color: tauxLivraison >= 80 ? '#1D9E75' : tauxLivraison >= 50 ? '#EF9F27' : '#E24B4A' }}>
                      {tauxLivraison}%
                    </span>
                  </div>
                  <div style={{ height: 12, borderRadius: 20, background: '#f0f0f0', overflow: 'hidden' }}>
                    <div style={{ width: `${tauxLivraison}%`, height: '100%', background: tauxLivraison >= 80 ? 'linear-gradient(90deg, #1D9E75, #34d399)' : tauxLivraison >= 50 ? 'linear-gradient(90deg, #EF9F27, #fbbf24)' : 'linear-gradient(90deg, #E24B4A, #f87171)', borderRadius: 20, transition: 'width 0.5s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                    <span style={{ fontSize: 12, color: '#aaa' }}>0%</span>
                    <span style={{ fontSize: 12, color: tauxLivraison >= 80 ? '#1D9E75' : '#EF9F27', fontWeight: 600 }}>
                      {tauxLivraison >= 80 ? '✅ Excellent' : tauxLivraison >= 50 ? '⚠️ À améliorer' : '❌ Faible'}
                    </span>
                    <span style={{ fontSize: 12, color: '#aaa' }}>100%</span>
                  </div>
                </div>

                {/* Répartition statuts */}
                <div style={{ background: '#fff', borderRadius: 14, padding: '22px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>📊 Répartition par statut</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: 'Nouvelles', count: cmdsFiltrees.filter(c => c.statut === 'nouveau').length, color: '#E24B4A' },
                      { label: 'En préparation', count: cmdsFiltrees.filter(c => c.statut === 'en_preparation').length, color: '#7c3aed' },
                      { label: 'En livraison', count: cmdsEnLivraison.length, color: '#EF9F27' },
                      { label: 'Livrées', count: cmdsLivrees.length, color: '#1D9E75' },
                      { label: 'Annulées', count: cmdsAnnulees.length, color: '#aaa' },
                    ].map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 13, color: '#555', minWidth: 120, fontWeight: 500 }}>{s.label}</span>
                        <div style={{ flex: 1, height: 8, borderRadius: 20, background: '#f0f0f0', overflow: 'hidden' }}>
                          <div style={{ width: `${cmdsFiltrees.length > 0 ? (s.count / cmdsFiltrees.length) * 100 : 0}%`, height: '100%', background: s.color, borderRadius: 20 }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: s.color, minWidth: 30, textAlign: 'right' }}>{s.count}</span>
                        <span style={{ fontSize: 11, color: '#aaa', minWidth: 40 }}>
                          {cmdsFiltrees.length > 0 ? Math.round((s.count / cmdsFiltrees.length) * 100) : 0}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ✅ ONGLET TOP PRODUITS */}
            {onglet === 'produits' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: '#fff', borderRadius: 14, padding: '22px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>🏆 Top 5 Produits les plus commandés</h3>
                  {top5.length === 0 ? (
                    <p style={{ color: '#aaa', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Aucune donnée sur cette période</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {top5.map((p, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, background: i === 0 ? 'rgba(212,168,83,0.06)' : '#f8f9fa', borderRadius: 10, padding: '12px 16px', border: i === 0 ? '1px solid rgba(212,168,83,0.2)' : '1px solid #e5e7eb' }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: i === 0 ? 'linear-gradient(135deg, #d4a853, #f0c970)' : i === 1 ? '#e0e0e0' : i === 2 ? '#d4a47a' : '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: i < 3 ? '#1a1a1a' : '#888', flexShrink: 0 }}>
                            {i + 1}
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{p.nom}</p>
                            <div style={{ height: 4, borderRadius: 20, background: '#e5e7eb', marginTop: 6, overflow: 'hidden' }}>
                              <div style={{ width: `${top5[0].count > 0 ? (p.count / top5[0].count) * 100 : 0}%`, height: '100%', background: i === 0 ? '#d4a853' : '#0891b2', borderRadius: 20 }} />
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: i === 0 ? '#d4a853' : '#0891b2' }}>{p.count}×</p>
                            <p style={{ margin: 0, fontSize: 11, color: '#aaa' }}>{formatF(p.ca)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ✅ ONGLET STOCK */}
            {onglet === 'stock' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{ background: '#f0fdf4', borderRadius: 14, padding: '22px', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>💎 Valeur totale du stock</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#1D9E75' }}>{formatF(valeurStock)}</div>
                    <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>Basé sur le prix d'achat</div>
                  </div>
                  <div style={{ background: articlesCritiques.length > 0 ? '#fff5f5' : '#f0fdf4', borderRadius: 14, padding: '22px', border: `1px solid ${articlesCritiques.length > 0 ? '#fecaca' : '#bbf7d0'}` }}>
                    <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>⚠️ Articles critiques (≤3 pcs)</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: articlesCritiques.length > 0 ? '#E24B4A' : '#1D9E75' }}>{articlesCritiques.length}</div>
                    <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>
                      {articlesCritiques.length > 0 ? 'Réapprovisionnement urgent' : 'Stock OK'}
                    </div>
                  </div>
                </div>

                {articlesCritiques.length > 0 && (
                  <div style={{ background: '#fff', borderRadius: 14, padding: '22px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#E24B4A' }}>⚠️ Articles à réapprovisionner</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {articlesCritiques.slice(0, 10).map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff5f5', borderRadius: 9, padding: '10px 14px', border: '1px solid #fecaca' }}>
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{(item.produits as any)?.nom || 'Produit'}</span>
                            <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>— Taille {item.taille} · {item.couleur}</span>
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 800, color: '#E24B4A', background: '#fff0f0', padding: '3px 10px', borderRadius: 20 }}>
                            {item.quantite} pcs
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ✅ ONGLET CLIENTS */}
            {onglet === 'clients' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Abidjan vs Expédition */}
                <div style={{ background: '#fff', borderRadius: 14, padding: '22px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>📍 Abidjan vs Expédition</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                    {[
                      { label: '🏙️ Abidjan', count: nbAbidjan, color: '#0891b2', bg: '#e0f7fa' },
                      { label: '📦 Expédition', count: nbExpedition, color: '#7c3aed', bg: '#f5f3ff' },
                    ].map((g, i) => (
                      <div key={i} style={{ background: g.bg, borderRadius: 12, padding: '18px 20px', border: `1px solid ${g.color}22` }}>
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600 }}>{g.label}</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: g.color }}>{g.count}</div>
                        <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
                          {cmdsFiltrees.length > 0 ? Math.round((g.count / cmdsFiltrees.length) * 100) : 0}% des commandes
                        </div>
                        <div style={{ height: 6, borderRadius: 20, background: 'rgba(0,0,0,0.06)', marginTop: 10, overflow: 'hidden' }}>
                          <div style={{ width: `${cmdsFiltrees.length > 0 ? (g.count / cmdsFiltrees.length) * 100 : 0}%`, height: '100%', background: g.color, borderRadius: 20 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Source commandes */}
                <div style={{ background: '#fff', borderRadius: 14, padding: '22px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>📱 Source des commandes</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {[
                      { label: '💬 WhatsApp', count: nbWhatsapp, color: '#25D366', bg: 'rgba(37,211,102,0.08)' },
                      { label: '📝 Formulaire', count: nbFormulaire, color: '#0891b2', bg: 'rgba(8,145,178,0.08)' },
                    ].map((s, i) => (
                      <div key={i} style={{ background: s.bg, borderRadius: 12, padding: '18px 20px', border: `1px solid ${s.color}22` }}>
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600 }}>{s.label}</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.count}</div>
                        <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
                          {cmdsFiltrees.length > 0 ? Math.round((s.count / cmdsFiltrees.length) * 100) : 0}% des commandes
                        </div>
                        <div style={{ height: 6, borderRadius: 20, background: 'rgba(0,0,0,0.06)', marginTop: 10, overflow: 'hidden' }}>
                          <div style={{ width: `${cmdsFiltrees.length > 0 ? (s.count / cmdsFiltrees.length) * 100 : 0}%`, height: '100%', background: s.color, borderRadius: 20 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Délai moyen */}
                <div style={{ background: '#fff', borderRadius: 14, padding: '22px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>⏱️ Délai moyen de livraison</h3>
                    <p style={{ margin: 0, fontSize: 12, color: '#aaa' }}>Estimation basée sur notre engagement</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 32, fontWeight: 800, color: '#1D9E75' }}>{delaiMoyen}</div>
                    <div style={{ fontSize: 11, color: '#aaa' }}>À Abidjan</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}