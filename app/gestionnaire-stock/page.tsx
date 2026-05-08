'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const TAILLES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

async function compressImage(file: File): Promise<File> {
  return new Promise(resolve => {
    const canvas = document.createElement('canvas')
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 800
      let w = img.width, h = img.height
      if (w > MAX) { h = (h * MAX) / w; w = MAX }
      if (h > MAX) { w = (w * MAX) / h; h = MAX }
      canvas.width = w; canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      canvas.toBlob(blob => {
        URL.revokeObjectURL(url)
        resolve(blob ? new File([blob], file.name, { type: 'image/jpeg' }) : file)
      }, 'image/jpeg', 0.75)
    }
    img.src = url
  })
}

async function uploadImage(file: File, path: string): Promise<string | null> {
  const compressed = await compressImage(file)
  const cleanPath = path.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-_.\/]/g, '').toLowerCase()
  const { error } = await supabase.storage.from('Produits').upload(cleanPath, compressed, { upsert: true })
  if (error) { console.error(error); return null }
  const { data } = supabase.storage.from('Produits').getPublicUrl(cleanPath)
  return data.publicUrl
}

type CouleurVariante = {
  couleur: string
  image_file?: File
  preview?: string
  tailles: { taille: string; quantite: number; active: boolean }[]
}

function nouvelleCouleur(): CouleurVariante {
  return { couleur: '', tailles: TAILLES.map(t => ({ taille: t, quantite: 5, active: false })) }
}

