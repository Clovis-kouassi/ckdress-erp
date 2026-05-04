'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Reporting() {
  const [stats, setStats] = useState<any>({})
  const [topProduits, setTopProduits] = useState<any[]>([])
  const [topClients, setTopClients] = useState<any[]>([])
  const [commandesMois, setCommandesMois] = useState<any[]>([])
  const [nonLivrees, setNonLivrees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet] = useState('overview')

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data: commandes } = await supabase
      .from('commandes')
      .select(`id, numero, montant_total, statut, source, motif_echec, created_at, adresse_livraison, clients(nom, telephone)`)
      .neq('statut', 'annulee')

    const { data: lignes } = await supabase
      .from('lignes_commande')
      .select(`quantite, prix_total, produits(nom, activite)`)

    if (commandes && lignes) {
      const caTotal = commandes.reduce((sum, c) => sum + (c.montant_total || 0), 0)
      const nbCommandes = commandes.length
      const nbLivrees = commandes.filter(c => c.statut === 'livree').length
      const caLivre = commandes.filter(c => c.statut === 'livree').reduce((sum, c) => sum + (c.montant_total || 0), 0)
      const caWhatsapp = commandes.filter(c => c.source === 'whatsapp').reduce((sum, c) => sum + (c.montant_total || 0), 0)
      const caDirect = commandes.filter(c => c.source === 'direct').reduce((sum, c) => sum + (c.montant_total || 0), 0)
      const caB2b = commandes.filter(c => c.source === 'b2b').reduce((sum, c) => sum + (c.montant_total || 0), 0)
      const caImporte = lignes.filter(l => (l.produits as any)?.activite === 'importe').reduce((sum, l) => sum + (l.prix_total || 0), 0)
      const caCkDesign = lignes.filter(l => (l.produits as any)?.activite === 'ck_design').reduce((sum, l) => sum + (l.prix_total || 0), 0)

      // Non livrées = nouvelles + validees + en_livraison + echec
      const nonLivreesData = commandes.filter(c => c.statut !== 'livree')
      setNonLivrees(nonLivreesData)

      // Top produits
      const prodMap: any = {}
      lignes.forEach(l => {
        const nom = (l.produits as any)?.nom || 'Inconnu'
        if (!prodMap[nom]) prodMap[nom] = { nom, quantite: 0, ca: 0 }
        prodMap[nom].quantite += l.quantite
        prodMap[nom].ca += l.prix_total || 0
      })

      // Top clients
      const clientMap: any = {}
      commandes.forEach(c => {
        const nom = (c.clients as any)?.nom || (c.clients as any)?.telephone || 'Inconnu'
        if (!clientMap[nom]) clientMap[nom] = { nom, nb: 0, ca: 0 }
        clientMap[nom].nb += 1
        clientMap[nom].ca += c.montant_total || 0
      })

      // Par jour
      const parJour: any = {}
      commandes.forEach(c => {
        const jour = new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
        if (!parJour[jour]) parJour[jour] = 0
        parJour[jour] += c.montant_total || 0
      })

      setStats({ caTotal, nbCommandes, nbLivrees, caLivre, caWhatsapp, caDirect, caB2b, caImporte, caCkDesign })
      setTopProduits(Object.values(prodMap).sort((a: any, b: any) => b.ca - a.ca).slice(0, 5) as any)
      setTopClients(Object.values(clientMap).sort((a: any, b: any) => b.ca - a.ca).slice(0, 5) as any)
      setCommandesMois(Object.entries(parJour).map(([jour, ca]) => ({ jour, ca })).slice(-10))
    }
    setLoading(false)
  }

  const maxCa = Math.max(...commandesMois.map((c: any) => c.ca), 1)

  const statutColor: any = {
    nouvelle: '#E24B4A', validee: '#378ADD',
    en_livraison: '#EF9F27', livree: '#1D9E75', echec: '#E24B4A'
  }
  const statutLabel: any = {
    nouvelle: 'Nouvelle', validee: 'Validée',
    en_livraison: 'En livraison', livree: 'Livrée', echec: 'Échec'
  }

  const tabStyle = (t: string) => ({
    padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
    fontWeight: '500' as any, border: 'none',
    background: onglet === t ? '#1D9E75' : '#1a1a1a',
    color: onglet === t ? 'white' : '#666'
  })

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: 'sans-serif', color: 'white' }}>
      {/* TOPBAR */}
      <div style={{ background: '#111', borderBottom: '1px solid #222', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ color: '#1D9E75', fontSize: '1.4rem', margin: 0 }}>CK Dress ERP</h1>
        <div style={{ display: 'flex', gap: '16px' }}>
          <a href="/dashboard" style={{ color: '#666', fontSize: '13px', textDecoration: 'none' }}>Dashboard</a>
          <a href="/commandes" style={{ color: '#666', fontSize: '13px', textDecoration: 'none' }}>Commandes</a>
          <a href="/stock" style={{ color: '#666', fontSize: '13px', textDecoration: 'none' }}>Stock</a>
          <a href="/livraisons" style={{ color: '#666', fontSize: '13px', textDecoration: 'none' }}>Livraisons</a>
        </div>
      </div>

      <div style={{ padding: '24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#555', padding: '60px' }}>Chargement...</div>
        ) : (
          <>
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
              {[
                { label: 'CA Total', value: stats.caTotal?.toLocaleString('fr-FR') + ' F', color: '#1D9E75' },
                { label: 'Commandes', value: stats.nbCommandes, color: 'white' },
                { label: 'Livrées', value: stats.nbLivrees, color: '#1D9E75' },
                { label: 'Non livrées', value: nonLivrees.length, color: nonLivrees.length > 0 ? '#E24B4A' : '#1D9E75' },
              ].map((k, i) => (
                <div key={i} style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '8px' }}>{k.label}</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: k.color }}>{k.value}</div>
                </div>
              ))}
            </div>

            {/* ONGLETS */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <button style={tabStyle('overview')} onClick={() => setOnglet('overview')}>Vue générale</button>
              <button style={tabStyle('nonlivrees')} onClick={() => setOnglet('nonlivrees')}>
                Non livrées {nonLivrees.length > 0 && `(${nonLivrees.length})`}
              </button>
              <button style={tabStyle('produits')} onClick={() => setOnglet('produits')}>Top produits</button>
              <button style={tabStyle('clients')} onClick={() => setOnglet('clients')}>Top clients</button>
            </div>

            {/* ONGLET VUE GÉNÉRALE */}
            {onglet === 'overview' && (
              <>
                <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '13px', color: '#888', margin: '0 0 20px', textTransform: 'uppercase' }}>
                    Évolution CA — 10 derniers jours
                  </h2>
                  {commandesMois.length === 0 ? (
                    <div style={{ color: '#555', textAlign: 'center', padding: '30px' }}>Pas encore de données</div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '160px' }}>
                      {commandesMois.map((c: any, i) => (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                          <div style={{ fontSize: '10px', color: '#1D9E75', fontWeight: '600' }}>
                            {c.ca > 0 ? (c.ca / 1000).toFixed(0) + 'k' : ''}
                          </div>
                          <div style={{ width: '100%', background: '#1D9E75', borderRadius: '4px 4px 0 0', height: Math.max(4, (c.ca / maxCa) * 120) + 'px', opacity: 0.8 }} />
                          <div style={{ fontSize: '10px', color: '#555' }}>{c.jour}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '20px' }}>
                    <h2 style={{ fontSize: '13px', color: '#888', margin: '0 0 16px', textTransform: 'uppercase' }}>CA par activité</h2>
                    {[
                      { label: 'Importation', value: stats.caImporte, color: '#1D9E75' },
                      { label: 'CK Design local', value: stats.caCkDesign, color: '#7F77DD' },
                    ].map((a, i) => {
                      const total = (stats.caImporte || 0) + (stats.caCkDesign || 0)
                      const pct = total > 0 ? Math.round((a.value / total) * 100) : 0
                      return (
                        <div key={i} style={{ marginBottom: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '13px' }}>{a.label}</span>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: a.color }}>{a.value?.toLocaleString('fr-FR')} F</span>
                          </div>
                          <div style={{ background: '#1a1a1a', borderRadius: '4px', height: '8px' }}>
                            <div style={{ background: a.color, height: '100%', borderRadius: '4px', width: pct + '%' }} />
                          </div>
                          <div style={{ fontSize: '11px', color: '#555', marginTop: '3px' }}>{pct}% du CA</div>
                        </div>
                      )
                    })}
                  </div>

                  <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '20px' }}>
                    <h2 style={{ fontSize: '13px', color: '#888', margin: '0 0 16px', textTransform: 'uppercase' }}>CA par source</h2>
                    {[
                      { label: 'Vente directe', value: stats.caDirect, color: '#1D9E75' },
                      { label: 'WhatsApp', value: stats.caWhatsapp, color: '#25D366' },
                      { label: 'B2B', value: stats.caB2b, color: '#EF9F27' },
                    ].map((s, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #1a1a1a' }}>
                        <span style={{ fontSize: '13px', color: '#888' }}>{s.label}</span>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: s.color }}>{(s.value || 0).toLocaleString('fr-FR')} F</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ONGLET NON LIVRÉES */}
            {onglet === 'nonlivrees' && (
              <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '20px' }}>
                <h2 style={{ fontSize: '13px', color: '#888', margin: '0 0 16px', textTransform: 'uppercase' }}>
                  Commandes non livrées — {nonLivrees.length} au total
                </h2>
                {nonLivrees.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#1D9E75', padding: '40px', fontSize: '14px' }}>
                    🎉 Toutes les commandes ont été livrées !
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #222' }}>
                        {['#', 'Client', 'Téléphone', 'Adresse', 'Montant', 'Statut', 'Motif échec', 'Date'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '8px', color: '#555', fontWeight: '500' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {nonLivrees.map((c, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #1a1a1a' }}>
                          <td style={{ padding: '10px 8px', color: '#555' }}>#{c.numero}</td>
                          <td style={{ padding: '10px 8px', fontWeight: '500' }}>{(c.clients as any)?.nom || '—'}</td>
                          <td style={{ padding: '10px 8px', color: '#666' }}>{(c.clients as any)?.telephone || '—'}</td>
                          <td style={{ padding: '10px 8px', color: '#666' }}>{c.adresse_livraison || '—'}</td>
                          <td style={{ padding: '10px 8px', color: '#1D9E75', fontWeight: '600' }}>{(c.montant_total || 0).toLocaleString('fr-FR')} F</td>
                          <td style={{ padding: '10px 8px' }}>
                            <span style={{ background: (statutColor[c.statut] || '#555') + '22', color: statutColor[c.statut] || '#555', padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: '600' }}>
                              {statutLabel[c.statut] || c.statut}
                            </span>
                          </td>
                          <td style={{ padding: '10px 8px', color: c.motif_echec ? '#E24B4A' : '#555' }}>
                            {c.motif_echec || '—'}
                          </td>
                          <td style={{ padding: '10px 8px', color: '#555', fontSize: '11px' }}>
                            {new Date(c.created_at).toLocaleDateString('fr-FR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ONGLET TOP PRODUITS */}
            {onglet === 'produits' && (
              <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '20px' }}>
                <h2 style={{ fontSize: '13px', color: '#888', margin: '0 0 16px', textTransform: 'uppercase' }}>Top produits vendus</h2>
                {topProduits.length === 0 ? (
                  <div style={{ color: '#555', textAlign: 'center', padding: '40px' }}>Pas encore de ventes enregistrées</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #222' }}>
                        {['Rang', 'Produit', 'Quantité vendue', 'CA généré'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '10px 8px', color: '#555', fontWeight: '500' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {topProduits.map((p: any, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #1a1a1a' }}>
                          <td style={{ padding: '12px 8px' }}>
                            <div style={{ width: '24px', height: '24px', background: i === 0 ? '#EF9F2722' : '#1a1a1a', color: i === 0 ? '#EF9F27' : '#555', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700' }}>
                              {i + 1}
                            </div>
                          </td>
                          <td style={{ padding: '12px 8px', fontWeight: '500' }}>{p.nom}</td>
                          <td style={{ padding: '12px 8px', color: '#888' }}>{p.quantite} pièces</td>
                          <td style={{ padding: '12px 8px', color: '#1D9E75', fontWeight: '600' }}>{p.ca?.toLocaleString('fr-FR')} F</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ONGLET TOP CLIENTS */}
            {onglet === 'clients' && (
              <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '20px' }}>
                <h2 style={{ fontSize: '13px', color: '#888', margin: '0 0 16px', textTransform: 'uppercase' }}>Top clients</h2>
                {topClients.length === 0 ? (
                  <div style={{ color: '#555', textAlign: 'center', padding: '40px' }}>Pas encore de clients</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #222' }}>
                        {['Rang', 'Client', 'Nb commandes', 'CA total'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '10px 8px', color: '#555', fontWeight: '500' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {topClients.map((c: any, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #1a1a1a' }}>
                          <td style={{ padding: '12px 8px' }}>
                            <div style={{ width: '24px', height: '24px', background: i === 0 ? '#EF9F2722' : '#1a1a1a', color: i === 0 ? '#EF9F27' : '#555', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700' }}>
                              {i + 1}
                            </div>
                          </td>
                          <td style={{ padding: '12px 8px', fontWeight: '500' }}>{c.nom}</td>
                          <td style={{ padding: '12px 8px', color: '#888' }}>{c.nb} commandes</td>
                          <td style={{ padding: '12px 8px', color: '#1D9E75', fontWeight: '600' }}>{c.ca?.toLocaleString('fr-FR')} F</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}