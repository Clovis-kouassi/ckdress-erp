'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Stock() {
  const [produits, setProduits] = useState<any[]>([])
  const [stocks, setStocks] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState('')
  const [showNewProduit, setShowNewProduit] = useState(false)

  // Formulaire stock
  const [taille, setTaille] = useState('M')
  const [couleur, setCouleur] = useState('Blanc')
  const [quantite, setQuantite] = useState(0)
  const [seuil, setSeuil] = useState(5)

  // Formulaire nouveau produit
  const [nomProd, setNomProd] = useState('')
  const [refProd, setRefProd] = useState('')
  const [categorieProd, setCategorieProd] = useState('polo')
  const [activiteProd, setActiviteProd] = useState('importe')
  const [prixVente, setPrixVente] = useState(0)
  const [prixAchat, setPrixAchat] = useState(0)
  const [savingProd, setSavingProd] = useState(false)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data: prods } = await supabase.from('produits').select('*').eq('actif', true)
    const { data: stk } = await supabase.from('stock').select(`*, produits(nom, activite)`)
    setProduits(prods || [])
    setStocks(stk || [])
    setLoading(false)
  }

  function getStockProduit(produitId: string) {
    return stocks.filter(s => s.produit_id === produitId)
  }

  function getTotalProduit(produitId: string) {
    return getStockProduit(produitId).reduce((sum, s) => sum + s.quantite, 0)
  }

  function getAlerteProduit(produitId: string) {
    return getStockProduit(produitId).some(s => s.quantite <= s.seuil_alerte)
  }

  async function saveNouveauProduit() {
    if (!nomProd || !refProd) return alert('Nom et référence obligatoires !')
    setSavingProd(true)
    const { error } = await supabase.from('produits').insert({
      nom: nomProd, reference: refProd,
      categorie: categorieProd, activite: activiteProd,
      prix_vente: prixVente, prix_achat: prixAchat, actif: true
    })
    if (error) {
      alert('Erreur : ' + error.message)
    } else {
      setSuccess('✅ Produit ajouté au catalogue !')
      setNomProd(''); setRefProd(''); setPrixVente(0); setPrixAchat(0)
      setShowNewProduit(false)
      fetchData()
      setTimeout(() => setSuccess(''), 3000)
    }
    setSavingProd(false)
  }

  async function saveStock() {
    if (!selected) return
    const { error } = await supabase.from('stock').upsert({
      produit_id: selected.id, taille, couleur,
      quantite, seuil_alerte: seuil
    }, { onConflict: 'produit_id,taille,couleur' })
    if (error) {
      alert('Erreur : ' + error.message)
    } else {
      setSuccess('✅ Stock enregistré !')
      setTaille('M')
      setCouleur('Blanc')
      setQuantite(0)
      setSeuil(5)
      fetchData()
      setTimeout(() => setSuccess(''), 2000)
    }
  }

  const inputStyle = {
    width: '100%', padding: '9px', borderRadius: '8px',
    border: '1px solid #333', background: '#1a1a1a',
    color: 'white', fontSize: '13px', boxSizing: 'border-box' as any
  }

  const totalAlertes = stocks.filter(s => s.quantite <= s.seuil_alerte).length
  const totalUnites = stocks.reduce((sum, s) => sum + s.quantite, 0)

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: 'sans-serif', color: 'white' }}>
      {/* TOPBAR */}
      <div style={{ background: '#111', borderBottom: '1px solid #222', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ color: '#1D9E75', fontSize: '1.4rem', margin: 0 }}>CK Dress ERP</h1>
        <div style={{ display: 'flex', gap: '16px' }}>
          <a href="/dashboard" style={{ color: '#666', fontSize: '13px', textDecoration: 'none' }}>Dashboard</a>
          <a href="/commandes" style={{ color: '#666', fontSize: '13px', textDecoration: 'none' }}>Commandes</a>
          <a href="/livraisons" style={{ color: '#666', fontSize: '13px', textDecoration: 'none' }}>Livraisons</a>
        </div>
      </div>

      <div style={{ padding: '24px' }}>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Produits catalogue', value: produits.length, color: 'white' },
            { label: 'Alertes stock', value: totalAlertes, color: totalAlertes > 0 ? '#E24B4A' : '#1D9E75' },
            { label: 'Total unités', value: totalUnites, color: '#1D9E75' },
          ].map((k, i) => (
            <div key={i} style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '8px' }}>{k.label}</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* MODAL NOUVEAU PRODUIT */}
        {showNewProduit && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#111', border: '1px solid #333', borderRadius: '16px', padding: '28px', width: '480px', maxWidth: '95vw' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, fontSize: '16px', color: 'white' }}>Nouveau produit</h2>
                <button onClick={() => setShowNewProduit(false)} style={{ background: 'none', border: 'none', color: '#666', fontSize: '20px', cursor: 'pointer' }}>✕</button>
              </div>

              {success && (
                <div style={{ background: '#0a2a1a', border: '1px solid #1D9E75', borderRadius: '8px', padding: '10px', color: '#1D9E75', fontSize: '13px', marginBottom: '16px' }}>
                  {success}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ color: '#666', fontSize: '11px', display: 'block', marginBottom: '4px' }}>Nom produit *</label>
                  <input style={inputStyle} value={nomProd} onChange={e => setNomProd(e.target.value)} placeholder="ex: Polo Classic" />
                </div>
                <div>
                  <label style={{ color: '#666', fontSize: '11px', display: 'block', marginBottom: '4px' }}>Référence *</label>
                  <input style={inputStyle} value={refProd} onChange={e => setRefProd(e.target.value)} placeholder="ex: CK-POL-002" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ color: '#666', fontSize: '11px', display: 'block', marginBottom: '4px' }}>Catégorie</label>
                  <select style={inputStyle} value={categorieProd} onChange={e => setCategorieProd(e.target.value)}>
                    {['polo','t-shirt','chemise','jupe','robe','pantalon','veste','autre'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ color: '#666', fontSize: '11px', display: 'block', marginBottom: '4px' }}>Activité</label>
                  <select style={inputStyle} value={activiteProd} onChange={e => setActiviteProd(e.target.value)}>
                    <option value="importe">Importation</option>
                    <option value="ck_design">CK Design (local)</option>
                    <option value="b2b">B2B</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ color: '#666', fontSize: '11px', display: 'block', marginBottom: '4px' }}>Prix de vente (F)</label>
                  <input type="number" style={inputStyle} value={prixVente} onChange={e => setPrixVente(parseInt(e.target.value))} />
                </div>
                <div>
                  <label style={{ color: '#666', fontSize: '11px', display: 'block', marginBottom: '4px' }}>Prix d'achat (F)</label>
                  <input type="number" style={inputStyle} value={prixAchat} onChange={e => setPrixAchat(parseInt(e.target.value))} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowNewProduit(false)} style={{ flex: 1, background: 'none', border: '1px solid #333', color: '#888', padding: '11px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                  Annuler
                </button>
                <button onClick={saveNouveauProduit} disabled={savingProd} style={{ flex: 2, background: '#1D9E75', color: 'white', border: 'none', padding: '11px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                  {savingProd ? 'Enregistrement...' : 'Ajouter au catalogue'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr 1fr' : '1fr 1fr', gap: '20px' }}>

          {/* LISTE PRODUITS */}
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '13px', color: '#888', margin: 0, textTransform: 'uppercase' }}>Catalogue produits</h2>
              <button onClick={() => setShowNewProduit(true)} style={{ background: '#1D9E75', color: 'white', border: 'none', padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                + Nouveau produit
              </button>
            </div>
            {loading ? (
              <div style={{ color: '#555', textAlign: 'center', padding: '20px' }}>Chargement...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {produits.map(p => {
                  const total = getTotalProduit(p.id)
                  const alerte = getAlerteProduit(p.id)
                  const isSelected = selected?.id === p.id
                  return (
                    <div key={p.id} onClick={() => setSelected(p)}
                      style={{
                        padding: '14px 16px', borderRadius: '10px', cursor: 'pointer',
                        border: `1px solid ${isSelected ? '#1D9E75' : '#222'}`,
                        background: isSelected ? '#0a2a1a' : '#1a1a1a',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        transition: 'all .15s'
                      }}>
                      <div>
                        <div style={{ fontWeight: '500', fontSize: '14px', marginBottom: '2px' }}>{p.nom}</div>
                        <div style={{ fontSize: '11px', color: '#666' }}>{p.activite} · {p.prix_vente?.toLocaleString('fr-FR')} F</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: alerte ? '#E24B4A' : total === 0 ? '#555' : '#1D9E75' }}>{total}</div>
                        {alerte && <div style={{ fontSize: '10px', color: '#E24B4A' }}>⚠ alerte</div>}
                        {total === 0 && <div style={{ fontSize: '10px', color: '#555' }}>pas de stock</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* DETAIL STOCK */}
          {selected && (
            <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <h2 style={{ fontSize: '13px', color: '#888', margin: 0, textTransform: 'uppercase' }}>Stock — {selected.nom}</h2>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '16px' }}>✕</button>
              </div>
              <div style={{ fontSize: '12px', color: '#555', marginBottom: '16px' }}>{selected.activite} · {selected.prix_vente?.toLocaleString('fr-FR')} F</div>

              {getStockProduit(selected.id).length === 0 ? (
                <div style={{ color: '#555', textAlign: 'center', padding: '30px' }}>
                  Aucun stock enregistré.<br/>Utilisez le formulaire →
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #222' }}>
                      {['Taille', 'Couleur', 'Stock', 'État'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px', color: '#555', fontWeight: '500' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {getStockProduit(selected.id).map((s, i) => {
                      const color = s.quantite <= s.seuil_alerte ? '#E24B4A' : s.quantite <= s.seuil_alerte * 2 ? '#EF9F27' : '#1D9E75'
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #1a1a1a' }}>
                          <td style={{ padding: '10px 8px' }}>{s.taille}</td>
                          <td style={{ padding: '10px 8px', color: '#888' }}>{s.couleur}</td>
                          <td style={{ padding: '10px 8px', fontWeight: '700', color }}>{s.quantite}</td>
                          <td style={{ padding: '10px 8px' }}>
                            <span style={{ background: color + '22', color, padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: '600' }}>
                              {s.quantite <= s.seuil_alerte ? '⚠ Alerte' : s.quantite <= s.seuil_alerte * 2 ? 'Faible' : 'OK'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* FORMULAIRE STOCK */}
          {selected && (
            <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '20px' }}>
              <h2 style={{ fontSize: '13px', color: '#888', margin: '0 0 16px', textTransform: 'uppercase' }}>
                Ajouter stock — {selected.nom}
              </h2>

              {success && (
                <div style={{ background: '#0a2a1a', border: '1px solid #1D9E75', borderRadius: '8px', padding: '10px', color: '#1D9E75', fontSize: '13px', marginBottom: '12px' }}>
                  {success}
                </div>
              )}

              <div style={{ marginBottom: '12px' }}>
                <label style={{ color: '#666', fontSize: '11px', display: 'block', marginBottom: '4px' }}>Taille</label>
                <select style={inputStyle} value={taille} onChange={e => setTaille(e.target.value)}>
                  {['XS','S','M','L','XL','XXL'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ color: '#666', fontSize: '11px', display: 'block', marginBottom: '4px' }}>Couleur</label>
                <select style={inputStyle} value={couleur} onChange={e => setCouleur(e.target.value)}>
                  {['Blanc','Noir','Bleu','Rouge','Beige','Vert'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                <div>
                  <label style={{ color: '#666', fontSize: '11px', display: 'block', marginBottom: '4px' }}>Quantité</label>
                  <input type="number" min="0" style={inputStyle} value={quantite} onChange={e => setQuantite(parseInt(e.target.value))} />
                </div>
                <div>
                  <label style={{ color: '#666', fontSize: '11px', display: 'block', marginBottom: '4px' }}>Seuil alerte</label>
                  <input type="number" min="1" style={inputStyle} value={seuil} onChange={e => setSeuil(parseInt(e.target.value))} />
                </div>
              </div>
              <button onClick={saveStock} style={{ width: '100%', background: '#1D9E75', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                Enregistrer stock
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}