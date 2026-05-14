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
  annule: { label: 'Annulé', color: '#888' },
}

const TAILLES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

const PERIODES = [
  { key: 'tous', label: 'Tout' },
  { key: 'jour', label: "Aujourd'hui" },
  { key: 'semaine', label: 'Cette semaine' },
  { key: 'mois', label: 'Ce mois' },
  { key: 'annee', label: 'Cette année' },
]

function calculerPrixReduit(produit: any): number | null {
  if (!produit.reduction_type) return null
  if (produit.reduction_type === 'fixe') return Math.max(0, produit.prix_vente - (produit.reduction_valeur || 0))
  if (produit.reduction_type === 'pourcentage') return Math.round(produit.prix_vente * (1 - (produit.reduction_valeur || 0) / 100))
  return null
}

export default function CommercialPage() {
  const [onglet, setOnglet] = useState<'catalogue' | 'commandes' | 'stats'>('catalogue')
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [filtrePeriode, setFiltrePeriode] = useState<'tous' | 'jour' | 'semaine' | 'mois' | 'annee'>('tous')
  const [filtreStatut, setFiltreStatut] = useState('')

  // CATALOGUE
  const [produits, setProduits] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [stock, setStock] = useState<any[]>([])
  const [filtreTaille, setFiltreTaille] = useState('')
  const [filtreCategorie, setFiltreCategorie] = useState('')
  const [produitSelectionne, setProduitSelectionne] = useState<any>(null)
  const [stockProduit, setStockProduit] = useState<any[]>([])
  const [loadingStock, setLoadingStock] = useState(false)

  // COMMANDES
  const [commandes, setCommandes] = useState<any[]>([])
  const [livreurs, setLivreurs] = useState<any[]>([])

  // FORMULAIRE COMMANDE
  const [showFormCommande, setShowFormCommande] = useState(false)
  const [tailleChoisie, setTailleChoisie] = useState('')
  const [couleurChoisie, setCouleurChoisie] = useState('')
  const [quantite, setQuantite] = useState(1)
  const [form, setForm] = useState({
    nom_client: '', telephone: '', adresse: '',
    frais_livraison: 1500, note: '', livreur_id: ''
  })

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('ck_user') || '{}')
    setUser(u)
    fetchData(u)
  }, [])

  const fetchData = async (u?: any) => {
    const currentUser = u || user
    const activite = currentUser?.activite
    const isGlobal = !activite || activite === 'ck_dress'

    const prodsQuery = isGlobal
      ? supabase.from('produits').select('*').eq('disponible', true).order('nom')
      : supabase.from('produits').select('*').eq('disponible', true).eq('activite', activite).order('nom')

    const catsQuery = isGlobal
      ? supabase.from('categories').select('*').order('activite').order('ordre')
      : supabase.from('categories').select('*').eq('activite', activite).order('ordre')

    const cmdsQuery = isGlobal
      ? supabase.from('commandes_catalogue').select('*').order('created_at', { ascending: false })
      : supabase.from('commandes_catalogue').select('*').eq('activite', activite).order('created_at', { ascending: false })

    const [{ data: prods }, { data: cats }, { data: cmds }, { data: livs }, { data: stockData }] = await Promise.all([
      prodsQuery, catsQuery, cmdsQuery,
      supabase.from('livreurs').select('*').eq('actif', true),
      supabase.from('stock').select('*'),
    ])

    setProduits(prods || [])
    setCategories(cats || [])
    setCommandes(cmds || [])
    setLivreurs(livs || [])
    setStock(stockData || [])
    setLoading(false)
  }

  function filtrerParPeriode(date: string) {
    if (filtrePeriode === 'tous') return true
    const now = new Date()
    const d = new Date(date)
    if (filtrePeriode === 'jour') return d.toDateString() === now.toDateString()
    if (filtrePeriode === 'semaine') return (now.getTime() - d.getTime()) / (1000 * 3600 * 24) <= 7
    if (filtrePeriode === 'mois') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    if (filtrePeriode === 'annee') return d.getFullYear() === now.getFullYear()
    return true
  }

  const commandesFiltrees = commandes.filter(c => {
    const okPeriode = filtrerParPeriode(c.created_at)
    const okStatut = !filtreStatut || c.statut === filtreStatut
    return okPeriode && okStatut
  })

  // FILTRER PRODUITS
  const produitsFiltres = produits.filter(p => {
    const matchCat = !filtreCategorie || p.categorie?.toLowerCase() === filtreCategorie.toLowerCase()
    const stockProd = stock.filter(s => s.produit_id === p.id && (!filtreTaille || s.taille === filtreTaille) && s.quantite > 0)
    return matchCat && (filtreTaille ? stockProd.length > 0 : true)
  })

  async function ouvrirProduit(produit: any) {
    setProduitSelectionne(produit)
    setTailleChoisie('')
    setCouleurChoisie('')
    setQuantite(1)
    setLoadingStock(true)
    const { data } = await supabase.from('stock').select('*').eq('produit_id', produit.id).gt('quantite', 0)
    setStockProduit(data || [])
    setLoadingStock(false)
  }

  const stockParTaille = tailleChoisie ? stockProduit.filter(s => s.taille === tailleChoisie) : []
  const stockChoisi = stockParTaille.find(s => s.couleur === couleurChoisie)
  const prixReduit = produitSelectionne ? calculerPrixReduit(produitSelectionne) : null
  const prixUnitaire = prixReduit || produitSelectionne?.prix_vente || 0
  const montantTotal = prixUnitaire * quantite + form.frais_livraison

  async function creerCommande() {
    if (!produitSelectionne || !form.telephone || !tailleChoisie || !couleurChoisie) {
      alert('Renseignez le téléphone, la taille et la couleur.')
      return
    }
    setSaving(true)
    await supabase.from('commandes_catalogue').insert({
      nom_client: form.nom_client,
      telephone: form.telephone,
      adresse: form.adresse,
      produit_ref: produitSelectionne.reference,
      taille: tailleChoisie,
      variantes: couleurChoisie,
      quantite: quantite,
      montant_total: montantTotal,
      frais_livraison: form.frais_livraison,
      note: form.note,
      livreur_id: form.livreur_id || null,
      statut: form.livreur_id ? 'en_livraison' : 'nouveau',
      source: 'commercial',
      activite: produitSelectionne.activite || user?.activite || 'ck_design',
    })
    setSuccess('✅ Commande créée avec succès !')
    setTimeout(() => setSuccess(''), 3000)
    setProduitSelectionne(null)
    setShowFormCommande(false)
    setForm({ nom_client: '', telephone: '', adresse: '', frais_livraison: 1500, note: '', livreur_id: '' })
    setTailleChoisie('')
    setCouleurChoisie('')
    setQuantite(1)
    await fetchData()
    setOnglet('commandes')
    setSaving(false)
  }

  const caTotal = commandesFiltrees.reduce((s, c) => s + (c.montant_total || 0), 0)
  const caJour = commandes.filter(c => c.created_at?.startsWith(new Date().toISOString().split('T')[0])).reduce((s, c) => s + (c.montant_total || 0), 0)
  const nouvelles = commandesFiltrees.filter(c => c.statut === 'nouveau').length
  const livrees = commandesFiltrees.filter(c => c.statut === 'livre').length

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: "'Inter', sans-serif", color: '#1a1a1a' }}>

      {/* MODAL PRODUIT */}
      {produitSelectionne && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => { if (!showFormCommande) setProduitSelectionne(null) }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>

            <div style={{ position: 'relative' }}>
              <div style={{ height: 240, background: 'linear-gradient(135deg, #f0ece4, #e8e1d5)', overflow: 'hidden', borderRadius: '20px 20px 0 0' }}>
                {produitSelectionne.image_url
                  ? <img src={produitSelectionne.image_url} alt={produitSelectionne.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60, opacity: 0.2 }}>👗</div>
                }
              </div>
              <button onClick={() => { setProduitSelectionne(null); setShowFormCommande(false) }}
                style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ✕
              </button>
              {produitSelectionne.reduction_type && (
                <div style={{ position: 'absolute', top: 12, left: 12, background: '#E24B4A', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>
                  {produitSelectionne.reduction_type === 'pourcentage' ? `-${produitSelectionne.reduction_valeur}%` : `-${produitSelectionne.reduction_valeur?.toLocaleString('fr-FR')} F`}
                </div>
              )}
            </div>

            <div style={{ padding: '20px 24px' }}>
              <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}>{produitSelectionne.nom}</h2>
              <p style={{ margin: '0 0 4px', fontSize: 12, color: '#aaa' }}>Réf: {produitSelectionne.reference}</p>
              <div style={{ margin: '12px 0' }}>
                {prixReduit ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 14, color: '#aaa', textDecoration: 'line-through' }}>{produitSelectionne.prix_vente?.toLocaleString('fr-FR')} F</span>
                    <span style={{ fontSize: 22, fontWeight: 700, color: '#E24B4A' }}>{prixReduit.toLocaleString('fr-FR')} F</span>
                  </div>
                ) : (
                  <span style={{ fontSize: 22, fontWeight: 700, color: '#1D9E75' }}>{produitSelectionne.prix_vente?.toLocaleString('fr-FR')} F</span>
                )}
              </div>

              {!showFormCommande ? (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>Taille</label>
                    {loadingStock ? <p style={{ color: '#aaa', fontSize: 13 }}>Chargement...</p> : (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {TAILLES.map(t => {
                          const dispo = stockProduit.some(s => s.taille === t && s.quantite > 0)
                          return (
                            <button key={t} onClick={() => { if (dispo) { setTailleChoisie(t); setCouleurChoisie('') } }} disabled={!dispo}
                              style={{ padding: '8px 14px', borderRadius: 9, border: `2px solid ${tailleChoisie === t ? '#378ADD' : dispo ? '#e5e7eb' : '#f0f0f0'}`, background: tailleChoisie === t ? '#378ADD' : dispo ? '#fff' : '#f8f8f8', color: tailleChoisie === t ? '#fff' : dispo ? '#1a1a1a' : '#ccc', fontWeight: 600, fontSize: 13, cursor: dispo ? 'pointer' : 'not-allowed' }}>
                              {t}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {tailleChoisie && (
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>Couleur</label>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {stockParTaille.map(s => (
                          <button key={s.id} onClick={() => setCouleurChoisie(s.couleur)}
                            style={{ padding: '8px 14px', borderRadius: 9, border: `2px solid ${couleurChoisie === s.couleur ? '#378ADD' : '#e5e7eb'}`, background: couleurChoisie === s.couleur ? '#eff6ff' : '#fff', color: couleurChoisie === s.couleur ? '#378ADD' : '#1a1a1a', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                            {s.couleur} <span style={{ fontSize: 11, color: s.quantite <= 5 ? '#E24B4A' : '#aaa' }}>({s.quantite})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {couleurChoisie && (
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>Quantité</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button onClick={() => setQuantite(Math.max(1, quantite - 1))}
                          style={{ width: 36, height: 36, borderRadius: 9, border: '1.5px solid #e5e7eb', background: '#f8f9fa', fontSize: 18, cursor: 'pointer', fontWeight: 700 }}>−</button>
                        <span style={{ fontSize: 20, fontWeight: 700, minWidth: 30, textAlign: 'center' }}>{quantite}</span>
                        <button onClick={() => setQuantite(Math.min(stockChoisi?.quantite || 1, quantite + 1))}
                          style={{ width: 36, height: 36, borderRadius: 9, border: '1.5px solid #e5e7eb', background: '#f8f9fa', fontSize: 18, cursor: 'pointer', fontWeight: 700 }}>+</button>
                        <span style={{ fontSize: 12, color: '#aaa' }}>max {stockChoisi?.quantite || 0}</span>
                      </div>
                    </div>
                  )}

                  <button onClick={() => setShowFormCommande(true)} disabled={!tailleChoisie || !couleurChoisie}
                    style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: !tailleChoisie || !couleurChoisie ? '#e5e7eb' : '#378ADD', color: !tailleChoisie || !couleurChoisie ? '#aaa' : '#fff', fontWeight: 700, fontSize: 15, cursor: !tailleChoisie || !couleurChoisie ? 'not-allowed' : 'pointer' }}>
                    Passer la commande →
                  </button>
                </>
              ) : (
                <>
                  <div style={{ background: '#f8f9fa', borderRadius: 12, padding: 14, marginBottom: 14 }}>
                    <p style={{ margin: 0, fontSize: 13, color: '#555' }}>
                      🛍️ <strong>{produitSelectionne.nom}</strong> — {tailleChoisie} — {couleurChoisie} × {quantite}
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                    {[
                      { label: 'Nom du client', key: 'nom_client', placeholder: 'Ex: Kouassi Jean', type: 'text' },
                      { label: '📞 Téléphone *', key: 'telephone', placeholder: 'Ex: 0700000000', type: 'tel' },
                      { label: '📍 Adresse livraison', key: 'adresse', placeholder: 'Quartier, commune...', type: 'text' },
                    ].map(f => (
                      <div key={f.key}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>{f.label}</label>
                        <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                          placeholder={f.placeholder} type={f.type}
                          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none' }} />
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Frais livraison (F)</label>
                        <input type="number" value={form.frais_livraison} onChange={e => setForm(p => ({ ...p, frais_livraison: Number(e.target.value) }))}
                          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Livreur (optionnel)</label>
                        <select value={form.livreur_id} onChange={e => setForm(p => ({ ...p, livreur_id: e.target.value }))}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', background: '#fff' }}>
                          <option value="">Sans livreur</option>
                          {livreurs.map(l => <option key={l.id} value={l.id}>{l.nom}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Note</label>
                      <input value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                        placeholder="Note optionnelle..."
                        style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none' }} />
                    </div>
                  </div>

                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: '#555' }}>Prix × {quantite}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{(prixUnitaire * quantite).toLocaleString('fr-FR')} F</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #e5e7eb' }}>
                      <span style={{ fontSize: 13, color: '#555' }}>Frais livraison</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{form.frais_livraison.toLocaleString('fr-FR')} F</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#1D9E75' }}>Total</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#1D9E75' }}>{montantTotal.toLocaleString('fr-FR')} F</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setShowFormCommande(false)}
                      style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: 'transparent', color: '#888', cursor: 'pointer', fontWeight: 600 }}>
                      ← Retour
                    </button>
                    <button onClick={creerCommande} disabled={saving || !form.telephone}
                      style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: !form.telephone ? '#e5e7eb' : '#1D9E75', color: !form.telephone ? '#888' : '#fff', cursor: !form.telephone ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14 }}>
                      {saving ? '⏳ Création...' : '✅ Confirmer la commande'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>
        <div>
          <h1 style={{ color: '#38bdf8', margin: 0, fontSize: '16px', fontWeight: 700 }}>💼 Espace Commercial</h1>
          <p style={{ color: '#94a3b8', margin: '2px 0 0', fontSize: '11px' }}>
            {user?.nom}
            {user?.activite && user.activite !== 'ck_dress' && (
              <span style={{ marginLeft: 6, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', fontSize: 10, padding: '1px 7px', borderRadius: 10, fontWeight: 600 }}>
                {user.activite === 'ck_design' ? '🎨 CK Design' : '✨ Succès Design'}
              </span>
            )}
          </p>
        </div>
        <button onClick={() => { localStorage.removeItem('ck_user'); window.location.href = '/login' }}
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#94a3b8', padding: '6px 12px', fontSize: '11px', cursor: 'pointer' }}>
          Déconnexion
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', padding: '16px 16px 0' }}>
        {[
          { label: 'CA Total', value: caTotal.toLocaleString('fr-FR') + ' F', color: '#378ADD', bg: '#eff6ff' },
          { label: "CA aujourd'hui", value: caJour.toLocaleString('fr-FR') + ' F', color: '#1D9E75', bg: '#f0fdf4' },
          { label: 'Nouvelles', value: nouvelles, color: '#E24B4A', bg: '#fff0f0' },
          { label: 'Livrées', value: livrees, color: '#1D9E75', bg: '#f0fdf4' },
        ].map((k, i) => (
          <div key={i} style={{ background: k.bg, border: `1px solid ${k.color}22`, borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600, letterSpacing: 0.5 }}>{k.label}</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* ONGLETS */}
      <div style={{ display: 'flex', background: '#fff', margin: '16px 16px 0', borderRadius: '12px', padding: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', gap: '4px' }}>
        {[
          { key: 'catalogue', label: '🛍️ Catalogue' },
          { key: 'commandes', label: '📦 Commandes' },
          { key: 'stats', label: '📊 Statistiques' },
        ].map(o => (
          <button key={o.key} onClick={() => setOnglet(o.key as any)}
            style={{ flex: 1, padding: '10px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, background: onglet === o.key ? '#378ADD' : 'transparent', color: onglet === o.key ? '#fff' : '#888' }}>
            {o.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px' }}>
        {success && (
          <div style={{ background: '#f0fdf4', border: '1px solid #1D9E75', borderRadius: '10px', padding: '12px 16px', color: '#1D9E75', fontSize: '13px', marginBottom: '12px', fontWeight: 600 }}>
            {success}
          </div>
        )}

        {/* FILTRE PÉRIODE — visible sur commandes et stats */}
        {(onglet === 'commandes' || onglet === 'stats') && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {PERIODES.map(p => (
              <button key={p.key} onClick={() => setFiltrePeriode(p.key as any)}
                style={{ padding: '7px 16px', borderRadius: 20, border: `1.5px solid ${filtrePeriode === p.key ? '#378ADD' : '#e5e7eb'}`, background: filtrePeriode === p.key ? '#378ADD' : '#fff', color: filtrePeriode === p.key ? '#fff' : '#555', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* ONGLET CATALOGUE */}
        {onglet === 'catalogue' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Taille</label>
                <select value={filtreTaille} onChange={e => setFiltreTaille(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', background: '#fff' }}>
                  <option value="">Toutes les tailles</option>
                  {TAILLES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Catégorie</label>
                <select value={filtreCategorie} onChange={e => setFiltreCategorie(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', background: '#fff' }}>
                  <option value="">Toutes catégories</option>
                  {categories.map(c => <option key={c.id} value={c.nom}>{c.nom}</option>)}
                </select>
              </div>
            </div>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#888' }}>{produitsFiltres.length} produit(s)</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              {produitsFiltres.map(prod => {
                const stockProd = stock.filter(s => s.produit_id === prod.id)
                const stockTotal = stockProd.reduce((s, i) => s + i.quantite, 0)
                const prixR = calculerPrixReduit(prod)
                return (
                  <div key={prod.id} onClick={() => ouvrirProduit(prod)}
                    style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', position: 'relative' }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)')}>
                    <div style={{ aspectRatio: '3/4', background: 'linear-gradient(135deg, #f0ece4, #e8e1d5)', overflow: 'hidden', position: 'relative' }}>
                      {prod.image_url
                        ? <img src={prod.image_url} alt={prod.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, opacity: 0.2 }}>👗</div>
                      }
                      {prod.reduction_type && (
                        <div style={{ position: 'absolute', top: 8, left: 8, background: '#E24B4A', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20 }}>
                          {prod.reduction_type === 'pourcentage' ? `-${prod.reduction_valeur}%` : `-${prod.reduction_valeur?.toLocaleString('fr-FR')} F`}
                        </div>
                      )}
                      <div style={{ position: 'absolute', bottom: 8, right: 8, background: stockTotal === 0 ? '#E24B4A' : stockTotal <= 5 ? '#EF9F27' : '#1D9E75', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20 }}>
                        {stockTotal} pcs
                      </div>
                    </div>
                    <div style={{ padding: '10px 12px' }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{prod.nom}</p>
                      <p style={{ margin: '2px 0 4px', fontSize: 11, color: '#aaa' }}>{prod.categorie}</p>
                      {prixR ? (
                        <div>
                          <span style={{ fontSize: 11, color: '#aaa', textDecoration: 'line-through', marginRight: 6 }}>{prod.prix_vente?.toLocaleString('fr-FR')} F</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#E24B4A' }}>{prixR.toLocaleString('fr-FR')} F</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#1D9E75' }}>{prod.prix_vente?.toLocaleString('fr-FR')} F</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ONGLET COMMANDES */}
        {onglet === 'commandes' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
              {[{ key: '', label: 'Toutes' }, ...Object.entries(STATUTS).map(([k, v]) => ({ key: k, label: v.label }))].map(s => (
                <button key={s.key} onClick={() => setFiltreStatut(s.key)}
                  style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${filtreStatut === s.key ? '#378ADD' : '#e5e7eb'}`, background: filtreStatut === s.key ? '#378ADD' : '#fff', color: filtreStatut === s.key ? '#fff' : '#555', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  {s.label}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: 12, fontSize: 13, color: '#888', fontWeight: 600 }}>
              {commandesFiltrees.length} commande(s)
            </div>

            {loading ? <p style={{ color: '#aaa' }}>Chargement...</p> : commandesFiltrees.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#ccc' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
                <p>Aucune commande sur cette période</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {commandesFiltrees.map(cmd => (
                  <div key={cmd.id} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: '#aaa' }}>#{cmd.id.slice(0, 6).toUpperCase()}</span>
                        <span style={{ fontSize: 11, background: (STATUTS[cmd.statut]?.color || '#aaa') + '22', color: STATUTS[cmd.statut]?.color || '#aaa', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                          {STATUTS[cmd.statut]?.label || cmd.statut}
                        </span>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#1D9E75' }}>{cmd.montant_total?.toLocaleString('fr-FR')} F</span>
                    </div>
                    <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{cmd.nom_client || '—'}</p>
                    <p style={{ margin: '0 0 4px', fontSize: 12, color: '#555' }}>🛍️ {cmd.produit_ref} — {cmd.taille} — {cmd.variantes}</p>
                    <p style={{ margin: '0 0 4px', fontSize: 12, color: '#888' }}>📞 {cmd.telephone} · 📍 {cmd.adresse}</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#aaa' }}>
                      {new Date(cmd.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ONGLET STATS */}
        {onglet === 'stats' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
              {Object.entries(STATUTS).map(([key, val]) => {
                const count = commandesFiltrees.filter(c => c.statut === key).length
                const ca = commandesFiltrees.filter(c => c.statut === key).reduce((s, c) => s + (c.montant_total || 0), 0)
                return (
                  <div key={key} style={{ background: '#fff', border: `1px solid ${val.color}22`, borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: 11, color: val.color, textTransform: 'uppercase', marginBottom: 6, fontWeight: 600 }}>{val.label}</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>{count}</div>
                    <div style={{ fontSize: 12, color: '#1D9E75', fontWeight: 600 }}>{ca.toLocaleString('fr-FR')} F</div>
                  </div>
                )
              })}
            </div>

            <div style={{ background: '#fff', borderRadius: 14, padding: '18px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '13px', color: '#888', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>🏆 Top produits commandés</h3>
              {Object.entries(
                commandesFiltrees.reduce((acc: any, c) => {
                  acc[c.produit_ref] = (acc[c.produit_ref] || 0) + 1
                  return acc
                }, {})
              ).sort(([, a]: any, [, b]: any) => b - a).slice(0, 5).map(([ref, count]: any) => (
                <div key={ref} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
                  <span style={{ color: '#555', fontSize: '13px' }}>{ref}</span>
                  <span style={{ color: '#378ADD', fontWeight: 700, fontSize: '13px', background: '#eff6ff', padding: '2px 10px', borderRadius: 20 }}>{count} cmd</span>
                </div>
              ))}
              {commandesFiltrees.length === 0 && <p style={{ color: '#aaa', fontSize: 13, textAlign: 'center' }}>Aucune commande sur cette période</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}