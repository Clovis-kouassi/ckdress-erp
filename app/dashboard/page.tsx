'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

export default function Dashboard() {
  const [commandes, setCommandes] = useState<any[]>([])
  const [stats, setStats] = useState({
    total: 0, count: 0, alertes: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const { data: cmds } = await supabase
      .from('commandes')
      .select(`
        numero, montant_total, statut, source, created_at,
        clients (nom, telephone)
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    const { data: alertes } = await supabase
      .from('stock')
      .select('id')
      .lt('quantite', 5)

    const { data: caData } = await supabase
      .from('commandes')
      .select('montant_total')
      .neq('statut', 'annulee')

    const caTotal = caData?.reduce((sum, c) => sum + (c.montant_total || 0), 0) || 0

    setCommandes(cmds || [])
    setStats({
      total: caTotal,
      count: caData?.length || 0,
      alertes: alertes?.length || 0
    })
    setLoading(false)
  }

  const statutColor: any = {
    nouvelle: '#E24B4A',
    validee: '#378ADD',
    en_livraison: '#EF9F27',
    livree: '#1D9E75',
    annulee: '#555'
  }
  const statutLabel: any = {
    nouvelle: 'Nouvelle',
    validee: 'Validée',
    en_livraison: 'En livraison',
    livree: 'Livrée',
    annulee: 'Annulée'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: 'sans-serif', color: 'white' }}>
      <div style={{
        background: '#111', borderBottom: '1px solid #222',
        padding: '16px 24px', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center'
      }}>
        <h1 style={{ color: '#1D9E75', fontSize: '1.4rem', margin: 0 }}>CK Dress ERP</h1>
        <div style={{ display: 'flex', gap: '16px' }}>
          <a href="/commandes" style={{ color: '#666', fontSize: '13px', textDecoration: 'none' }}>Commandes</a>
          <a href="/stock" style={{ color: '#666', fontSize: '13px', textDecoration: 'none' }}>Stock</a>
          <a href="/livraisons" style={{ color: '#666', fontSize: '13px', textDecoration: 'none' }}>Livraisons</a>
        </div>
      </div>

      <div style={{ padding: '24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#555', padding: '60px' }}>
            Chargement des données...
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '16px', marginBottom: '24px'
            }}>
              {[
                { label: 'CA Total', value: stats.total.toLocaleString('fr-FR') + ' F', color: '#1D9E75', sub: 'Toutes commandes' },
                { label: 'Commandes', value: stats.count.toString(), color: 'white', sub: 'Total enregistrées' },
                { label: 'Stock critique', value: stats.alertes.toString(), color: stats.alertes > 0 ? '#E24B4A' : '#1D9E75', sub: 'articles en alerte' },
                { label: 'Marge estimée', value: '34%', color: '#EF9F27', sub: 'moyenne' },
              ].map((kpi, i) => (
                <div key={i} style={{
                  background: '#111', border: '1px solid #222',
                  borderRadius: '12px', padding: '20px'
                }}>
                  <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '8px' }}>
                    {kpi.label}
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: kpi.color }}>
                    {kpi.value}
                  </div>
                  <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>
                    {kpi.sub}
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              background: '#111', border: '1px solid #222',
              borderRadius: '12px', padding: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '14px', color: '#888', margin: 0, textTransform: 'uppercase' }}>
                  Dernières commandes
                </h2>
                <a href="/commandes" style={{
                  background: '#1D9E75', color: 'white', padding: '8px 16px',
                  borderRadius: '8px', fontSize: '12px', textDecoration: 'none', fontWeight: '600'
                }}>
                  + Nouvelle commande
                </a>
              </div>

              {commandes.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#555', padding: '40px' }}>
                  Aucune commande pour l'instant.<br/>
                  <a href="/commandes" style={{ color: '#1D9E75' }}>Créer la première commande →</a>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #222' }}>
                      {['#', 'Client', 'Téléphone', 'Montant', 'Source', 'Statut'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px', color: '#555', fontWeight: '500' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {commandes.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #1a1a1a' }}>
                        <td style={{ padding: '12px 8px', color: '#555' }}>#{row.numero}</td>
                        <td style={{ padding: '12px 8px' }}>{(row.clients as any)?.nom || '—'}</td>
                        <td style={{ padding: '12px 8px', color: '#666' }}>{(row.clients as any)?.telephone || '—'}</td>
                        <td style={{ padding: '12px 8px', color: '#1D9E75', fontWeight: '600' }}>
                          {(row.montant_total || 0).toLocaleString('fr-FR')} F
                        </td>
                        <td style={{ padding: '12px 8px', color: '#666', textTransform: 'capitalize' }}>{row.source}</td>
                        <td style={{ padding: '12px 8px' }}>
                          <span style={{
                            background: (statutColor[row.statut] || '#555') + '22',
                            color: statutColor[row.statut] || '#555',
                            padding: '3px 10px', borderRadius: '20px',
                            fontSize: '11px', fontWeight: '600'
                          }}>
                            {statutLabel[row.statut] || row.statut}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}