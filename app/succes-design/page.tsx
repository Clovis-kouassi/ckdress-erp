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
  couleur: string; image_file?: File; preview?: string
  tailles: { taille: string; quantite: number; active: boolean }[]
}

function nouvelleCouleur(): CouleurVariante {
  return { couleur: '', tailles: TAILLES.map(t => ({ taille: t, quantite: 5, active: false })) }
}

export default function SuccesDesignPage() {
  const [produits, setProduits] = useState<any[]>([])
  const [fournisseurs, setFournisseurs] = useState<any[]>([])
  const [achats, setAchats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet] = useState<'stock' | 'publier' | 'fournisseurs' | 'achats'>('stock')
  const [user, setUser] = useState<any>(null)
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [prodForm, setProdForm] = useState({ reference: '', nom: '', categorie: '', prix_vente: 0, prix_achat: 0, description: '', image_file: null as File | null, preview: '', fournisseur_id: '' })
  const [couleurs, setCouleurs] = useState<CouleurVariante[]>([nouvelleCouleur()])
  const fileRef = useRef<HTMLInputElement>(null)
  const [fournisseurForm, setFournisseurForm] = useState({ nom: '', pays: 'Côte dIvoire', telephone: '', email: '', type: 'local' })
  const [achatForm, setAchatForm] = useState({ fournisseur_id: '', nom_produit: '', produit_ref: '', quantite: 1, prix_achat_unitaire: 0, date_achat: new Date().toISOString().split('T')[0], notes: '' })

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('ck_user') || '{}')
    setUser(u)
    fetchData()
  }, [])

  const fetchData = async () => {
    const [{ data: prodsData }, { data: foursData }, { data: achatsData }] = await Promise.all([
      supabase.from('produits').select('*').eq('activite', 'succes_design').order('created_at', { ascending: false }),
      supabase.from('fournisseurs').select('*').eq('actif', true).order('nom'),
      supabase.from('achats_fournisseur').select('*, fournisseurs(nom)').order('created_at', { ascending: false }).limit(20),
    ])
    setProduits(prodsData || [])
    setFournisseurs(foursData || [])
    setAchats(achatsData || [])
    setLoading(false)
  }

  const updateCouleur = (index: number, field: string, value: any) =>
    setCouleurs(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c))

  const updateTailleCouleur = (ci: number, ti: number, field: string, value: any) =>
    setCouleurs(prev => prev.map((c, i) => i === ci ? { ...c, tailles: c.tailles.map((t, j) => j === ti ? { ...t, [field]: value } : t) } : c))

  const publierProduit = async () => {
    if (!prodForm.nom || !prodForm.reference || !prodForm.prix_vente) { alert('Remplissez le nom, la référence et le prix.'); return }
    setSaving(true)
    let imageUrl = ''
    if (prodForm.image_file) imageUrl = await uploadImage(prodForm.image_file, `succes-design/${Date.now()}-${prodForm.image_file.name}`) || ''
    const { data: prodData, error } = await supabase.from('produits').insert({
      reference: prodForm.reference, nom: prodForm.nom, categorie: prodForm.categorie,
      activite: 'succes_design', prix_vente: prodForm.prix_vente, prix_achat: prodForm.prix_achat,
      description: prodForm.description, image_url: imageUrl || null, disponible: true,
    }).select().single()
    if (error || !prodData) { alert('Erreur: ' + error?.message); setSaving(false); return }
    for (const couleur of couleurs) {
      if (!couleur.couleur) continue
      let couleurImageUrl = ''
      if (couleur.image_file) couleurImageUrl = await uploadImage(couleur.image_file, `succes-design/stock/${Date.now()}-${couleur.image_file.name}`) || ''
      for (const t of couleur.tailles.filter(t => t.active)) {
        await supabase.from('stock').insert({ produit_id: prodData.id, taille: t.taille, couleur: couleur.couleur, quantite: t.quantite, image_url: couleurImageUrl || null })
      }
    }
    if (prodForm.fournisseur_id && prodForm.prix_achat) {
      const totalQte = couleurs.reduce((s, c) => s + c.tailles.filter(t => t.active).reduce((ss, t) => ss + t.quantite, 0), 0)
      await supabase.from('achats_fournisseur').insert({ fournisseur_id: prodForm.fournisseur_id, produit_ref: prodForm.reference, nom_produit: prodForm.nom, quantite: totalQte, prix_achat_unitaire: prodForm.prix_achat, cout_total: totalQte * prodForm.prix_achat, activite: 'succes_design' })
    }
    setSuccess('✅ Produit publié !')
    setTimeout(() => setSuccess(''), 3000)
    setProdForm({ reference: '', nom: '', categorie: '', prix_vente: 0, prix_achat: 0, description: '', image_file: null, preview: '', fournisseur_id: '' })
    setCouleurs([nouvelleCouleur()])
    fetchData(); setOnglet('stock'); setSaving(false)
  }

  const ajouterFournisseur = async () => {
    if (!fournisseurForm.nom) return
    setSaving(true)
    await supabase.from('fournisseurs').insert(fournisseurForm)
    setFournisseurForm({ nom: '', pays: 'Côte dIvoire', telephone: '', email: '', type: 'local' })
    setSuccess('✅ Fournisseur ajouté !')
    setTimeout(() => setSuccess(''), 2000)
    fetchData(); setSaving(false)
  }

  const enregistrerAchat = async () => {
    if (!achatForm.fournisseur_id || !achatForm.nom_produit) return
    setSaving(true)
    await supabase.from('achats_fournisseur').insert({ ...achatForm, cout_total: achatForm.quantite * achatForm.prix_achat_unitaire, activite: 'succes_design' })
    setAchatForm({ fournisseur_id: '', nom_produit: '', produit_ref: '', quantite: 1, prix_achat_unitaire: 0, date_achat: new Date().toISOString().split('T')[0], notes: '' })
    setSuccess('✅ Achat enregistré !')
    setTimeout(() => setSuccess(''), 2000)
    fetchData(); setSaving(false)
  }

  const toggleDisponible = async (id: string, disponible: boolean) => {
    await supabase.from('produits').update({ disponible: !disponible }).eq('id', id)
    fetchData()
  }

  const totalAchats = achats.reduce((s, a) => s + (a.cout_total || 0), 0)

  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f5', fontFamily: 'sans-serif', color: '#1a1a1a' }}>

      <div style={{ background: '#fff', borderBottom: '1px solid #e5e5e5', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div>
          <h1 style={{ color: '#d4a853', margin: 0, fontSize: '16px', fontWeight: 700 }}>✨ Succès Design</h1>
          <p style={{ color: '#aaa', margin: '2px 0 0', fontSize: '11px' }}>{user?.nom} — Tenues importées</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <a href="/succes-design/catalogue" target="_blank"
            style={{ background: '#fffbeb', border: '1px solid #d4a853', borderRadius: '6px', color: '#d4a853', padding: '5px 12px', fontSize: '11px', cursor: 'pointer', textDecoration: 'none' }}>
            🌐 Voir catalogue
          </a>
          <button onClick={() => { localStorage.removeItem('ck_user'); window.location.href = '/login' }}
            style={{ background: 'none', border: '1px solid #e5e5e5', borderRadius: '6px', color: '#888', padding: '5px 10px', fontSize: '11px', cursor: 'pointer' }}>
            Déconnexion
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', padding: '16px 16px 0' }}>
        {[
          { label: 'Produits publiés', value: produits.filter(p => p.disponible).length, color: '#d4a853' },
          { label: 'Total produits', value: produits.length, color: '#1a1a1a' },
          { label: 'Fournisseurs', value: fournisseurs.length, color: '#1D9E75' },
          { label: 'Total achats', value: totalAchats.toLocaleString('fr-FR') + ' F', color: '#E24B4A' },
        ].map((k, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '10px', padding: '12px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '10px', color: '#aaa', textTransform: 'uppercase', marginBottom: '4px' }}>{k.label}</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #e5e5e5', background: '#fff', margin: '16px 0 0', overflowX: 'auto' }}>
        {[
          { key: 'stock', label: '🏷️ Stock' },
          { key: 'publier', label: '➕ Publier produit' },
          { key: 'fournisseurs', label: '🏭 Fournisseurs' },
          { key: 'achats', label: '🛒 Achats' },
        ].map(o => (
          <button key={o.key} onClick={() => setOnglet(o.key as any)}
            style={{ flexShrink: 0, padding: '12px 16px', background: 'transparent', border: 'none', color: onglet === o.key ? '#d4a853' : '#888', fontSize: '13px', fontWeight: 600, cursor: 'pointer', borderBottom: onglet === o.key ? '2px solid #d4a853' : '2px solid transparent' }}>
            {o.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px' }}>
        {success && (
          <div style={{ background: '#f0fdf4', border: '1px solid #1D9E75', borderRadius: '8px', padding: '10px 16px', color: '#1D9E75', fontSize: '13px', marginBottom: '12px' }}>
            {success}
          </div>
        )}

        {onglet === 'stock' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
            {produits.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: '#aaa' }}>
                <div style={{ fontSize: '3rem' }}>✨</div>
                <p>Aucun produit — publiez votre premier article !</p>
              </div>
            ) : produits.map(prod => (
              <div key={prod.id} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ height: '180px', background: '#f5f5f5', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {prod.image_url ? <img src={prod.image_url} alt={prod.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ fontSize: '40px', opacity: 0.2 }}>👗</div>}
                </div>
                <div style={{ padding: '12px' }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '14px', color: '#1a1a1a' }}>{prod.nom}</p>
                  <p style={{ margin: '2px 0 4px', color: '#888', fontSize: '12px' }}>Réf: {prod.reference}</p>
                  {prod.description && <p style={{ margin: '0 0 6px', color: '#aaa', fontSize: '11px' }}>{prod.description}</p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#d4a853', fontWeight: 700, fontSize: '14px' }}>{prod.prix_vente?.toLocaleString('fr-FR')} F</span>
                    <button onClick={() => toggleDisponible(prod.id, prod.disponible)}
                      style={{ fontSize: '11px', background: prod.disponible ? '#f0fdf4' : '#fff5f5', color: prod.disponible ? '#1D9E75' : '#E24B4A', border: 'none', padding: '3px 10px', borderRadius: '10px', cursor: 'pointer' }}>
                      {prod.disponible ? '✅ Publié' : '❌ Masqué'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {onglet === 'publier' && (
          <div style={{ maxWidth: '600px' }}>
            <div style={{ background: '#fff', border: '1px solid #d4a85344', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: '#d4a853' }}>➕ Publier un nouveau produit</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                {[{ key: 'reference', label: 'Référence *', placeholder: 'Ex: SD-001' }, { key: 'nom', label: 'Nom *', placeholder: 'Ex: Robe Ankara' }].map(f => (
                  <div key={f.key}>
                    <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '6px' }}>{f.label}</label>
                    <input value={(prodForm as any)[f.key]} onChange={e => setProdForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#f9f9f9', border: '1px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', boxSizing: 'border-box' }} />
                  </div>
                ))}
                <div>
                  <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Prix de vente (F) *</label>
                  <input type="number" value={prodForm.prix_vente} onChange={e => setProdForm(p => ({ ...p, prix_vente: Number(e.target.value) }))} placeholder="Ex: 25000"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#f9f9f9', border: '1px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Prix d'achat (F)</label>
                  <input type="number" value={prodForm.prix_achat} onChange={e => setProdForm(p => ({ ...p, prix_achat: Number(e.target.value) }))} placeholder="Ex: 12000"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#f9f9f9', border: '1px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Catégorie</label>
                  <input value={prodForm.categorie} onChange={e => setProdForm(p => ({ ...p, categorie: e.target.value }))} placeholder="Ex: robe, ensemble"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#f9f9f9', border: '1px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Fournisseur</label>
                  <select value={prodForm.fournisseur_id} onChange={e => setProdForm(p => ({ ...p, fournisseur_id: e.target.value }))}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#f9f9f9', border: '1px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px' }}>
                    <option value="">Choisir...</option>
                    {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom} ({f.pays})</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Description</label>
                <textarea value={prodForm.description} onChange={e => setProdForm(p => ({ ...p, description: e.target.value }))} placeholder="Description..." rows={2}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#f9f9f9', border: '1px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '6px' }}>📷 Photo principale</label>
                <input type="file" accept="image/*" ref={fileRef} onChange={e => { const file = e.target.files?.[0]; if (file) setProdForm(p => ({ ...p, image_file: file, preview: URL.createObjectURL(file) })) }} style={{ display: 'none' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button onClick={() => fileRef.current?.click()}
                    style={{ padding: '10px 16px', borderRadius: '8px', border: '1.5px dashed #d4a853', background: '#fffbeb', color: '#d4a853', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    📷 Choisir une photo
                  </button>
                  {prodForm.preview && <img src={prodForm.preview} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e5e5e5' }} />}
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ color: '#888', fontSize: '12px' }}>COULEURS & TAILLES</label>
                  <button onClick={() => setCouleurs(prev => [...prev, nouvelleCouleur()])}
                    style={{ background: '#fffbeb', color: '#d4a853', border: '1px solid #d4a85344', borderRadius: '6px', padding: '4px 12px', fontSize: '12px', cursor: 'pointer' }}>+ Couleur</button>
                </div>
                {couleurs.map((c, ci) => (
                  <div key={ci} style={{ background: '#f9f9f9', borderRadius: '10px', padding: '14px', marginBottom: '10px', border: '1px solid #f0f0f0' }}>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                      <input value={c.couleur} onChange={e => updateCouleur(ci, 'couleur', e.target.value)} placeholder="Nom couleur"
                        style={{ flex: 1, padding: '8px', borderRadius: '6px', background: '#fff', border: '1px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px' }} />
                      <button onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = (e: any) => { const file = e.target.files?.[0]; if (file) { updateCouleur(ci, 'image_file', file); updateCouleur(ci, 'preview', URL.createObjectURL(file)) } }; input.click() }}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px dashed #d4a853', background: '#fffbeb', color: '#d4a853', fontSize: '12px', cursor: 'pointer' }}>📷</button>
                      {c.preview && <img src={c.preview} style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '6px' }} />}
                      {couleurs.length > 1 && <button onClick={() => setCouleurs(prev => prev.filter((_, i) => i !== ci))} style={{ background: '#fff5f5', color: '#E24B4A', border: 'none', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', cursor: 'pointer' }}>✕</button>}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {c.tailles.map((t, ti) => (
                        <div key={t.taille} onClick={() => updateTailleCouleur(ci, ti, 'active', !t.active)}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', background: t.active ? '#d4a853' : '#fff', border: `1px solid ${t.active ? '#d4a853' : '#e5e5e5'}`, borderRadius: '6px', padding: '5px 8px', cursor: 'pointer' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: t.active ? '#111' : '#888' }}>{t.taille}</span>
                          {t.active && <input type="number" value={t.quantite} min={1} onClick={e => e.stopPropagation()} onChange={e => updateTailleCouleur(ci, ti, 'quantite', Number(e.target.value) || 1)}
                            style={{ width: '40px', padding: '1px 4px', borderRadius: '4px', border: '1px solid #111', background: 'transparent', color: '#111', fontSize: '11px', textAlign: 'center', outline: 'none' }} />}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={publierProduit} disabled={saving}
                style={{ width: '100%', padding: '14px', borderRadius: '8px', background: saving ? '#aaa' : '#d4a853', border: 'none', color: '#111', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: '15px', marginTop: '16px' }}>
                {saving ? '⏳ Publication...' : '🚀 Publier le produit'}
              </button>
            </div>
          </div>
        )}

        {onglet === 'fournisseurs' && (
          <div>
            <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '20px', maxWidth: '500px', marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: '#d4a853' }}>🏭 Ajouter un fournisseur</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <input value={fournisseurForm.nom} onChange={e => setFournisseurForm(p => ({ ...p, nom: e.target.value }))} placeholder="Nom fournisseur *"
                  style={{ padding: '10px', borderRadius: '8px', background: '#f9f9f9', border: '1px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px' }} />
                <input value={fournisseurForm.pays} onChange={e => setFournisseurForm(p => ({ ...p, pays: e.target.value }))} placeholder="Pays"
                  style={{ padding: '10px', borderRadius: '8px', background: '#f9f9f9', border: '1px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px' }} />
                <input value={fournisseurForm.telephone} onChange={e => setFournisseurForm(p => ({ ...p, telephone: e.target.value }))} placeholder="Téléphone"
                  style={{ padding: '10px', borderRadius: '8px', background: '#f9f9f9', border: '1px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px' }} />
                <select value={fournisseurForm.type} onChange={e => setFournisseurForm(p => ({ ...p, type: e.target.value }))}
                  style={{ padding: '10px', borderRadius: '8px', background: '#f9f9f9', border: '1px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px' }}>
                  <option value="local">Local</option>
                  <option value="import">Import</option>
                  <option value="chine">Chine</option>
                  <option value="dubai">Dubai</option>
                  <option value="europe">Europe</option>
                </select>
              </div>
              <button onClick={ajouterFournisseur} disabled={saving}
                style={{ padding: '10px 24px', background: '#d4a853', border: 'none', borderRadius: '8px', color: '#111', cursor: 'pointer', fontWeight: 600 }}>
                {saving ? '...' : '+ Ajouter'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
              {fournisseurs.map(f => (
                <div key={f.id} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '10px', padding: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '14px', color: '#1a1a1a' }}>{f.nom}</p>
                  <p style={{ margin: '2px 0', color: '#888', fontSize: '12px' }}>📍 {f.pays}</p>
                  {f.telephone && <p style={{ margin: '2px 0', color: '#aaa', fontSize: '12px' }}>📞 {f.telephone}</p>}
                  <span style={{ fontSize: '11px', background: '#eff6ff', color: '#378ADD', padding: '2px 8px', borderRadius: '10px' }}>{f.type}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {onglet === 'achats' && (
          <div>
            <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '20px', maxWidth: '500px', marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: '#d4a853' }}>🛒 Enregistrer un achat</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <select value={achatForm.fournisseur_id} onChange={e => setAchatForm(p => ({ ...p, fournisseur_id: e.target.value }))}
                  style={{ padding: '10px', borderRadius: '8px', background: '#f9f9f9', border: '1px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px' }}>
                  <option value="">Fournisseur *</option>
                  {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                </select>
                <input value={achatForm.nom_produit} onChange={e => setAchatForm(p => ({ ...p, nom_produit: e.target.value }))} placeholder="Nom produit *"
                  style={{ padding: '10px', borderRadius: '8px', background: '#f9f9f9', border: '1px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px' }} />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input type="number" value={achatForm.quantite} onChange={e => setAchatForm(p => ({ ...p, quantite: Number(e.target.value) }))} placeholder="Quantité"
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#f9f9f9', border: '1px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px' }} />
                  <input type="number" value={achatForm.prix_achat_unitaire} onChange={e => setAchatForm(p => ({ ...p, prix_achat_unitaire: Number(e.target.value) }))} placeholder="Prix unitaire (F)"
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#f9f9f9', border: '1px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px' }} />
                </div>
                <input type="date" value={achatForm.date_achat} onChange={e => setAchatForm(p => ({ ...p, date_achat: e.target.value }))}
                  style={{ padding: '10px', borderRadius: '8px', background: '#f9f9f9', border: '1px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px' }} />
                <div style={{ background: '#fffbeb', borderRadius: '8px', padding: '10px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>Total</span>
                  <span style={{ color: '#d4a853', fontWeight: 700 }}>{(achatForm.quantite * achatForm.prix_achat_unitaire).toLocaleString('fr-FR')} F</span>
                </div>
                <button onClick={enregistrerAchat} disabled={saving}
                  style={{ padding: '12px', background: '#d4a853', border: 'none', borderRadius: '8px', color: '#111', cursor: 'pointer', fontWeight: 600 }}>
                  {saving ? '...' : '✅ Enregistrer'}
                </button>
              </div>
            </div>
            <h3 style={{ color: '#aaa', fontSize: '13px', textTransform: 'uppercase', marginBottom: '12px' }}>Derniers achats</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {achats.map(a => (
                <div key={a.id} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '13px', color: '#1a1a1a' }}>{a.nom_produit}</p>
                    <p style={{ margin: '2px 0 0', color: '#888', fontSize: '11px' }}>🏭 {(a.fournisseurs as any)?.nom} · {a.quantite} pcs · {a.date_achat}</p>
                  </div>
                  <span style={{ color: '#E24B4A', fontWeight: 700, fontSize: '14px' }}>{a.cout_total?.toLocaleString('fr-FR')} F</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}