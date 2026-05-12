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
  reduction_type?: string | null
  reduction_valeur?: number
  reduction_quantite_min?: number
  prix_reduit?: number | null
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

function calculerPrixReduit(produit: Produit, quantite: number = 1): number | null {
  if (!produit.reduction_type) return null
  const prix = produit.prix_vente
  if (produit.reduction_type === 'quantite' && quantite < (produit.reduction_quantite_min || 1)) return null
  if (produit.reduction_type === 'fixe') return Math.max(0, prix - (produit.reduction_valeur || 0))
  if (produit.reduction_type === 'pourcentage') return Math.round(prix * (1 - (produit.reduction_valeur || 0) / 100))
  if (produit.reduction_type === 'quantite') return Math.max(0, prix - (produit.reduction_valeur || 0))
  return null
}

const ROLES_AUTORISES = ['gestionnaire_stock', 'super_admin', 'manager']

export default function ProduitsPage() {
  const router = useRouter()
  const [acces, setAcces] = useState(false)
  const [produits, setProduits] = useState<Produit[]>([])
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet] = useState<'liste' | 'nouveau'>('liste')
  const [produitSelectionne, setProduitSelectionne] = useState<Produit | null>(null)
  const [stock, setStock] = useState<StockItem[]>([])
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // REDUCTION GLOBALE
  const [showReductionGlobale, setShowReductionGlobale] = useState(false)
  const [reductionGlobale, setReductionGlobale] = useState({
    type: 'pourcentage',
    valeur: 0,
    quantite_min: 1,
  })
  const [savingReduction, setSavingReduction] = useState(false)

  // REDUCTION INDIVIDUELLE
  const [showReductionIndiv, setShowReductionIndiv] = useState(false)
  const [reductionIndiv, setReductionIndiv] = useState({
    type: 'pourcentage',
    valeur: 0,
    quantite_min: 1,
  })

  const [form, setForm] = useState({
    reference: '', nom: '', categorie: '', activite: 'importé',
    prix_vente: '', prix_achat: '', description: '',
    image_file: null as File | null, preview: ''
  })

  const [couleurs, setCouleurs] = useState<CouleurVariante[]>([nouvelleCouleur()])
  const [stockCouleurForm, setStockCouleurForm] = useState<CouleurVariante>(nouvelleCouleur())

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('ck_user') || '{}')
    if (!user?.role || !ROLES_AUTORISES.includes(user.role)) {
      router.push('/login')
      return
    }
    setAcces(true)
    fetchProduits()
  }, [])

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

  // APPLIQUER RÉDUCTION GLOBALE
  async function appliquerReductionGlobale() {
    if (!reductionGlobale.valeur) return
    setSavingReduction(true)
    for (const p of produits) {
      await supabase.from('produits').update({
        reduction_type: reductionGlobale.type,
        reduction_valeur: reductionGlobale.valeur,
        reduction_quantite_min: reductionGlobale.type === 'quantite' ? reductionGlobale.quantite_min : 0,
      }).eq('id', p.id)
    }
    await fetchProduits()
    setShowReductionGlobale(false)
    setSavingReduction(false)
    alert('✅ Réduction appliquée sur tous les produits !')
  }

  // SUPPRIMER RÉDUCTION GLOBALE
  async function supprimerReductionGlobale() {
    if (!confirm('Supprimer la réduction sur tous les produits ?')) return
    setSavingReduction(true)
    for (const p of produits) {
      await supabase.from('produits').update({
        reduction_type: null, reduction_valeur: 0, reduction_quantite_min: 0,
      }).eq('id', p.id)
    }
    await fetchProduits()
    setSavingReduction(false)
    alert('✅ Réductions supprimées !')
  }

  // APPLIQUER RÉDUCTION INDIVIDUELLE
  async function appliquerReductionIndiv() {
    if (!produitSelectionne || !reductionIndiv.valeur) return
    setSaving(true)
    await supabase.from('produits').update({
      reduction_type: reductionIndiv.type,
      reduction_valeur: reductionIndiv.valeur,
      reduction_quantite_min: reductionIndiv.type === 'quantite' ? reductionIndiv.quantite_min : 0,
    }).eq('id', produitSelectionne.id)
    const updated = { ...produitSelectionne, ...reductionIndiv }
    setProduitSelectionne({ ...produitSelectionne, reduction_type: reductionIndiv.type, reduction_valeur: reductionIndiv.valeur, reduction_quantite_min: reductionIndiv.quantite_min })
    await fetchProduits()
    setShowReductionIndiv(false)
    setSaving(false)
  }

  // SUPPRIMER RÉDUCTION INDIVIDUELLE
  async function supprimerReductionIndiv() {
    if (!produitSelectionne) return
    await supabase.from('produits').update({
      reduction_type: null, reduction_valeur: 0, reduction_quantite_min: 0,
    }).eq('id', produitSelectionne.id)
    setProduitSelectionne({ ...produitSelectionne, reduction_type: null, reduction_valeur: 0 })
    await fetchProduits()
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
    updateCouleur(index, 'image_file', file)
    updateCouleur(index, 'preview', URL.createObjectURL(file))
  }

  function ajouterCouleur() { setCouleurs(prev => [...prev, nouvelleCouleur()]) }
  function supprimerCouleur(index: number) { setCouleurs(prev => prev.filter((_, i) => i !== index)) }

  async function handleSauvegarderProduit() {
    if (!form.nom || !form.reference || !form.prix_vente) { alert('Renseignez le nom, la référence et le prix.'); return }
    setSaving(true)
    let imageUrl = ''
    if (form.image_file) imageUrl = await uploadImage(form.image_file, `produits/${Date.now()}-${form.image_file.name}`) || ''

    const { data: prodData, error } = await supabase.from('produits').insert({
      reference: form.reference, nom: form.nom, categorie: form.categorie,
      activite: form.activite, prix_vente: parseInt(form.prix_vente),
      prix_achat: parseInt(form.prix_achat) || 0, description: form.description,
      image_url: imageUrl || null,
    }).select().single()

    if (error || !prodData) { alert('Erreur: ' + error?.message); setSaving(false); return }

    for (const couleur of couleurs) {
      if (!couleur.couleur) continue
      let couleurImageUrl = ''
      if (couleur.image_file) couleurImageUrl = await uploadImage(couleur.image_file, `stock/${Date.now()}-${couleur.image_file.name}`) || ''
      for (const t of couleur.tailles) {
        if (!t.active) continue
        await supabase.from('stock').insert({
          produit_id: prodData.id, taille: t.taille, couleur: couleur.couleur,
          quantite: t.quantite, image_url: couleurImageUrl || null,
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
    if (!produitSelectionne || !stockCouleurForm.couleur) { alert('Renseignez la couleur.'); return }
    const taillesActives = stockCouleurForm.tailles.filter(t => t.active)
    if (taillesActives.length === 0) { alert('Sélectionnez au moins une taille.'); return }
    setSaving(true)
    let couleurImageUrl = ''
    if (stockCouleurForm.image_file) couleurImageUrl = await uploadImage(stockCouleurForm.image_file, `stock/${Date.now()}-${stockCouleurForm.image_file.name}`) || ''
    for (const t of taillesActives) {
      await supabase.from('stock').upsert({
        produit_id: produitSelectionne.id, taille: t.taille, couleur: stockCouleurForm.couleur,
        quantite: t.quantite, image_url: couleurImageUrl || null,
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

  if (!acces) return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#888' }}>Vérification des droits...</div>
    </div>
  )

  const prixReduitSelectionne = produitSelectionne ? calculerPrixReduit(produitSelectionne) : null

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: "'DM Sans', sans-serif" }}>

      <header style={{ background: '#1a1a1a', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 20 }}>←</button>
          <span style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>Gestion Produits</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {onglet === 'liste' && !produitSelectionne && (
            <button onClick={() => setShowReductionGlobale(!showReductionGlobale)}
              style={{ background: '#f59e0b', color: '#1a1a1a', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              🏷️ Réduction globale
            </button>
          )}
          <button onClick={() => { setOnglet(onglet === 'liste' ? 'nouveau' : 'liste'); setProduitSelectionne(null) }}
            style={{ background: '#d4a853', color: '#1a1a1a', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {onglet === 'liste' ? '+ Nouveau produit' : '← Liste'}
          </button>
        </div>
      </header>

      {/* MODAL RÉDUCTION GLOBALE */}
      {showReductionGlobale && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>🏷️ Réduction sur tous les produits</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#888' }}>{produits.length} produits concernés</p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 8 }}>Type de réduction</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { id: 'pourcentage', label: '📊 Pourcentage' },
                  { id: 'fixe', label: '💰 Prix fixe' },
                  { id: 'quantite', label: '📦 Par quantité' },
                ].map(t => (
                  <button key={t.id} onClick={() => setReductionGlobale(p => ({ ...p, type: t.id }))}
                    style={{ flex: 1, padding: '10px 8px', borderRadius: 9, border: `2px solid ${reductionGlobale.type === t.id ? '#f59e0b' : '#e5e7eb'}`, background: reductionGlobale.type === t.id ? '#fffbf0' : '#f8f9fa', color: reductionGlobale.type === t.id ? '#92400e' : '#555', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 8 }}>
                {reductionGlobale.type === 'pourcentage' ? 'Pourcentage de réduction (%)' : reductionGlobale.type === 'fixe' ? 'Montant de la réduction (F)' : 'Réduction par article (F)'}
              </label>
              <input type="number" value={reductionGlobale.valeur} onChange={e => setReductionGlobale(p => ({ ...p, valeur: Number(e.target.value) }))}
                placeholder={reductionGlobale.type === 'pourcentage' ? 'Ex: 10 pour 10%' : 'Ex: 500'}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none' }} />
            </div>

            {reductionGlobale.type === 'quantite' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 8 }}>Quantité minimum pour bénéficier de la réduction</label>
                <input type="number" value={reductionGlobale.quantite_min} onChange={e => setReductionGlobale(p => ({ ...p, quantite_min: Number(e.target.value) }))}
                  placeholder="Ex: 3"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none' }} />
              </div>
            )}

            {/* APERÇU */}
            {reductionGlobale.valeur > 0 && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                <p style={{ margin: 0, fontSize: 13, color: '#1D9E75', fontWeight: 600 }}>
                  Aperçu : Ex. produit à 5 000 F →{' '}
                  {reductionGlobale.type === 'pourcentage'
                    ? `${(5000 * (1 - reductionGlobale.valeur / 100)).toLocaleString('fr-FR')} F (-${reductionGlobale.valeur}%)`
                    : reductionGlobale.type === 'fixe'
                    ? `${(5000 - reductionGlobale.valeur).toLocaleString('fr-FR')} F (-${reductionGlobale.valeur.toLocaleString('fr-FR')} F)`
                    : `${(5000 - reductionGlobale.valeur).toLocaleString('fr-FR')} F à partir de ${reductionGlobale.quantite_min} articles`
                  }
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowReductionGlobale(false)}
                style={{ flex: 1, padding: '11px', borderRadius: 9, border: '1.5px solid #e5e7eb', background: 'transparent', color: '#888', cursor: 'pointer', fontWeight: 600 }}>
                Annuler
              </button>
              <button onClick={supprimerReductionGlobale} disabled={savingReduction}
                style={{ flex: 1, padding: '11px', borderRadius: 9, border: 'none', background: '#fee2e2', color: '#991b1b', cursor: 'pointer', fontWeight: 600 }}>
                🗑️ Supprimer
              </button>
              <button onClick={appliquerReductionGlobale} disabled={savingReduction || !reductionGlobale.valeur}
                style={{ flex: 2, padding: '11px', borderRadius: 9, border: 'none', background: !reductionGlobale.valeur ? '#e5e7eb' : '#f59e0b', color: !reductionGlobale.valeur ? '#888' : '#1a1a1a', cursor: !reductionGlobale.valeur ? 'not-allowed' : 'pointer', fontWeight: 700 }}>
                {savingReduction ? '...' : '✅ Appliquer à tous'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>

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
              <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Photo principale</label>
              <input type="file" accept="image/*" ref={fileRef} onChange={e => {
                const file = e.target.files?.[0]
                if (file) setForm(prev => ({ ...prev, image_file: file, preview: URL.createObjectURL(file) }))
              }} style={{ display: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => fileRef.current?.click()}
                  style={{ padding: '10px 20px', borderRadius: 8, border: '1.5px dashed #d4a853', background: '#fffbf0', color: '#d4a853', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  📷 Choisir une photo
                </button>
                {form.preview && <img src={form.preview} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8 }} />}
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Couleurs & Tailles</h3>
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
                        placeholder="Ex: Rouge, Blanc..." style={{ ...inputStyle, padding: '8px 12px' }} />
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
                </div>
              ))}
            </div>

            <button onClick={handleSauvegarderProduit} disabled={saving}
              style={{ marginTop: 20, background: saving ? '#888' : '#1a1a1a', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 28px', fontSize: 15, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? '⏳ Enregistrement...' : 'Enregistrer le produit'}
            </button>
          </div>
        )}

        {onglet === 'liste' && !produitSelectionne && (
          <>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>Chargement...</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                {produits.map(p => {
                  const prixReduit = calculerPrixReduit(p)
                  return (
                    <div key={p.id} onClick={() => { setProduitSelectionne(p); fetchStock(p.id); setReductionIndiv({ type: p.reduction_type || 'pourcentage', valeur: p.reduction_valeur || 0, quantite_min: p.reduction_quantite_min || 1 }) }}
                      style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden', cursor: 'pointer', position: 'relative' }}
                      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
                      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                      {p.reduction_type && (
                        <div style={{ position: 'absolute', top: 8, left: 8, background: '#E24B4A', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, zIndex: 2 }}>
                          {p.reduction_type === 'pourcentage' ? `-${p.reduction_valeur}%` : p.reduction_type === 'fixe' ? `-${p.reduction_valeur?.toLocaleString('fr-FR')} F` : `📦 -${p.reduction_valeur?.toLocaleString('fr-FR')} F`}
                        </div>
                      )}
                      <div style={{ aspectRatio: '4/3', background: 'linear-gradient(135deg, #f0ece4, #e8e1d5)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {p.image_url ? <img src={p.image_url} alt={p.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ fontSize: 40, opacity: 0.2 }}>👗</div>}
                      </div>
                      <div style={{ padding: '12px' }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{p.nom}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>{p.reference}</p>
                        {prixReduit ? (
                          <div style={{ marginTop: 6 }}>
                            <span style={{ fontSize: 12, color: '#aaa', textDecoration: 'line-through', marginRight: 6 }}>{p.prix_vente.toLocaleString('fr-FR')} F</span>
                            <span style={{ fontSize: 15, fontWeight: 700, color: '#E24B4A' }}>{prixReduit.toLocaleString('fr-FR')} F</span>
                          </div>
                        ) : (
                          <p style={{ margin: '6px 0 0', fontSize: 15, fontWeight: 700, color: '#d4a853' }}>{p.prix_vente.toLocaleString('fr-FR')} F</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {onglet === 'liste' && produitSelectionne && (
          <div>
            <button onClick={() => setProduitSelectionne(null)}
              style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 14, marginBottom: 16 }}>
              ← Retour à la liste
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 20 }}>
              <div style={{ aspectRatio: '3/4', background: 'linear-gradient(135deg, #f0ece4, #e8e1d5)', borderRadius: 14, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {produitSelectionne.image_url ? <img src={produitSelectionne.image_url} alt={produitSelectionne.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ fontSize: 48, opacity: 0.2 }}>👗</div>}
              </div>
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '16px' }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1a1a1a' }}>{produitSelectionne.nom}</h2>
                <p style={{ margin: '4px 0', fontSize: 13, color: '#888' }}>{produitSelectionne.reference}</p>

                {/* PRIX AVEC RÉDUCTION */}
                <div style={{ margin: '12px 0' }}>
                  {prixReduitSelectionne ? (
                    <div>
                      <span style={{ fontSize: 16, color: '#aaa', textDecoration: 'line-through', marginRight: 8 }}>{produitSelectionne.prix_vente.toLocaleString('fr-FR')} F</span>
                      <span style={{ fontSize: 22, fontWeight: 700, color: '#E24B4A' }}>{prixReduitSelectionne.toLocaleString('fr-FR')} F</span>
                      <span style={{ marginLeft: 8, fontSize: 12, background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                        {produitSelectionne.reduction_type === 'pourcentage' ? `-${produitSelectionne.reduction_valeur}%` : `-${produitSelectionne.reduction_valeur?.toLocaleString('fr-FR')} F`}
                      </span>
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#d4a853' }}>{produitSelectionne.prix_vente.toLocaleString('fr-FR')} F</p>
                  )}
                  {produitSelectionne.reduction_type === 'quantite' && (
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#888' }}>📦 À partir de {produitSelectionne.reduction_quantite_min} articles</p>
                  )}
                </div>

                {produitSelectionne.description && (
                  <p style={{ margin: '8px 0 0', fontSize: 13, color: '#666', lineHeight: 1.6 }}>{produitSelectionne.description}</p>
                )}

                {/* BOUTON RÉDUCTION INDIVIDUELLE */}
                <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowReductionIndiv(!showReductionIndiv)}
                    style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #f59e0b', background: '#fffbf0', color: '#92400e', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    🏷️ {produitSelectionne.reduction_type ? 'Modifier la réduction' : 'Ajouter une réduction'}
                  </button>
                  {produitSelectionne.reduction_type && (
                    <button onClick={supprimerReductionIndiv}
                      style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #fecaca', background: '#fee2e2', color: '#991b1b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      🗑️ Supprimer réduction
                    </button>
                  )}
                </div>

                {/* FORMULAIRE RÉDUCTION INDIVIDUELLE */}
                {showReductionIndiv && (
                  <div style={{ marginTop: 14, background: '#f8f9fa', borderRadius: 12, padding: 16, border: '1px solid #e5e7eb' }}>
                    <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>Réduction sur ce produit uniquement</p>

                    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                      {[
                        { id: 'pourcentage', label: '📊 %' },
                        { id: 'fixe', label: '💰 Fixe' },
                        { id: 'quantite', label: '📦 Qté' },
                      ].map(t => (
                        <button key={t.id} onClick={() => setReductionIndiv(p => ({ ...p, type: t.id }))}
                          style={{ flex: 1, padding: '8px', borderRadius: 8, border: `2px solid ${reductionIndiv.type === t.id ? '#f59e0b' : '#e5e7eb'}`, background: reductionIndiv.type === t.id ? '#fffbf0' : '#fff', color: reductionIndiv.type === t.id ? '#92400e' : '#555', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          {t.label}
                        </button>
                      ))}
                    </div>

                    <input type="number" value={reductionIndiv.valeur} onChange={e => setReductionIndiv(p => ({ ...p, valeur: Number(e.target.value) }))}
                      placeholder={reductionIndiv.type === 'pourcentage' ? 'Ex: 10 pour 10%' : 'Ex: 500 F'}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', marginBottom: 10 }} />

                    {reductionIndiv.type === 'quantite' && (
                      <input type="number" value={reductionIndiv.quantite_min} onChange={e => setReductionIndiv(p => ({ ...p, quantite_min: Number(e.target.value) }))}
                        placeholder="Qté minimum (ex: 3)"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', marginBottom: 10 }} />
                    )}

                    {reductionIndiv.valeur > 0 && (
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 12px', marginBottom: 10, fontSize: 12, color: '#1D9E75', fontWeight: 600 }}>
                        {produitSelectionne.prix_vente.toLocaleString('fr-FR')} F →{' '}
                        {reductionIndiv.type === 'pourcentage'
                          ? `${Math.round(produitSelectionne.prix_vente * (1 - reductionIndiv.valeur / 100)).toLocaleString('fr-FR')} F (-${reductionIndiv.valeur}%)`
                          : `${(produitSelectionne.prix_vente - reductionIndiv.valeur).toLocaleString('fr-FR')} F (-${reductionIndiv.valeur.toLocaleString('fr-FR')} F)`
                        }
                      </div>
                    )}

                    <button onClick={appliquerReductionIndiv} disabled={saving || !reductionIndiv.valeur}
                      style={{ width: '100%', padding: '10px', borderRadius: 9, border: 'none', background: !reductionIndiv.valeur ? '#e5e7eb' : '#f59e0b', color: !reductionIndiv.valeur ? '#888' : '#1a1a1a', cursor: !reductionIndiv.valeur ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13 }}>
                      {saving ? '...' : '✅ Appliquer la réduction'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* AJOUTER COULEUR */}
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

            {/* STOCK ACTUEL */}
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
                          {imageUrl ? <img src={imageUrl} alt={couleur} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, opacity: 0.2 }}>👗</div>}
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