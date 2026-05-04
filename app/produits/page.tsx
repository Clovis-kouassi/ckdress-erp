'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'

type Produit = {
  id: string
  reference: string
  nom: string
  categorie: string
  activite: string
  prix_vente: number
  prix_achat: number
  description?: string
  image_url?: string
}

type StockItem = {
  id: string
  produit_id: string
  taille: string
  couleur: string
  quantite: number
  image_url?: string
}

type CouleurVariante = {
  couleur: string
  image_file?: File
  preview?: string
  tailles: { taille: string; quantite: number; active: boolean }[]
}

const TAILLES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box' as const,
  padding: '10px 12px',
  borderRadius: 8,
  border: '1.5px solid #e5e7eb',
  fontSize: 14,
  outline: 'none',
  color: '#1a1a1a',
  background: '#fff',
}

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
  const { error } = await supabase.storage.from('Produits').upload(path, compressed, { upsert: true })
  if (error) { console.error(error); return null }
  const { data } = supabase.storage.from('Produits').getPublicUrl(path)
  return data.publicUrl
}

function nouvelleCouleur(): CouleurVariante {
  return {
    couleur: '',
    tailles: TAILLES.map(t => ({ taille: t, quantite: 5, active: false }))
  }
}

export default function ProduitsPage() {
  const router = useRouter()
  const [produits, setProduits] = useState<Produit[]>([])
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet] = useState<'liste' | 'nouveau'>('liste')
  const [produitSelectionne, setProduitSelectionne] = useState<Produit | null>(null)
  const [stock, setStock] = useState<StockItem[]>([])
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    reference: '', nom: '', categorie: '', activite: 'importé',
    prix_vente: '', prix_achat: '', description: '',
    image_file: null as File | null, preview: ''
  })

  const [couleurs, setCouleurs] = useState<CouleurVariante[]>([nouvelleCouleur()])

  const [stockCouleurForm, setStockCouleurForm] = useState<CouleurVariante>(nouvelleCouleur())

  useEffect(() => { fetchProduits() }, [])

  async function fetchProduits() {
    setLoading(true)
    const { data } = await supabase.from('produits').select('*').order('nom')
    if (data) setProduits(data)
    setLoading(false)
  }

  async function fetchStock(produitId: string) {
    const { data } = await supabase.from('stock').select('*').eq('produit_id', produitId).order('taille')
    if (data) setStock(data)
  }

  function updateCouleur(index: number, field: string, value: any) {
    setCouleurs(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c))
  }

  function updateTailleCouleur(couleurIndex: number, tailleIndex: number, field: string, value: any) {
    setCouleurs(prev => prev.map((c, i) => i === couleurIndex ? {
      ...c,
      tailles: c.tailles.map((t, j) => j === tailleIndex ? { ...t, [field]: value } : t)
    } : c))
  }

  function handleImageCouleur(e: React.ChangeEvent<HTMLInputElement>, index: number) {
    const file = e.target.files?.[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    updateCouleur(index, 'image_file', file)
    updateCouleur(index, 'preview', preview)
  }

  function ajouterCouleur() {
    setCouleurs(prev => [...prev, nouvelleCouleur()])
  }

  function supprimerCouleur(index: number) {
    setCouleurs(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSauvegarderProduit() {
    if (!form.nom || !form.reference || !form.prix_vente) {
      alert('Renseignez le nom, la référence et le prix.')
      return
    }
    setSaving(true)

    let imageUrl = ''
    if (form.image_file) {
      imageUrl = await uploadImage(form.image_file, `produits/${Date.now()}-${form.image_file.name}`) || ''
    }

    const { data: prodData, error } = await supabase.from('produits').insert({
      reference: form.reference,
      nom: form.nom,
      categorie: form.categorie,
      activite: form.activite,
      prix_vente: parseInt(form.prix_vente),
      prix_achat: parseInt(form.prix_achat) || 0,
      description: form.description,
      image_url: imageUrl || null,
    }).select().single()

    if (error || !prodData) { alert('Erreur: ' + error?.message); setSaving(false); return }

    for (const couleur of couleurs) {
      if (!couleur.couleur) continue
      let couleurImageUrl = ''
      if (couleur.image_file) {
        couleurImageUrl = await uploadImage(couleur.image_file, `stock/${Date.now()}-${couleur.image_file.name}`) || ''
      }
      for (const t of couleur.tailles) {
        if (!t.active) continue
        await supabase.from('stock').insert({
          produit_id: prodData.id,
          taille: t.taille,
          couleur: couleur.couleur,
          quantite: t.quantite,
          image_url: couleurImageUrl || null,
        })
      }
    }

    setForm({ reference: '', nom: '', categorie: '', activite: 'importé', prix_vente: '', prix_achat: '', description: '', image_file: null, preview: '' })
    setCouleurs([nouvelleCouleur()])
    await fetchProduits()
    setOnglet('liste')
    setSaving(false)
  }

  async function handleAjouterStockCouleur() {
    if (!produitSelectionne || !stockCouleurForm.couleur) {
      alert('Renseignez la couleur.')
      return
    }
    const taillesActives = stockCouleurForm.tailles.filter(t => t.active)
    if (taillesActives.length === 0) {
      alert('Sélectionnez au moins une taille.')
      return
    }
    setSaving(true)
    let couleurImageUrl = ''
    if (stockCouleurForm.image_file) {
      couleurImageUrl = await uploadImage(stockCouleurForm.image_file, `stock/${Date.now()}-${stockCouleurForm.image_file.name}`) || ''
    }
    for (const t of taillesActives) {
      await supabase.from('stock').upsert({
        produit_id: produitSelectionne.id,
        taille: t.taille,
        couleur: stockCouleurForm.couleur,
        quantite: t.quantite,
        image_url: couleurImageUrl || null,
      }, { onConflict: 'produit_id,taille,couleur' })
    }
    await fetchStock(produitSelectionne.id)
    setStockCouleurForm(nouvelleCouleur())
    setSaving(false)
  }

  async function handleSupprimerStock(id: string) {
    await supabase.from('stock').delete().eq('id', id)
    if (produitSelectionne) fetchStock(produitSelectionne.id)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: "'DM Sans', sans-serif" }}>

      <header style={{ background: '#1a1a1a', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 20 }}>←</button>
          <span style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>Gestion Produits</span>
        </div>
        <button
          onClick={() => { setOnglet(onglet === 'liste' ? 'nouveau' : 'liste'); setProduitSelectionne(null) }}
          style={{ background: '#d4a853', color: '#1a1a1a', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          {onglet === 'liste' ? '+ Nouveau produit' : '← Liste'}
        </button>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>

        {/* NOUVEAU PRODUIT */}
        {onglet === 'nouveau' && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: '24px' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', margin: '0 0 20px' }}>Nouveau produit</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { label: 'Référence *', key: 'reference', placeholder: 'Ex: CK-POL-002' },
                { label: 'Nom *', key: 'nom', placeholder: 'Ex: Polo Rayé' },
                { label: 'Catégorie', key: 'categorie', placeholder: 'Ex: polo, robe, jupe' },
                { label: 'Prix de vente (F) *', key: 'prix_vente', placeholder: 'Ex: 8000' },
                { label: "Prix d'achat (F)", key: 'prix_achat', placeholder: 'Ex: 4000' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{f.label}</label>
                  <input value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder} style={inputStyle} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Activité</label>
                <select value={form.activite} onChange={e => setForm(prev => ({ ...prev, activite: e.target.value }))} style={inputStyle}>
                  <option value="importé">Importé</option>
                  <option value="CK Design">CK Design</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Description</label>
              <textarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description du produit..." rows={2} style={{ ...inputStyle, resize: 'vertical' as const }} />
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Photo principale du produit</label>
              <input type="file" accept="image/*" ref={fileRef} onChange={e => {
                const file = e.target.files?.[0]
                if (file) setForm(prev => ({ ...prev, image_file: file, preview: URL.createObjectURL(file) }))
              }} style={{ display: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => fileRef.current?.click()}
                  style={{ padding: '10px 20px', borderRadius: 8, border: '1.5px dashed #d4a853', background: '#fffbf0', color: '#d4a853', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  📷 Choisir une photo
                </button>
                {form.preview && <img src={form.preview} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }} />}
              </div>
            </div>

            {/* COULEURS */}
            <div style={{ marginTop: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Couleurs & Tailles disponibles</h3>
                <button onClick={ajouterCouleur}
                  style={{ background: '#f0f7ff', color: '#1e40af', border: '1px solid #bfdbfe', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  + Ajouter une couleur
                </button>
              </div>

              {couleurs.map((c, ci) => (
                <div key={ci} style={{ background: '#f8f9fa', borderRadius: 12, padding: '16px', marginBottom: 12, border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#888', display: 'block', marginBottom: 4 }}>NOM DE LA COULEUR</label>
                      <input value={c.couleur} onChange={e => updateCouleur(ci, 'couleur', e.target.value)}
                        placeholder="Ex: Rouge, Blanc, Bleu marine..."
                        style={{ ...inputStyle, padding: '8px 12px' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#888', display: 'block', marginBottom: 4 }}>PHOTO</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => {
                          const input = document.createElement('input')
                          input.type = 'file'; input.accept = 'image/*'
                          input.onchange = (e: any) => handleImageCouleur(e, ci)
                          input.click()
                        }} style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px dashed #d4a853', background: '#fffbf0', color: '#d4a853', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                          📷
                        </button>
                        {c.preview && <img src={c.preview} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }} />}
                      </div>
                    </div>
                    {couleurs.length > 1 && (
                      <button onClick={() => supprimerCouleur(ci)}
                        style={{ background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 8, padding: '8px 12px', fontSize: 13, cursor: 'pointer', alignSelf: 'flex-end' }}>
                        Supprimer
                      </button>
                    )}
                  </div>

                  <label style={{ fontSize: 11, fontWeight: 600, color: '#888', display: 'block', marginBottom: 8 }}>TAILLES DISPONIBLES</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {c.tailles.map((t, ti) => (
                      <div key={t.taille} style={{ display: 'flex', alignItems: 'center', gap: 6, background: t.active ? '#1a1a1a' : '#fff', borderRadius: 8, border: t.active ? '1.5px solid #1a1a1a' : '1.5px solid #e5e7eb', padding: '6px 10px', cursor: 'pointer' }}
                        onClick={() => updateTailleCouleur(ci, ti, 'active', !t.active)}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: t.active ? '#fff' : '#555' }}>{t.taille}</span>
                        {t.active && (
                          <input type="number" value={t.quantite} min={1}
                            onClick={e => e.stopPropagation()}
                            onChange={e => updateTailleCouleur(ci, ti, 'quantite', parseInt(e.target.value) || 1)}
                            style={{ width: 44, padding: '2px 4px', borderRadius: 4, border: '1px solid #555', background: 'transparent', color: '#fff', fontSize: 12, textAlign: 'center', outline: 'none' }} />
                        )}
                      </div>
                    ))}
                  </div>
                  {c.tailles.filter(t => t.active).length > 0 && (
                    <p style={{ margin: '8px 0 0', fontSize: 11, color: '#888' }}>
                      ✓ {c.tailles.filter(t => t.active).map(t => `${t.taille}(${t.quantite})`).join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <button onClick={handleSauvegarderProduit} disabled={saving}
              style={{ marginTop: 20, background: saving ? '#888' : '#1a1a1a', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 28px', fontSize: 15, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? '⏳ Enregistrement...' : 'Enregistrer le produit'}
            </button>
          </div>
        )}

        {/* LISTE PRODUITS */}
        {onglet === 'liste' && !produitSelectionne && (
          <>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>Chargement...</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                {produits.map(p => (
                  <div key={p.id} onClick={() => { setProduitSelectionne(p); fetchStock(p.id) }}
                    style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                    <div style={{ aspectRatio: '4/3', background: 'linear-gradient(135deg, #f0ece4, #e8e1d5)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {p.image_url
                        ? <img src={p.image_url} alt={p.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ fontSize: 40, opacity: 0.2 }}>👗</div>
                      }
                    </div>
                    <div style={{ padding: '12px' }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{p.nom}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>{p.reference}</p>
                      <p style={{ margin: '6px 0 0', fontSize: 15, fontWeight: 700, color: '#d4a853' }}>{p.prix_vente.toLocaleString('fr-FR')} F</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* DÉTAIL PRODUIT */}
        {onglet === 'liste' && produitSelectionne && (
          <div>
            <button onClick={() => setProduitSelectionne(null)}
              style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 14, marginBottom: 16 }}>
              ← Retour à la liste
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 20 }}>
              <div style={{ aspectRatio: '3/4', background: 'linear-gradient(135deg, #f0ece4, #e8e1d5)', borderRadius: 14, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {produitSelectionne.image_url
                  ? <img src={produitSelectionne.image_url} alt={produitSelectionne.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ fontSize: 48, opacity: 0.2 }}>👗</div>
                }
              </div>
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '16px' }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1a1a1a' }}>{produitSelectionne.nom}</h2>
                <p style={{ margin: '4px 0', fontSize: 13, color: '#888' }}>{produitSelectionne.reference}</p>
                <p style={{ margin: '8px 0', fontSize: 20, fontWeight: 700, color: '#d4a853' }}>{produitSelectionne.prix_vente.toLocaleString('fr-FR')} F</p>
                {produitSelectionne.description && (
                  <p style={{ margin: '8px 0 0', fontSize: 13, color: '#666', lineHeight: 1.6 }}>{produitSelectionne.description}</p>
                )}
              </div>
            </div>

            {/* Ajouter nouvelle couleur */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '16px', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', margin: '0 0 14px' }}>Ajouter une couleur</h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#888', display: 'block', marginBottom: 4 }}>COULEUR</label>
                  <input value={stockCouleurForm.couleur} onChange={e => setStockCouleurForm(prev => ({ ...prev, couleur: e.target.value }))}
                    placeholder="Ex: Rouge, Blanc..." style={{ ...inputStyle, padding: '8px 12px' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#888', display: 'block', marginBottom: 4 }}>PHOTO</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'file'; input.accept = 'image/*'
                      input.onchange = (e: any) => {
                        const file = e.target.files?.[0]
                        if (file) setStockCouleurForm(prev => ({ ...prev, image_file: file, preview: URL.createObjectURL(file) }))
                      }
                      input.click()
                    }} style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px dashed #d4a853', background: '#fffbf0', color: '#d4a853', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      📷
                    </button>
                    {stockCouleurForm.preview && <img src={stockCouleurForm.preview} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }} />}
                  </div>
                </div>
              </div>

              <label style={{ fontSize: 11, fontWeight: 600, color: '#888', display: 'block', marginBottom: 8 }}>TAILLES DISPONIBLES</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {stockCouleurForm.tailles.map((t, ti) => (
                  <div key={t.taille}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: t.active ? '#1a1a1a' : '#fff', borderRadius: 8, border: t.active ? '1.5px solid #1a1a1a' : '1.5px solid #e5e7eb', padding: '6px 10px', cursor: 'pointer' }}
                    onClick={() => setStockCouleurForm(prev => ({ ...prev, tailles: prev.tailles.map((tt, i) => i === ti ? { ...tt, active: !tt.active } : tt) }))}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: t.active ? '#fff' : '#555' }}>{t.taille}</span>
                    {t.active && (
                      <input type="number" value={t.quantite} min={1}
                        onClick={e => e.stopPropagation()}
                        onChange={e => setStockCouleurForm(prev => ({ ...prev, tailles: prev.tailles.map((tt, i) => i === ti ? { ...tt, quantite: parseInt(e.target.value) || 1 } : tt) }))}
                        style={{ width: 44, padding: '2px 4px', borderRadius: 4, border: '1px solid #555', background: 'transparent', color: '#fff', fontSize: 12, textAlign: 'center', outline: 'none' }} />
                    )}
                  </div>
                ))}
              </div>

              <button onClick={handleAjouterStockCouleur} disabled={saving}
                style={{ background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {saving ? 'Ajout...' : '+ Ajouter cette couleur'}
              </button>
            </div>

            {/* Stock actuel groupé par couleur */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '16px' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', margin: '0 0 14px' }}>Stock actuel</h3>
              {stock.length === 0 ? (
                <p style={{ color: '#aaa', fontSize: 13 }}>Aucun stock enregistré</p>
              ) : (
                <div>
                  {[...new Set(stock.map(s => s.couleur))].map(couleur => {
                    const variantes = stock.filter(s => s.couleur === couleur)
                    const imageUrl = variantes[0]?.image_url
                    return (
                      <div key={couleur} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                        <div style={{ width: 50, height: 50, borderRadius: 8, overflow: 'hidden', background: 'linear-gradient(135deg, #f0ece4, #e8e1d5)', flexShrink: 0 }}>
                          {imageUrl
                            ? <img src={imageUrl} alt={couleur} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, opacity: 0.2 }}>👗</div>
                          }
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{couleur}</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                            {variantes.map(v => (
                              <span key={v.id} style={{ fontSize: 11, background: '#f0f0f0', borderRadius: 4, padding: '2px 6px', color: '#555' }}>
                                {v.taille}: {v.quantite}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button onClick={() => variantes.forEach(v => handleSupprimerStock(v.id))}
                          style={{ background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>
                          Supprimer
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
    </div>
  )
}