export default function GestionnaireStockPage() {
  const [stock, setStock] = useState<any[]>([])
  const [produits, setProduits] = useState<any[]>([])
  const [boutiques, setBoutiques] = useState<any[]>([])
  const [mouvements, setMouvements] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet] = useState<'stock' | 'produits' | 'nouveau_produit' | 'approvisionner' | 'historique'>('stock')
  const [user, setUser] = useState<any>(null)
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [approForm, setApproForm] = useState({ boutique_id: '', nom_produit: '', taille: '', couleur: '', quantite: 1, prix_vente: 0 })
  const [prodForm, setProdForm] = useState({
    reference: '', nom: '', categorie: '', activite: 'ck_design',
    prix_vente: 0, prix_achat: 0, description: '',
    image_file: null as File | null, preview: '', disponible: true,
  })
  const [couleurs, setCouleurs] = useState<CouleurVariante[]>([nouvelleCouleur()])
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('ck_user') || '{}')
    setUser(u)
    fetchData()
  }, [])

  const fetchData = async () => {
    const [{ data: stockData }, { data: prodsData }, { data: boutsData }, { data: ventesData }, { data: catsData }] = await Promise.all([
      supabase.from('stock').select('*, produits(nom, reference, image_url)').order('quantite'),
      supabase.from('produits').select('*').order('nom'),
      supabase.from('boutiques').select('*').eq('actif', true),
      supabase.from('ventes_boutique').select('*').order('created_at', { ascending: false }).limit(30),
      supabase.from('categories').select('*').order('activite').order('ordre'),
    ])
    setStock(stockData || [])
    setProduits(prodsData || [])
    setBoutiques(boutsData || [])
    setMouvements(ventesData || [])
    setCategories(catsData || [])
    setLoading(false)
  }

  // Filtrer les catégories selon l'activité sélectionnée
  const categoriesFiltrees = categories.filter(c => c.activite === prodForm.activite)

  const updateCouleur = (index: number, field: string, value: any) =>
    setCouleurs(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c))

  const updateTailleCouleur = (ci: number, ti: number, field: string, value: any) =>
    setCouleurs(prev => prev.map((c, i) => i === ci ? {
      ...c, tailles: c.tailles.map((t, j) => j === ti ? { ...t, [field]: value } : t)
    } : c))

  const publierProduit = async () => {
    if (!prodForm.nom || !prodForm.reference || !prodForm.prix_vente) { alert('Remplissez le nom, la référence et le prix.'); return }
    setSaving(true)
    let imageUrl = ''
    if (prodForm.image_file) imageUrl = await uploadImage(prodForm.image_file, `produits/${Date.now()}-${prodForm.image_file.name}`) || ''
    const { data: prodData, error } = await supabase.from('produits').insert({
      reference: prodForm.reference, nom: prodForm.nom, categorie: prodForm.categorie,
      activite: prodForm.activite, prix_vente: prodForm.prix_vente, prix_achat: prodForm.prix_achat,
      description: prodForm.description, image_url: imageUrl || null, disponible: true,
    }).select().single()
    if (error || !prodData) { alert('Erreur: ' + error?.message); setSaving(false); return }
    for (const couleur of couleurs) {
      if (!couleur.couleur) continue
      let couleurImageUrl = ''
      if (couleur.image_file) couleurImageUrl = await uploadImage(couleur.image_file, `stock/${Date.now()}-${couleur.image_file.name}`) || ''
      for (const t of couleur.tailles.filter(t => t.active)) {
        await supabase.from('stock').insert({ produit_id: prodData.id, taille: t.taille, couleur: couleur.couleur, quantite: t.quantite, image_url: couleurImageUrl || null })
      }
    }
    setSuccess('✅ Produit publié !')
    setTimeout(() => setSuccess(''), 3000)
    setProdForm({ reference: '', nom: '', categorie: '', activite: 'ck_design', prix_vente: 0, prix_achat: 0, description: '', image_file: null, preview: '', disponible: true })
    setCouleurs([nouvelleCouleur()])
    fetchData()
    setOnglet('produits')
    setSaving(false)
  }

  const approvisionnerBoutique = async () => {
    if (!approForm.boutique_id || !approForm.nom_produit) return
    setSaving(true)
    const exist = (await supabase.from('stock_boutique').select('*').eq('boutique_id', approForm.boutique_id).eq('nom_produit', approForm.nom_produit).eq('taille', approForm.taille).eq('couleur', approForm.couleur).single()).data
    if (exist) {
      await supabase.from('stock_boutique').update({ quantite: exist.quantite + approForm.quantite }).eq('id', exist.id)
    } else {
      await supabase.from('stock_boutique').insert({ ...approForm, produit_ref: approForm.nom_produit })
    }
    setSuccess('✅ Boutique approvisionnée !')
    setTimeout(() => setSuccess(''), 2000)
    setApproForm({ boutique_id: '', nom_produit: '', taille: '', couleur: '', quantite: 1, prix_vente: 0 })
    fetchData()
    setSaving(false)
  }

  const toggleDisponible = async (id: string, disponible: boolean) => {
    await supabase.from('produits').update({ disponible: !disponible }).eq('id', id)
    fetchData()
  }

  const stockCritique = stock.filter(s => s.quantite <= 3)
  const totalArticles = stock.reduce((s, i) => s + i.quantite, 0)

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: "'Inter', sans-serif", color: '#1a1a1a' }}>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>
        <div>
          <h1 style={{ color: '#38bdf8', margin: 0, fontSize: '16px', fontWeight: 700 }}>📦 Gestionnaire Stock</h1>
          <p style={{ color: '#94a3b8', margin: '2px 0 0', fontSize: '11px' }}>{user?.nom} — {user?.activite}</p>
        </div>
        <button onClick={() => { localStorage.removeItem('ck_user'); window.location.href = '/login' }}
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#94a3b8', padding: '6px 12px', fontSize: '11px', cursor: 'pointer' }}>
          Déconnexion
        </button>
      </div>

      {/* KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', padding: '16px 16px 0' }}>
        {[
          { label: 'Total articles', value: totalArticles, color: '#0891b2', bg: '#e0f7fa' },
          { label: 'Références', value: produits.length, color: '#6366f1', bg: '#ede9fe' },
          { label: 'Stock critique', value: stockCritique.length, color: stockCritique.length > 0 ? '#E24B4A' : '#1D9E75', bg: stockCritique.length > 0 ? '#fff0f0' : '#f0fdf4' },
          { label: 'Boutiques', value: boutiques.length, color: '#1D9E75', bg: '#f0fdf4' },
        ].map((k, i) => (
          <div key={i} style={{ background: k.bg, border: `1px solid ${k.color}22`, borderRadius: '12px', padding: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600, letterSpacing: 0.5 }}>{k.label}</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', background: '#fff', margin: '16px 16px 0', borderRadius: '12px', padding: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflowX: 'auto', gap: '2px' }}>
        {[
          { key: 'stock', label: '📦 Stock' },
          { key: 'produits', label: '🏷️ Produits' },
          { key: 'nouveau_produit', label: '➕ Publier' },
          { key: 'approvisionner', label: '🏪 Appro.' },
          { key: 'historique', label: '📋 Historique' },
        ].map(o => (
          <button key={o.key} onClick={() => setOnglet(o.key as any)}
            style={{
              flexShrink: 0, padding: '9px 14px', borderRadius: '9px', border: 'none', cursor: 'pointer',
              fontSize: '12px', fontWeight: 600, transition: 'all 0.15s',
              background: onglet === o.key ? '#0891b2' : 'transparent',
              color: onglet === o.key ? '#fff' : '#888',
            }}>
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

        {/* ONGLET STOCK */}
        {onglet === 'stock' && (
          <div>
            {stockCritique.length > 0 && (
              <div style={{ background: '#fff5f5', border: '1px solid #E24B4A', borderRadius: '10px', padding: '12px 16px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>⚠️</span>
                <p style={{ margin: 0, color: '#E24B4A', fontSize: '13px', fontWeight: 600 }}>
                  {stockCritique.length} article(s) en stock critique (≤ 3 pièces) !
                </p>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {stock.map(item => (
                <div key={item.id} style={{
                  background: '#fff', borderRadius: '12px', overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                  border: item.quantite <= 3 ? '1.5px solid #E24B4A44' : '1.5px solid transparent',
                }}>
                  {(item.produits as any)?.image_url && (
                    <img src={(item.produits as any).image_url} alt="" style={{ width: '100%', height: '130px', objectFit: 'cover' }} />
                  )}
                  <div style={{ padding: '12px' }}>
                    <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '13px', color: '#1a1a1a' }}>{(item.produits as any)?.nom}</p>
                    <p style={{ margin: '0 0 8px', color: '#888', fontSize: '11px' }}>Taille {item.taille} — {item.couleur}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#aaa', fontWeight: 500 }}>Stock</span>
                      <span style={{
                        fontSize: '15px', fontWeight: 700, padding: '2px 10px', borderRadius: '20px',
                        background: item.quantite <= 3 ? '#fff0f0' : item.quantite <= 10 ? '#fff8e6' : '#f0fdf4',
                        color: item.quantite <= 3 ? '#E24B4A' : item.quantite <= 10 ? '#EF9F27' : '#1D9E75'
                      }}>
                        {item.quantite} pcs
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ONGLET PRODUITS */}
        {onglet === 'produits' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
            {produits.map(prod => (
              <div key={prod.id} style={{ background: '#fff', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
                <div style={{ height: '170px', background: '#f5f5f5', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {prod.image_url
                    ? <img src={prod.image_url} alt={prod.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ fontSize: '40px', opacity: 0.2 }}>👗</div>
                  }
                </div>
                <div style={{ padding: '14px' }}>
                  <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '14px', color: '#1a1a1a' }}>{prod.nom}</p>
                  <p style={{ margin: '0 0 4px', color: '#aaa', fontSize: '11px' }}>Réf: {prod.reference}</p>
                  {prod.categorie && <p style={{ margin: '0 0 10px', color: '#0891b2', fontSize: '11px', fontWeight: 600 }}>🏷️ {prod.categorie}</p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#0891b2', fontWeight: 700, fontSize: '15px' }}>{prod.prix_vente?.toLocaleString('fr-FR')} F</span>
                    <button onClick={() => toggleDisponible(prod.id, prod.disponible)}
                      style={{
                        fontSize: '11px', fontWeight: 600, padding: '4px 12px', borderRadius: '20px', cursor: 'pointer', border: 'none',
                        background: prod.disponible ? '#f0fdf4' : '#fff5f5',
                        color: prod.disponible ? '#1D9E75' : '#E24B4A',
                      }}>
                      {prod.disponible ? '✅ Publié' : '❌ Masqué'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ONGLET NOUVEAU PRODUIT */}
        {onglet === 'nouveau_produit' && (
          <div style={{ maxWidth: '600px' }}>
            <div style={{ background: '#fff', borderRadius: '14px', padding: '22px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: '16px', color: '#0891b2', fontWeight: 700 }}>➕ Publier un nouveau produit</h3>
              <p style={{ margin: '0 0 20px', fontSize: '12px', color: '#aaa' }}>Ce produit sera visible dans le catalogue client.</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                {[
                  { key: 'reference', label: 'Référence *', placeholder: 'Ex: CK-001' },
                  { key: 'nom', label: 'Nom *', placeholder: 'Ex: Robe Wax' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ color: '#555', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>{f.label}</label>
                    <input value={(prodForm as any)[f.key]} onChange={e => setProdForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }} />
                  </div>
                ))}
                <div>
                  <label style={{ color: '#555', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Prix de vente (F) *</label>
                  <input type="number" value={prodForm.prix_vente} onChange={e => setProdForm(p => ({ ...p, prix_vente: Number(e.target.value) }))}
                    placeholder="Ex: 15000"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ color: '#555', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Prix d'achat (F)</label>
                  <input type="number" value={prodForm.prix_achat} onChange={e => setProdForm(p => ({ ...p, prix_achat: Number(e.target.value) }))}
                    placeholder="Ex: 8000"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }} />
                </div>

                {/* ACTIVITÉ — doit être avant catégorie pour filtrer */}
                <div>
                  <label style={{ color: '#555', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Activité</label>
                  <select value={prodForm.activite} onChange={e => setProdForm(p => ({ ...p, activite: e.target.value, categorie: '' }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', outline: 'none' }}>
                    <option value="ck_design">CK Design</option>
                    <option value="succes_design">Succès Design</option>
                  </select>
                </div>

                {/* CATÉGORIE — select dynamique filtré par activité */}
                <div>
                  <label style={{ color: '#555', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Catégorie *</label>
                  <select value={prodForm.categorie} onChange={e => setProdForm(p => ({ ...p, categorie: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', outline: 'none' }}>
                    <option value="">Choisir une catégorie...</option>
                    {categoriesFiltrees.map(c => (
                      <option key={c.id} value={c.nom}>{c.nom}</option>
                    ))}
                  </select>
                  {categoriesFiltrees.length === 0 && (
                    <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#E24B4A' }}>
                      ⚠️ Aucune catégorie pour cette activité — <a href="/admin/utilisateurs" style={{ color: '#0891b2' }}>Ajouter</a>
                    </p>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ color: '#555', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Description</label>
                <textarea value={prodForm.description} onChange={e => setProdForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Description..." rows={2}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical', outline: 'none' }} />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ color: '#555', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>📷 Photo principale</label>
                <input type="file" accept="image/*" ref={fileRef} onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) setProdForm(p => ({ ...p, image_file: file, preview: URL.createObjectURL(file) }))
                }} style={{ display: 'none' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button onClick={() => fileRef.current?.click()}
                    style={{ padding: '10px 16px', borderRadius: '9px', border: '1.5px dashed #0891b2', background: '#f0f9ff', color: '#0891b2', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    📷 Choisir une photo
                  </button>
                  {prodForm.preview && <img src={prodForm.preview} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '9px', border: '1.5px solid #e5e5e5' }} />}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ color: '#555', fontSize: '12px', fontWeight: 600 }}>COULEURS & TAILLES</label>
                  <button onClick={() => setCouleurs(prev => [...prev, nouvelleCouleur()])}
                    style={{ background: '#f0f9ff', color: '#0891b2', border: '1px solid #0891b244', borderRadius: '8px', padding: '5px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                    + Couleur
                  </button>
                </div>
                {couleurs.map((c, ci) => (
                  <div key={ci} style={{ background: '#f8f9fa', borderRadius: '12px', padding: '14px', marginBottom: '10px', border: '1px solid #eee' }}>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                      <input value={c.couleur} onChange={e => updateCouleur(ci, 'couleur', e.target.value)}
                        placeholder="Nom couleur"
                        style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', background: '#fff', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', outline: 'none' }} />
                      <button onClick={() => {
                        const input = document.createElement('input')
                        input.type = 'file'; input.accept = 'image/*'
                        input.onchange = (e: any) => {
                          const file = e.target.files?.[0]
                          if (file) { updateCouleur(ci, 'image_file', file); updateCouleur(ci, 'preview', URL.createObjectURL(file)) }
                        }
                        input.click()
                      }} style={{ padding: '8px 12px', borderRadius: '8px', border: '1.5px dashed #0891b2', background: '#f0f9ff', color: '#0891b2', fontSize: '12px', cursor: 'pointer' }}>📷</button>
                      {c.preview && <img src={c.preview} style={{ width: '38px', height: '38px', objectFit: 'cover', borderRadius: '8px', border: '1.5px solid #e5e5e5' }} />}
                      {couleurs.length > 1 && (
                        <button onClick={() => setCouleurs(prev => prev.filter((_, i) => i !== ci))}
                          style={{ background: '#fff5f5', color: '#E24B4A', border: 'none', borderRadius: '8px', padding: '7px 11px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>✕</button>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {c.tailles.map((t, ti) => (
                        <div key={t.taille} onClick={() => updateTailleCouleur(ci, ti, 'active', !t.active)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
                            background: t.active ? '#0891b2' : '#fff',
                            border: `1.5px solid ${t.active ? '#0891b2' : '#e5e5e5'}`,
                            borderRadius: '8px', padding: '5px 9px',
                          }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: t.active ? 'white' : '#888' }}>{t.taille}</span>
                          {t.active && (
                            <input type="number" value={t.quantite} min={1}
                              onClick={e => e.stopPropagation()}
                              onChange={e => updateTailleCouleur(ci, ti, 'quantite', Number(e.target.value) || 1)}
                              style={{ width: '40px', padding: '1px 4px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.4)', background: 'transparent', color: 'white', fontSize: '11px', textAlign: 'center', outline: 'none' }} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={publierProduit} disabled={saving}
                style={{ width: '100%', padding: '14px', borderRadius: '10px', background: saving ? '#aaa' : '#0891b2', border: 'none', color: 'white', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: '15px', marginTop: '16px', boxShadow: saving ? 'none' : '0 4px 12px rgba(8,145,178,0.3)' }}>
                {saving ? '⏳ Publication...' : '🚀 Publier le produit'}
              </button>
            </div>
          </div>
        )}

        {/* ONGLET APPROVISIONNER */}
        {onglet === 'approvisionner' && (
          <div style={{ background: '#fff', borderRadius: '14px', padding: '22px', maxWidth: '500px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
            <h3 style={{ margin: '0 0 18px', fontSize: '16px', color: '#0891b2', fontWeight: 700 }}>🏪 Approvisionner une boutique</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ color: '#555', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Boutique *</label>
                <select value={approForm.boutique_id} onChange={e => setApproForm(p => ({ ...p, boutique_id: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', outline: 'none' }}>
                  <option value="">Choisir une boutique...</option>
                  {boutiques.map(b => <option key={b.id} value={b.id}>{b.nom} — {b.lieu}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: '#555', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Produit *</label>
                <select value={approForm.nom_produit} onChange={e => {
                  const prod = produits.find(p => p.nom === e.target.value)
                  setApproForm(p => ({ ...p, nom_produit: e.target.value, prix_vente: prod?.prix_vente || 0 }))
                }} style={{ width: '100%', padding: '10px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', outline: 'none' }}>
                  <option value="">Choisir un produit...</option>
                  {produits.map(p => <option key={p.id} value={p.nom}>{p.nom}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: '#555', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Taille</label>
                  <select value={approForm.taille} onChange={e => setApproForm(p => ({ ...p, taille: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', outline: 'none' }}>
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ color: '#555', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Couleur</label>
                  <input value={approForm.couleur} onChange={e => setApproForm(p => ({ ...p, couleur: e.target.value }))}
                    placeholder="Ex: Noir"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: '#555', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Quantité</label>
                  <input type="number" min={1} value={approForm.quantite} onChange={e => setApproForm(p => ({ ...p, quantite: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ color: '#555', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Prix vente boutique</label>
                  <input type="number" value={approForm.prix_vente} onChange={e => setApproForm(p => ({ ...p, prix_vente: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }} />
                </div>
              </div>
              <button onClick={approvisionnerBoutique} disabled={saving}
                style={{ width: '100%', padding: '13px', borderRadius: '10px', background: '#0891b2', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 12px rgba(8,145,178,0.3)' }}>
                {saving ? '...' : '✅ Approvisionner'}
              </button>
            </div>
          </div>
        )}

        {/* ONGLET HISTORIQUE */}
        {onglet === 'historique' && (
          <div>
            <h3 style={{ margin: '0 0 14px', fontSize: '12px', color: '#aaa', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>📋 Dernières ventes boutiques</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {mouvements.map(v => (
                <div key={v.id} style={{ background: '#fff', borderRadius: '12px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: '#1a1a1a' }}>{v.nom_produit}</p>
                    <p style={{ margin: '2px 0 0', color: '#888', fontSize: '11px' }}>{v.taille} — {v.couleur} × {v.quantite}</p>
                    <p style={{ margin: '2px 0 0', color: '#aaa', fontSize: '11px' }}>
                      {new Date(v.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span style={{ color: '#1D9E75', fontWeight: 700, fontSize: '15px' }}>{v.total?.toLocaleString('fr-FR')} F</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}