'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function compressImage(file: File): Promise<File> {
  if (file.size < 800 * 1024) return file
  return new Promise(resolve => {
    const canvas = document.createElement('canvas')
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 1200
      let w = img.width, h = img.height
      if (w > MAX) { h = (h * MAX) / w; w = MAX }
      if (h > MAX) { w = (w * MAX) / h; h = MAX }
      canvas.width = w; canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      canvas.toBlob(blob => {
        URL.revokeObjectURL(url)
        resolve(blob ? new File([blob], file.name, { type: 'image/jpeg' }) : file)
      }, 'image/jpeg', 0.85)
    }
    img.src = url
  })
}

async function uploadImage(file: File, path: string): Promise<string | null> {
  const cleanPath = path.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-_.\/]/g, '').toLowerCase()
  const { error } = await supabase.storage.from('Produits').upload(cleanPath, file, { upsert: true })
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

function calculerPrixReduit(produit: any, quantite: number = 1): number | null {
  if (!produit.reduction_type) return null
  const prix = produit.prix_vente
  if (produit.reduction_type === 'quantite' && quantite < (produit.reduction_quantite_min || 1)) return null
  if (produit.reduction_type === 'fixe') return Math.max(0, prix - (produit.reduction_valeur || 0))
  if (produit.reduction_type === 'pourcentage') return Math.round(prix * (1 - (produit.reduction_valeur || 0) / 100))
  return null
}

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  nouveau:        { label: '🔴 Nouvelle',       color: '#E24B4A', bg: '#fff0f0', border: '#fecaca' },
  en_preparation: { label: '📦 En préparation', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  en_livraison:   { label: '🚚 En livraison',   color: '#BA7517', bg: '#fff8e6', border: '#fde68a' },
  livre:          { label: '✅ Livrée',          color: '#1D9E75', bg: '#f0fdf4', border: '#bbf7d0' },
  annule:         { label: '❌ Annulée',         color: '#888',    bg: '#f8f9fa', border: '#e5e7eb' },
  retour:         { label: '↩️ Retour',          color: '#0891b2', bg: '#e0f7fa', border: '#bae6fd' },
}

export default function GestionnaireStockPage() {
  const [stock, setStock] = useState<any[]>([])
  const [produits, setProduits] = useState<any[]>([])
  const [boutiques, setBoutiques] = useState<any[]>([])
  const [mouvements, setMouvements] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [tailles, setTailles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet] = useState<'commandes' | 'historique' | 'produits' | 'nouveau_produit' | 'approvisionner' | 'depenses'>('commandes')
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingProgress, setSavingProgress] = useState('')
  const [produitDetail, setProduitDetail] = useState<any>(null)
  const [ajustements, setAjustements] = useState<Record<string, number>>({})
  const [approForm, setApproForm] = useState({ boutique_id: '', nom_produit: '', taille: '', couleur: '', quantite: 1, prix_vente: 0 })
  const [prodForm, setProdForm] = useState({
    reference: '', nom: '', categorie: '', activite: 'ck_design',
    prix_vente: 0, prix_achat: 0, description: '',
    image_file: null as File | null, preview: '', disponible: true,
    reduction_type: null as string | null, reduction_valeur: 0, reduction_quantite_min: 1,
  })
  const [couleurs, setCouleurs] = useState<CouleurVariante[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const [commandes, setCommandes] = useState<any[]>([])
  const [historique, setHistorique] = useState<any[]>([])
  const [commandeDetail, setCommandeDetail] = useState<any>(null); const [commandeVariantesImages, setCommandeVariantesImages] = useState<any[]>([])
  const [savingCommande, setSavingCommande] = useState(false)
  const [filtreHistorique, setFiltreHistorique] = useState<'tous' | 'livre' | 'en_livraison' | 'annule' | 'retour'>('tous')

  const [produitModif, setProduitModif] = useState<any>(null)
  const [modifForm, setModifForm] = useState<any>({})
  const [modifImageFile, setModifImageFile] = useState<File | null>(null)
  const [modifPreview, setModifPreview] = useState('')
  const [modifCouleurs, setModifCouleurs] = useState<CouleurVariante[]>([])
  const [savingModif, setSavingModif] = useState(false)
  const modifFileRef = useRef<HTMLInputElement>(null)

  const [showReductionGlobale, setShowReductionGlobale] = useState(false)
  const [reductionGlobale, setReductionGlobale] = useState({ type: 'pourcentage', valeur: 0, quantite_min: 1 })
  const [savingReduction, setSavingReduction] = useState(false)
  const [showReductionIndiv, setShowReductionIndiv] = useState(false)
  const [reductionIndiv, setReductionIndiv] = useState({ type: 'pourcentage', valeur: 0, quantite_min: 1 })

  const nouvelleCouleur = (taillesActives: string[]): CouleurVariante => ({
    couleur: '',
    tailles: taillesActives.map(t => ({ taille: t, quantite: 0, active: false }))
  })

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('ck_user') || '{}')
    setUser(u)
    if (u?.activite && u.activite !== 'ck_dress') setProdForm(p => ({ ...p, activite: u.activite }))
    fetchData(u)
  }, [])

  useEffect(() => {
    if (!prodForm.categorie) return
    const prefix = prodForm.activite === 'ck_design' ? 'CK' : 'SD'
    const catCode = prodForm.categorie.substring(0, 3).toUpperCase().replace(/\s/g, '')
    const timestamp = Date.now().toString().slice(-4)
    setProdForm(p => ({ ...p, reference: `${prefix}-${catCode}-${timestamp}` }))
  }, [prodForm.activite, prodForm.categorie])

  const fetchData = async (u?: any) => {
    const currentUser = u || user || JSON.parse(localStorage.getItem('ck_user') || '{}')
    const isSuperAdminOrGlobal = currentUser?.activite === 'ck_dress' || currentUser?.role === 'super_admin'
    const activite = currentUser?.activite

    const prodsQuery = isSuperAdminOrGlobal
      ? supabase.from('produits').select('*').order('nom')
      : supabase.from('produits').select('*').eq('activite', activite || 'ck_design').order('nom')

    let cmdsQuery = supabase.from('commandes_catalogue').select('*')
      .in('statut', ['nouveau', 'en_preparation'])
      .order('created_at', { ascending: false })
    if (!isSuperAdminOrGlobal) cmdsQuery = cmdsQuery.eq('activite', activite || 'ck_design')

    let histQuery = supabase.from('commandes_catalogue').select('*')
      .in('statut', ['en_livraison', 'livre', 'annule', 'retour'])
      .order('created_at', { ascending: false })
      .limit(100)
    if (!isSuperAdminOrGlobal) histQuery = histQuery.eq('activite', activite || 'ck_design')

    const [{ data: prodsData }, { data: boutsData }, { data: ventesData }, { data: catsData }, { data: taillesData }, { data: cmdsData }, { data: histData }] = await Promise.all([
      prodsQuery,
      supabase.from('boutiques').select('*').eq('actif', true),
      supabase.from('ventes_boutique').select('*').order('created_at', { ascending: false }).limit(30),
      supabase.from('categories').select('*').order('activite').order('ordre'),
      supabase.from('tailles').select('nom').eq('actif', true).order('ordre'),
      cmdsQuery,
      histQuery,
    ])

    const taillesActives = (taillesData || []).map((t: any) => t.nom)
    setTailles(taillesActives)
    if (taillesActives.length > 0 && couleurs.length === 0) setCouleurs([nouvelleCouleur(taillesActives)])

    const prodsFiltres = prodsData || []
    let stockFiltre: any[] = []
    if (prodsFiltres.length > 0) {
      const prodIds = prodsFiltres.map((p: any) => p.id)
      const { data: stockData } = await supabase.from('stock').select('*').in('produit_id', prodIds).order('quantite')
      stockFiltre = stockData || []
    }

    setStock(stockFiltre)
    setProduits(prodsFiltres)
    setBoutiques(boutsData || [])
    setMouvements(ventesData || [])
    setCategories(catsData || [])
    setCommandes(cmdsData || [])
    setHistorique(histData || [])
    setLoading(false)
  }

  const ouvrirCommande = async (cmd: any) => { setCommandeDetail(cmd); setCommandeVariantesImages([]); const ids = (cmd.variantes || '').split(',').map((v: string) => v.trim().split(':')[0]).filter(Boolean); if (ids.length === 0) return; try { const { data: stockItems } = await supabase.from('stock').select('*').in('id', ids); const prod = produits.find((p: any) => p.reference === cmd.produit_ref); const items = (stockItems || []).map((s: any) => ({ ...s, image_url: s.image_url || prod?.image_url || null })); setCommandeVariantesImages(items) } catch (e) { console.error('Erreur images variantes', e) } }; const changerStatutCommande = async (id: string, statut: string) => {
    setSavingCommande(true)
    await supabase.from('commandes_catalogue').update({ statut }).eq('id', id)
    const msgs: Record<string, string> = {
      en_preparation: '✅ Commande en préparation !',
      en_livraison: '✅ Commande envoyée en livraison !',
    }
    setSuccess(msgs[statut] || '✅ Statut mis à jour !')
    setTimeout(() => setSuccess(''), 2000)
    setCommandeDetail(null)
    await fetchData()
    setSavingCommande(false)
  }

  const traiterRetour = async (cmd: any) => {
    if (!confirm(`Confirmer le retour de la commande #${cmd.id.slice(0, 6).toUpperCase()} ?\nLes modèles seront automatiquement remis en stock.`)) return
    setSavingCommande(true)
    await supabase.from('commandes_catalogue').update({ statut: 'retour' }).eq('id', cmd.id)
    const { data: prodData } = await supabase.from('produits').select('id').eq('reference', cmd.produit_ref).single()
    if (prodData) {
      const tailleCmde = cmd.taille
      const variantes = (cmd.variantes || '').split(',').map((v: string) => v.trim()).filter(Boolean)
      for (const couleur of variantes) {
        const { data: stockItem } = await supabase.from('stock').select('*').eq('produit_id', prodData.id).eq('taille', tailleCmde).ilike('couleur', couleur).single()
        if (stockItem) {
          await supabase.from('stock').update({ quantite: stockItem.quantite + 1 }).eq('id', stockItem.id)
        } else {
          await supabase.from('stock').insert({ produit_id: prodData.id, taille: tailleCmde, couleur, quantite: 1 })
        }
      }
    }
    setSuccess('↩️ Retour traité ! Stock remis à jour automatiquement.')
    setTimeout(() => setSuccess(''), 3000)
    setCommandeDetail(null)
    await fetchData()
    setSavingCommande(false)
  }

  const ouvrirModification = (prod: any) => {
    setProduitModif(prod)
    setModifForm({
      nom: prod.nom, categorie: prod.categorie || '', activite: prod.activite,
      prix_vente: prod.prix_vente, prix_achat: prod.prix_achat || 0,
      description: prod.description || '', disponible: prod.disponible,
      reduction_type: prod.reduction_type || null,
      reduction_valeur: prod.reduction_valeur || 0,
      reduction_quantite_min: prod.reduction_quantite_min || 1,
    })
    setModifPreview(prod.image_url || '')
    setModifImageFile(null)
    setModifCouleurs([nouvelleCouleur(tailles)])
  }

  const sauvegarderModification = async () => {
    if (!produitModif) return
    setSavingModif(true)
    let imageUrl = produitModif.image_url
    if (modifImageFile) imageUrl = await uploadImage(modifImageFile, `produits/${Date.now()}-${modifImageFile.name}`) || imageUrl
    await supabase.from('produits').update({
      nom: modifForm.nom, categorie: modifForm.categorie, activite: modifForm.activite,
      prix_vente: modifForm.prix_vente, prix_achat: modifForm.prix_achat,
      description: modifForm.description, disponible: modifForm.disponible,
      image_url: imageUrl, reduction_type: modifForm.reduction_type || null,
      reduction_valeur: modifForm.reduction_valeur || 0,
      reduction_quantite_min: modifForm.reduction_quantite_min || 0,
    }).eq('id', produitModif.id)

    const couleursValides = modifCouleurs.filter(c => c.couleur)
    if (couleursValides.length > 0) {
      const uploads = await Promise.all(couleursValides.map(async couleur => {
        let couleurImageUrl = ''
        if (couleur.image_file) couleurImageUrl = await uploadImage(couleur.image_file, `stock/${Date.now()}-${Math.random().toString(36).slice(2)}-${couleur.image_file.name}`) || ''
        return { couleur, imageUrl: couleurImageUrl }
      }))
      // ✅ CORRECTION: .then() pour convertir en Promise
      const insertions: PromiseLike<any>[] = []
      for (const { couleur, imageUrl: couleurImageUrl } of uploads) {
        for (const t of couleur.tailles.filter(t => t.active)) {
          insertions.push(
            supabase.from('stock').insert({ produit_id: produitModif.id, taille: t.taille, couleur: couleur.couleur, quantite: t.quantite, image_url: couleurImageUrl || null }).then()
          )
        }
      }
      await Promise.all(insertions)
    }
    await fetchData()
    setSavingModif(false)
    setProduitModif(null)
    setSuccess('✅ Produit modifié avec succès !')
    setTimeout(() => setSuccess(''), 3000)
  }

  const supprimerVariante = async (stockId: string) => {
    if (!confirm('Supprimer cette variante ?')) return
    await supabase.from('stock').delete().eq('id', stockId)
    await fetchData()
    setSuccess('✅ Variante supprimée !')
    setTimeout(() => setSuccess(''), 2000)
  }

  async function appliquerReductionGlobale() {
    if (!reductionGlobale.valeur) return
    setSavingReduction(true)
    for (const p of produits) {
      await supabase.from('produits').update({ reduction_type: reductionGlobale.type, reduction_valeur: reductionGlobale.valeur, reduction_quantite_min: reductionGlobale.type === 'quantite' ? reductionGlobale.quantite_min : 0 }).eq('id', p.id)
    }
    await fetchData()
    setShowReductionGlobale(false)
    setSavingReduction(false)
    setSuccess('✅ Réduction appliquée sur tous les produits !')
    setTimeout(() => setSuccess(''), 3000)
  }

  async function supprimerReductionGlobale() {
    if (!confirm('Supprimer la réduction sur tous les produits ?')) return
    setSavingReduction(true)
    for (const p of produits) await supabase.from('produits').update({ reduction_type: null, reduction_valeur: 0, reduction_quantite_min: 0 }).eq('id', p.id)
    await fetchData()
    setSavingReduction(false)
    setSuccess('✅ Réductions supprimées !')
    setTimeout(() => setSuccess(''), 3000)
  }

  async function appliquerReductionIndiv() {
    if (!produitDetail || !reductionIndiv.valeur) return
    setSaving(true)
    await supabase.from('produits').update({ reduction_type: reductionIndiv.type, reduction_valeur: reductionIndiv.valeur, reduction_quantite_min: reductionIndiv.type === 'quantite' ? reductionIndiv.quantite_min : 0 }).eq('id', produitDetail.id)
    setProduitDetail({ ...produitDetail, reduction_type: reductionIndiv.type, reduction_valeur: reductionIndiv.valeur })
    await fetchData()
    setShowReductionIndiv(false)
    setSaving(false)
    setSuccess('✅ Réduction appliquée !')
    setTimeout(() => setSuccess(''), 3000)
  }

  async function supprimerReductionIndiv() {
    if (!produitDetail) return
    await supabase.from('produits').update({ reduction_type: null, reduction_valeur: 0, reduction_quantite_min: 0 }).eq('id', produitDetail.id)
    setProduitDetail({ ...produitDetail, reduction_type: null, reduction_valeur: 0 })
    await fetchData()
  }

  const categoriesFiltrees = categories.filter(c => c.activite === prodForm.activite)
  const categoriesModifFiltrees = categories.filter(c => c.activite === modifForm.activite)
  const getStockProduit = (produitId: string) => stock.filter(s => s.produit_id === produitId).reduce((sum, s) => sum + s.quantite, 0)
  const getVariantesProduit = (produitId: string) => stock.filter(s => s.produit_id === produitId)

  const ajusterQuantite = async (stockId: string, delta: number) => {
    const item = stock.find(s => s.id === stockId)
    if (!item) return
    await supabase.from('stock').update({ quantite: Math.max(0, item.quantite + delta) }).eq('id', stockId)
    await fetchData()
  }

  const sauvegarderAjustement = async (stockId: string) => {
    const val = ajustements[stockId]
    if (val === undefined) return
    await supabase.from('stock').update({ quantite: Math.max(0, val) }).eq('id', stockId)
    setAjustements(prev => { const n = { ...prev }; delete n[stockId]; return n })
    await fetchData()
  }

  const updateCouleur = (index: number, field: string, value: any) => setCouleurs(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c))
  const updateTailleCouleur = (ci: number, ti: number, field: string, value: any) => setCouleurs(prev => prev.map((c, i) => i === ci ? { ...c, tailles: c.tailles.map((t, j) => j === ti ? { ...t, [field]: value } : t) } : c))
  const updateModifCouleur = (index: number, field: string, value: any) => setModifCouleurs(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c))
  const updateModifTailleCouleur = (ci: number, ti: number, field: string, value: any) => setModifCouleurs(prev => prev.map((c, i) => i === ci ? { ...c, tailles: c.tailles.map((t, j) => j === ti ? { ...t, [field]: value } : t) } : c))

  const publierProduit = async () => {
    if (!prodForm.nom || !prodForm.reference || !prodForm.prix_vente) { alert('Remplissez le nom, la référence et le prix.'); return }
    setSaving(true)
    setSavingProgress('⏳ Upload image principale...')
    let imageUrl = ''
    if (prodForm.image_file) imageUrl = await uploadImage(prodForm.image_file, `produits/${Date.now()}-${prodForm.image_file.name}`) || ''
    setSavingProgress('⏳ Création du produit...')
    const { data: prodData, error } = await supabase.from('produits').insert({
      reference: prodForm.reference, nom: prodForm.nom, categorie: prodForm.categorie,
      activite: prodForm.activite, prix_vente: prodForm.prix_vente, prix_achat: prodForm.prix_achat,
      description: prodForm.description, image_url: imageUrl || null, disponible: true,
      reduction_type: prodForm.reduction_type || null, reduction_valeur: prodForm.reduction_valeur || 0,
      reduction_quantite_min: prodForm.reduction_quantite_min || 0,
    }).select().single()
    if (error || !prodData) { alert('Erreur: ' + error?.message); setSaving(false); setSavingProgress(''); return }
    setSavingProgress('⏳ Upload images couleurs...')
    const couleursValides = couleurs.filter(c => c.couleur)
    const uploads = await Promise.all(couleursValides.map(async couleur => {
      let couleurImageUrl = ''
      if (couleur.image_file) couleurImageUrl = await uploadImage(couleur.image_file, `stock/${Date.now()}-${Math.random().toString(36).slice(2)}-${couleur.image_file.name}`) || ''
      return { couleur, imageUrl: couleurImageUrl }
    }))
    setSavingProgress('⏳ Enregistrement des variantes...')
    // ✅ CORRECTION: .then() pour convertir en Promise
    const insertions: PromiseLike<any>[] = []
    for (const { couleur, imageUrl: couleurImageUrl } of uploads) {
      for (const t of couleur.tailles.filter(t => t.active)) {
        insertions.push(
          supabase.from('stock').insert({ produit_id: prodData.id, taille: t.taille, couleur: couleur.couleur, quantite: t.quantite, image_url: couleurImageUrl || null }).then()
        )
      }
    }
    await Promise.all(insertions)
    setSavingProgress('')
    setSuccess('✅ Produit publié avec succès !')
    setTimeout(() => setSuccess(''), 3000)
    const u = JSON.parse(localStorage.getItem('ck_user') || '{}')
    setProdForm({ reference: '', nom: '', categorie: '', activite: u?.activite || 'ck_design', prix_vente: 0, prix_achat: 0, description: '', image_file: null, preview: '', disponible: true, reduction_type: null, reduction_valeur: 0, reduction_quantite_min: 1 })
    setCouleurs([nouvelleCouleur(tailles)])
    fetchData()
    setOnglet('produits')
    setSaving(false)
  }

  const [depenses2, setDepenses2] = useState<any[]>([]); const [depForm, setDepForm] = useState({ type: 'depense_generale', categorie: '', libelle: '', montant: 0, fournisseur: '', produit: '', quantite: 1, prix_unitaire: 0, date_depense: new Date().toISOString().split('T')[0] }); const [sousOngletDep, setSousOngletDep] = useState<'achat' | 'generale'>('generale'); const fetchDepenses = async () => { const { data } = await supabase.from('depenses').select('*').eq('activite', user?.activite || 'ck_design').order('date_depense', { ascending: false }); setDepenses2(data || []) }; const ajouterDepense = async () => { if (!depForm.libelle || !depForm.montant) return; setSaving(true); const montantFinal = sousOngletDep === 'achat' ? depForm.quantite * depForm.prix_unitaire : depForm.montant; await supabase.from('depenses').insert({ libelle: depForm.libelle, montant: montantFinal, categorie: sousOngletDep === 'achat' ? 'Achat fournisseur' : depForm.categorie, activite: user?.activite === 'ck_dress' ? 'ck_design' : user?.activite || 'ck_design', date_depense: depForm.date_depense, type: sousOngletDep === 'achat' ? 'achat_fournisseur' : 'depense_generale', fournisseur: depForm.fournisseur, produit: depForm.produit, quantite: depForm.quantite, prix_unitaire: depForm.prix_unitaire, created_by: user?.nom }); setDepForm({ type: 'depense_generale', categorie: '', libelle: '', montant: 0, fournisseur: '', produit: '', quantite: 1, prix_unitaire: 0, date_depense: new Date().toISOString().split('T')[0] }); await fetchDepenses(); setSaving(false); setSuccess('Depense enregistree !'); setTimeout(() => setSuccess(''), 2000) }; const approvisionnerBoutique = async () => {
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

  const supprimerProduit = async (id: string) => { if (!confirm('Supprimer ce produit ?')) return; await supabase.from('stock').delete().eq('produit_id', id); await supabase.from('produits').delete().eq('id', id); setSuccess('Produit supprime !'); setTimeout(() => setSuccess(''), 2000); fetchData() }; const toggleDisponible = async (id: string, disponible: boolean) => {
    await supabase.from('produits').update({ disponible: !disponible }).eq('id', id)
    if (produitDetail?.id === id) setProduitDetail((p: any) => ({ ...p, disponible: !disponible }))
    fetchData()
  }

  const isSuperAdmin = user?.activite === 'ck_dress' || user?.role === 'super_admin'
  const stockCritique = stock.filter(s => s.quantite <= 3)
  const totalArticles = stock.reduce((s, i) => s + i.quantite, 0)
  const prixReduitDetail = produitDetail ? calculerPrixReduit(produitDetail) : null
  const taillesEnfant = tailles.filter(t => t.includes('mois') || t.includes('an') || t.includes('ans'))
  const taillesAdulte = tailles.filter(t => !t.includes('mois') && !t.includes('an') && !t.includes('ans'))
  const commandesNouvelles = commandes.filter(c => c.statut === 'nouveau')
  const commandesEnPrep = commandes.filter(c => c.statut === 'en_preparation')
  const historiqueFiltree = filtreHistorique === 'tous' ? historique : historique.filter(c => c.statut === filtreHistorique)

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '9px', background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', boxSizing: 'border-box' as const, outline: 'none' }
  const MENU_ITEMS = [{ key: 'commandes', label: 'Commandes' }, { key: 'historique', label: 'Historique' }, { key: 'produits', label: 'Produits' }, { key: 'nouveau_produit', label: 'Publier un produit' }, { key: 'approvisionner', label: 'Approvisionner' }, { key: 'depenses', label: 'Depenses' }]; const labelStyle = { color: '#555', fontSize: '12px', fontWeight: 600 as const, display: 'block' as const, marginBottom: '6px' }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: "'Inter', sans-serif", color: '#1a1a1a' }}>

      {/* MODAL DETAIL COMMANDE */}
      {commandeDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setCommandeDetail(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 480, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Commande #{commandeDetail.id.slice(0, 6).toUpperCase()}</h3>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#888' }}>
                  {new Date(commandeDetail.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button onClick={() => setCommandeDetail(null)} style={{ background: '#f0f0f0', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>
            {(() => {
              const s = STATUT_CONFIG[commandeDetail.statut]
              return s ? (
                <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.label}</span>
                </div>
              ) : null
            })()}
            <div style={{ background: '#f8f9fa', borderRadius: 12, padding: 14, marginBottom: 12 }}>
              <h4 style={{ margin: '0 0 8px', fontSize: 11, color: '#888', textTransform: 'uppercase', fontWeight: 600 }}>Client</h4>
              <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700 }}>{commandeDetail.nom_client || '—'}</p>
              <p style={{ margin: '0 0 3px', fontSize: 13, color: '#555' }}>📱 {commandeDetail.telephone}</p>
              <p style={{ margin: 0, fontSize: 13, color: '#555' }}>📍 {commandeDetail.adresse}</p>
            </div>
            <div style={{ background: '#f8f9fa', borderRadius: 12, padding: 14, marginBottom: 12 }}>
              <h4 style={{ margin: '0 0 8px', fontSize: 11, color: '#888', textTransform: 'uppercase', fontWeight: 600 }}>Produit</h4>
              <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#0891b2' }}>Réf: {commandeDetail.produit_ref}</p>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: '#555' }}>📐 Taille : <strong>{commandeDetail.taille}</strong></p>
              <div style={{ marginBottom: 8 }}><p style={{ margin: '0 0 8px', fontSize: 13, color: '#555', fontWeight: 600 }}>Images variantes :</p><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{commandeVariantesImages.length > 0 ? commandeVariantesImages.map((v: any) => { const imgUrl = v.image_url || produits.find((p: any) => p.id === v.produit_id)?.image_url; return (<div key={v.id} style={{ textAlign: 'center' }}>{imgUrl ? <img src={imgUrl} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, border: '2px solid #e5e7eb' }} /> : <div style={{ width: 80, height: 80, borderRadius: 10, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>??</div>}<p style={{ margin: '4px 0 0', fontSize: 11, color: '#555', fontWeight: 600 }}>{v.couleur}</p></div>) }) : <p style={{ fontSize: 12, color: '#aaa' }}>{commandeDetail.variantes || 'Aucune variante'}</p>}</div></div>
              {commandeDetail.note && (
                <div style={{ marginTop: 8, background: '#fff8e6', borderRadius: 8, padding: '8px 10px', border: '1px solid #fde68a' }}>
                  <p style={{ margin: 0, fontSize: 12, color: '#92400e' }}>📝 {commandeDetail.note}</p>
                </div>
              )}
            </div>
            <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 14, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Total</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#1D9E75' }}>{commandeDetail.montant_total?.toLocaleString('fr-FR')} F</span>
            </div>
            {commandeDetail.statut === 'nouveau' && (
              <button onClick={() => changerStatutCommande(commandeDetail.id, 'en_preparation')} disabled={savingCommande}
                style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: savingCommande ? '#aaa' : '#7c3aed', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 10 }}>
                {savingCommande ? '⏳...' : '📦 Prendre en charge'}
              </button>
            )}
            {commandeDetail.statut === 'en_preparation' && (
              <button onClick={() => changerStatutCommande(commandeDetail.id, 'en_livraison')} disabled={savingCommande}
                style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: savingCommande ? '#aaa' : '#BA7517', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 10 }}>
                {savingCommande ? '⏳...' : '🚚 Commande prête — En livraison'}
              </button>
            )}
            {(commandeDetail.statut === 'livre' || commandeDetail.statut === 'en_livraison') && commandeDetail.statut !== 'retour' && (
              <button onClick={() => traiterRetour(commandeDetail)} disabled={savingCommande}
                style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1.5px solid #bae6fd', background: '#e0f7fa', color: '#0891b2', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 10 }}>
                {savingCommande ? '⏳...' : '↩️ Traiter un retour — Remettre en stock'}
              </button>
            )}
            {commandeDetail.statut === 'retour' && (
              <div style={{ background: '#e0f7fa', borderRadius: 10, padding: '12px 14px', marginBottom: 10, border: '1px solid #bae6fd', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 13, color: '#0891b2', fontWeight: 700 }}>↩️ Retour traité — Stock remis à jour</p>
              </div>
            )}
            <button onClick={() => setCommandeDetail(null)} style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#888', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Fermer</button>
          </div>
        </div>
      )}

      {/* MODAL MODIFICATION PRODUIT */}
      {produitModif && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setProduitModif(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 600, width: '100%', maxHeight: '92vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>✏️ Modifier le produit</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>{produitModif.reference}</p>
              </div>
              <button onClick={() => setProduitModif(null)} style={{ background: '#f0f0f0', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><label style={labelStyle}>Nom *</label><input value={modifForm.nom || ''} onChange={e => setModifForm((p: any) => ({ ...p, nom: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Prix de vente (F)</label><input type="number" value={modifForm.prix_vente || 0} onChange={e => setModifForm((p: any) => ({ ...p, prix_vente: Number(e.target.value) }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Prix d'achat (F)</label><input type="number" value={modifForm.prix_achat || 0} onChange={e => setModifForm((p: any) => ({ ...p, prix_achat: Number(e.target.value) }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Catégorie</label>
                <select value={modifForm.categorie || ''} onChange={e => setModifForm((p: any) => ({ ...p, categorie: e.target.value }))} style={inputStyle}>
                  <option value="">Choisir...</option>
                  {categoriesModifFiltrees.map((c: any) => <option key={c.id} value={c.nom}>{c.nom}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}><label style={labelStyle}>Description</label><textarea value={modifForm.description || ''} onChange={e => setModifForm((p: any) => ({ ...p, description: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' as const }} /></div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>📷 Photo</label>
              <input type="file" accept="image/*" ref={modifFileRef} onChange={async e => { const file = e.target.files?.[0]; if (file) { setModifPreview(URL.createObjectURL(file)); const comp = await compressImage(file); setModifImageFile(comp) } }} style={{ display: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => modifFileRef.current?.click()} style={{ padding: '9px 16px', borderRadius: 9, border: '1.5px dashed #0891b2', background: '#f0f9ff', color: '#0891b2', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>📷 Changer</button>
                {modifPreview && <img src={modifPreview} style={{ width: 60, height: 60, objectFit: 'contain', borderRadius: 8, border: '1px solid #e5e7eb' }} />}
              </div>
            </div>
            <div style={{ marginBottom: 16, background: '#fffbf0', borderRadius: 12, padding: 14, border: '1px solid #fde68a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: modifForm.reduction_type ? 12 : 0 }}>
                <label style={{ color: '#92400e', fontSize: 13, fontWeight: 700 }}>🏷️ Réduction</label>
                <button onClick={() => setModifForm((p: any) => ({ ...p, reduction_type: p.reduction_type ? null : 'pourcentage', reduction_valeur: 0 }))} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, border: 'none', background: modifForm.reduction_type ? '#fee2e2' : '#f0fdf4', color: modifForm.reduction_type ? '#991b1b' : '#1D9E75', cursor: 'pointer', fontWeight: 600 }}>{modifForm.reduction_type ? '✕ Supprimer' : '+ Ajouter'}</button>
              </div>
              {modifForm.reduction_type && (<>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  {[{ id: 'pourcentage', label: '📊 %' }, { id: 'fixe', label: '💰 Fixe' }, { id: 'quantite', label: '📦 Qté' }].map(t => (
                    <button key={t.id} onClick={() => setModifForm((p: any) => ({ ...p, reduction_type: t.id }))} style={{ flex: 1, padding: '8px', borderRadius: 8, border: `2px solid ${modifForm.reduction_type === t.id ? '#f59e0b' : '#e5e7eb'}`, background: modifForm.reduction_type === t.id ? '#fff' : '#f8f9fa', color: modifForm.reduction_type === t.id ? '#92400e' : '#555', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{t.label}</button>
                  ))}
                </div>
                <input type="number" value={modifForm.reduction_valeur || 0} onChange={e => setModifForm((p: any) => ({ ...p, reduction_valeur: Number(e.target.value) }))} placeholder="Valeur" style={{ ...inputStyle, marginBottom: 0 }} />
              </>)}
            </div>
            <div style={{ marginBottom: 16 }}>
              <button onClick={() => setModifForm((p: any) => ({ ...p, disponible: !p.disponible }))} style={{ width: '100%', padding: '10px', borderRadius: 10, cursor: 'pointer', border: 'none', fontWeight: 600, fontSize: 13, background: modifForm.disponible ? '#f0fdf4' : '#fff5f5', color: modifForm.disponible ? '#1D9E75' : '#E24B4A' }}>
                {modifForm.disponible ? '✅ Visible dans catalogue' : '❌ Masqué du catalogue'}
              </button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700 }}>📦 Variantes existantes</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {getVariantesProduit(produitModif.id).map((v: any) => (
                  <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa', borderRadius: 10, padding: '10px 14px', border: '1px solid #e5e7eb' }}>
                    <div><span style={{ fontSize: 13, fontWeight: 600 }}>Taille {v.taille}</span><span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>— {v.couleur}</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => ajusterQuantite(v.id, -1)} style={{ width: 26, height: 26, borderRadius: 7, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 700, color: '#E24B4A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                      <input type="number" value={ajustements[v.id] !== undefined ? ajustements[v.id] : v.quantite} onChange={e => setAjustements(prev => ({ ...prev, [v.id]: Number(e.target.value) }))} onBlur={() => sauvegarderAjustement(v.id)} min={0} style={{ width: 50, padding: '3px 6px', borderRadius: 7, textAlign: 'center', border: '1.5px solid #0891b2', fontSize: 13, fontWeight: 700, color: '#1D9E75', outline: 'none' }} />
                      <button onClick={() => ajusterQuantite(v.id, 1)} style={{ width: 26, height: 26, borderRadius: 7, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 700, color: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      <button onClick={() => supprimerVariante(v.id)} style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: '#fff0f0', cursor: 'pointer', fontSize: 13, color: '#E24B4A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16, background: '#f0f9ff', borderRadius: 12, padding: 14, border: '1px solid #bae6fd' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0891b2' }}>➕ Nouvelles variantes</h4>
                <button onClick={() => setModifCouleurs(prev => [...prev, nouvelleCouleur(tailles)])} style={{ background: '#0891b2', color: '#fff', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ Couleur</button>
              </div>
              {modifCouleurs.map((c, ci) => (
                <div key={ci} style={{ background: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <input value={c.couleur} onChange={e => updateModifCouleur(ci, 'couleur', e.target.value)} placeholder="Nom couleur" style={{ flex: 1, padding: '8px 12px', borderRadius: 8, background: '#f8f9fa', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: 13, outline: 'none' }} />
                    <button onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = async (e: any) => { const file = e.target.files?.[0]; if (file) { updateModifCouleur(ci, 'preview', URL.createObjectURL(file)); const comp = await compressImage(file); updateModifCouleur(ci, 'image_file', comp) } }; input.click() }} style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px dashed #0891b2', background: '#f0f9ff', color: '#0891b2', fontSize: 12, cursor: 'pointer' }}>📷</button>
                    {c.preview && <img src={c.preview} style={{ width: 34, height: 34, objectFit: 'contain', borderRadius: 6 }} />}
                    {modifCouleurs.length > 1 && <button onClick={() => setModifCouleurs(prev => prev.filter((_, i) => i !== ci))} style={{ background: '#fff5f5', color: '#E24B4A', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>✕</button>}
                  </div>
                  {taillesAdulte.length > 0 && (<div style={{ marginBottom: 6 }}><p style={{ margin: '0 0 5px', fontSize: 11, color: '#888', fontWeight: 600 }}>👕 Adulte</p><div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>{c.tailles.filter(t => !t.taille.includes('mois') && !t.taille.includes('an') && !t.taille.includes('ans')).map(t => { const realTi = c.tailles.findIndex(x => x.taille === t.taille); return <div key={t.taille} onClick={() => updateModifTailleCouleur(ci, realTi, 'active', !t.active)} style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer', background: t.active ? '#0891b2' : '#fff', border: `1.5px solid ${t.active ? '#0891b2' : '#e5e5e5'}`, borderRadius: 8, padding: '4px 8px' }}><span style={{ fontSize: 11, fontWeight: 700, color: t.active ? 'white' : '#888' }}>{t.taille}</span>{t.active && <input type="number" value={t.quantite} min={0} onClick={e => e.stopPropagation()} onChange={e => updateModifTailleCouleur(ci, realTi, 'quantite', Number(e.target.value))} style={{ width: 36, padding: '1px 3px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.4)', background: 'transparent', color: 'white', fontSize: 11, textAlign: 'center', outline: 'none' }} />}</div> })}</div></div>)}
                  {taillesEnfant.length > 0 && (<div><p style={{ margin: '0 0 5px', fontSize: 11, color: '#888', fontWeight: 600 }}>👶 Enfant</p><div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>{c.tailles.filter(t => t.taille.includes('mois') || t.taille.includes('an') || t.taille.includes('ans')).map(t => { const realTi = c.tailles.findIndex(x => x.taille === t.taille); return <div key={t.taille} onClick={() => updateModifTailleCouleur(ci, realTi, 'active', !t.active)} style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer', background: t.active ? '#1D9E75' : '#fff', border: `1.5px solid ${t.active ? '#1D9E75' : '#e5e5e5'}`, borderRadius: 8, padding: '4px 8px' }}><span style={{ fontSize: 11, fontWeight: 700, color: t.active ? 'white' : '#888' }}>{t.taille}</span>{t.active && <input type="number" value={t.quantite} min={0} onClick={e => e.stopPropagation()} onChange={e => updateModifTailleCouleur(ci, realTi, 'quantite', Number(e.target.value))} style={{ width: 36, padding: '1px 3px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.4)', background: 'transparent', color: 'white', fontSize: 11, textAlign: 'center', outline: 'none' }} />}</div> })}</div></div>)}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setProduitModif(null)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: 'transparent', color: '#888', cursor: 'pointer', fontWeight: 600 }}>Annuler</button>
              <button onClick={sauvegarderModification} disabled={savingModif} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: savingModif ? '#aaa' : '#0891b2', color: '#fff', cursor: savingModif ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14 }}>{savingModif ? '⏳ Sauvegarde...' : '✅ Sauvegarder'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RÉDUCTION GLOBALE */}
      {showReductionGlobale && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>🏷️ Réduction sur tous les produits</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#888' }}>{produits.length} produits concernés</p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 8 }}>Type</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ id: 'pourcentage', label: '📊 Pourcentage' }, { id: 'fixe', label: '💰 Prix fixe' }, { id: 'quantite', label: '📦 Par quantité' }].map(t => (
                  <button key={t.id} onClick={() => setReductionGlobale(p => ({ ...p, type: t.id }))} style={{ flex: 1, padding: '10px 8px', borderRadius: 9, border: `2px solid ${reductionGlobale.type === t.id ? '#f59e0b' : '#e5e7eb'}`, background: reductionGlobale.type === t.id ? '#fffbf0' : '#f8f9fa', color: reductionGlobale.type === t.id ? '#92400e' : '#555', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{t.label}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 8 }}>{reductionGlobale.type === 'pourcentage' ? 'Pourcentage (%)' : 'Montant (F)'}</label>
              <input type="number" value={reductionGlobale.valeur} onChange={e => setReductionGlobale(p => ({ ...p, valeur: Number(e.target.value) }))} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none' }} />
            </div>
            {reductionGlobale.type === 'quantite' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 8 }}>Quantité minimum</label>
                <input type="number" value={reductionGlobale.quantite_min} onChange={e => setReductionGlobale(p => ({ ...p, quantite_min: Number(e.target.value) }))} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none' }} />
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowReductionGlobale(false)} style={{ flex: 1, padding: '11px', borderRadius: 9, border: '1.5px solid #e5e7eb', background: 'transparent', color: '#888', cursor: 'pointer', fontWeight: 600 }}>Annuler</button>
              <button onClick={supprimerReductionGlobale} disabled={savingReduction} style={{ flex: 1, padding: '11px', borderRadius: 9, border: 'none', background: '#fee2e2', color: '#991b1b', cursor: 'pointer', fontWeight: 600 }}>🗑️ Supprimer</button>
              <button onClick={appliquerReductionGlobale} disabled={savingReduction || !reductionGlobale.valeur} style={{ flex: 2, padding: '11px', borderRadius: 9, border: 'none', background: !reductionGlobale.valeur ? '#e5e7eb' : '#f59e0b', color: !reductionGlobale.valeur ? '#888' : '#1a1a1a', cursor: !reductionGlobale.valeur ? 'not-allowed' : 'pointer', fontWeight: 700 }}>{savingReduction ? '...' : '✅ Appliquer à tous'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DÉTAIL PRODUIT */}
      {produitDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => { setProduitDetail(null); setShowReductionIndiv(false) }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{produitDetail.nom}</h3>
              <button onClick={() => { setProduitDetail(null); setShowReductionIndiv(false) }} style={{ background: '#f0f0f0', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>
            {produitDetail.image_url && (<div style={{ width: '100%', height: 200, background: '#f8f9fa', borderRadius: 12, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}><img src={produitDetail.image_url} alt={produitDetail.nom} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} /></div>)}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              <span style={{ background: '#f0f9ff', color: '#0891b2', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>Réf: {produitDetail.reference}</span>
              {produitDetail.categorie && <span style={{ background: '#f0fdf4', color: '#1D9E75', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>🏷️ {produitDetail.categorie}</span>}
            </div>
            <div style={{ background: '#f8f9fa', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
              {prixReduitDetail ? (<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ fontSize: 14, color: '#aaa', textDecoration: 'line-through' }}>{produitDetail.prix_vente?.toLocaleString('fr-FR')} F</span><span style={{ fontSize: 20, fontWeight: 700, color: '#E24B4A' }}>{prixReduitDetail.toLocaleString('fr-FR')} F</span></div>) : (<span style={{ fontSize: 18, fontWeight: 700, color: '#0891b2' }}>{produitDetail.prix_vente?.toLocaleString('fr-FR')} F</span>)}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <button onClick={() => { setShowReductionIndiv(!showReductionIndiv); setReductionIndiv({ type: produitDetail.reduction_type || 'pourcentage', valeur: produitDetail.reduction_valeur || 0, quantite_min: produitDetail.reduction_quantite_min || 1 }) }} style={{ flex: 1, padding: '9px 12px', borderRadius: 9, border: '1.5px solid #f59e0b', background: '#fffbf0', color: '#92400e', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🏷️ {produitDetail.reduction_type ? 'Modifier réduction' : 'Ajouter réduction'}</button>
              {produitDetail.reduction_type && (<button onClick={supprimerReductionIndiv} style={{ flex: 1, padding: '9px 12px', borderRadius: 9, border: '1.5px solid #fecaca', background: '#fee2e2', color: '#991b1b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🗑️ Supprimer</button>)}
            </div>
            {showReductionIndiv && (<div style={{ background: '#fffbf0', borderRadius: 12, padding: 16, border: '1px solid #fde68a', marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>{[{ id: 'pourcentage', label: '📊 %' }, { id: 'fixe', label: '💰 Fixe' }, { id: 'quantite', label: '📦 Qté' }].map(t => (<button key={t.id} onClick={() => setReductionIndiv(p => ({ ...p, type: t.id }))} style={{ flex: 1, padding: '8px', borderRadius: 8, border: `2px solid ${reductionIndiv.type === t.id ? '#f59e0b' : '#e5e7eb'}`, background: reductionIndiv.type === t.id ? '#fff' : '#f8f9fa', color: reductionIndiv.type === t.id ? '#92400e' : '#555', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{t.label}</button>))}</div>
              <input type="number" value={reductionIndiv.valeur} onChange={e => setReductionIndiv(p => ({ ...p, valeur: Number(e.target.value) }))} placeholder="Valeur" style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', marginBottom: 10 }} />
              <button onClick={appliquerReductionIndiv} disabled={saving || !reductionIndiv.valeur} style={{ width: '100%', padding: '10px', borderRadius: 9, border: 'none', background: !reductionIndiv.valeur ? '#e5e7eb' : '#f59e0b', color: !reductionIndiv.valeur ? '#888' : '#1a1a1a', cursor: !reductionIndiv.valeur ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13 }}>{saving ? '...' : '✅ Appliquer'}</button>
            </div>)}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div style={{ background: '#f0f9ff', borderRadius: 10, padding: '10px 14px' }}><p style={{ margin: 0, fontSize: 11, color: '#888' }}>Stock total</p><p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1D9E75' }}>{getStockProduit(produitDetail.id)} pcs</p></div>
              <div style={{ background: '#f8f9fa', borderRadius: 10, padding: '10px 14px' }}><p style={{ margin: 0, fontSize: 11, color: '#888' }}>Prix achat</p><p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#888' }}>{produitDetail.prix_achat?.toLocaleString('fr-FR')} F</p></div>
            </div>
            <h4 style={{ margin: '0 0 10px', fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Variantes</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {getVariantesProduit(produitDetail.id).map((v: any) => (
                <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: v.quantite <= 3 ? '#fff5f5' : '#f8f9fa', borderRadius: 10, padding: '10px 14px', border: v.quantite <= 3 ? '1px solid #fecaca' : '1px solid #e5e7eb' }}>
                  <div><span style={{ fontSize: 13, fontWeight: 600 }}>Taille {v.taille}</span><span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>— {v.couleur}</span>{v.quantite <= 3 && <span style={{ fontSize: 11, color: '#E24B4A', marginLeft: 6, fontWeight: 600 }}>⚠️</span>}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => ajusterQuantite(v.id, -1)} style={{ width: 28, height: 28, borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#E24B4A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <input type="number" value={ajustements[v.id] !== undefined ? ajustements[v.id] : v.quantite} onChange={e => setAjustements(prev => ({ ...prev, [v.id]: Number(e.target.value) }))} onBlur={() => sauvegarderAjustement(v.id)} min={0} style={{ width: 56, padding: '4px 8px', borderRadius: 8, textAlign: 'center', border: '1.5px solid #0891b2', fontSize: 14, fontWeight: 700, color: v.quantite <= 3 ? '#E24B4A' : '#1D9E75', outline: 'none', background: '#fff' }} />
                    <button onClick={() => ajusterQuantite(v.id, 1)} style={{ width: 28, height: 28, borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    <span style={{ fontSize: 11, color: '#aaa' }}>pcs</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16 }}>
              <button onClick={() => toggleDisponible(produitDetail.id, produitDetail.disponible)} style={{ width: '100%', padding: '11px', borderRadius: 10, cursor: 'pointer', border: 'none', fontWeight: 600, fontSize: 13, background: produitDetail.disponible ? '#fff5f5' : '#f0fdf4', color: produitDetail.disponible ? '#E24B4A' : '#1D9E75' }}>
                {produitDetail.disponible ? '❌ Masquer du catalogue' : '✅ Publier dans catalogue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>
        <div>
          <h1 style={{ color: '#38bdf8', margin: 0, fontSize: '16px', fontWeight: 700 }}>📦 Gestionnaire Stock</h1>
          <p style={{ color: '#94a3b8', margin: '2px 0 0', fontSize: '11px' }}>
            {user?.nom} — {user?.activite === 'ck_design' ? '🎨 CK Design' : user?.activite === 'succes_design' ? '✨ Succès Design' : '🌐 Tous'}
            {isSuperAdmin && <span style={{ marginLeft: 6, background: '#d4a853', color: '#1a1a1a', fontSize: 10, padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>ADMIN</span>}
          </p>
        </div>
        <div style={{ position: 'relative' }}><button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', padding: '8px 14px', fontSize: '18px', cursor: 'pointer', marginRight: 8 }}>☰</button>{menuOpen && (<div style={{ position: 'absolute', top: '110%', right: 0, background: '#fff', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', padding: 8, zIndex: 500, minWidth: 220 }}>{MENU_ITEMS.map(o => (<button key={o.key} onClick={() => { setOnglet(o.key as any); setMenuOpen(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '11px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, background: onglet === o.key ? '#f0f9ff' : 'transparent', color: onglet === o.key ? '#0891b2' : '#333', marginBottom: 2 }}>{o.label}</button>))}<button onClick={() => { setShowReductionGlobale(true); setMenuOpen(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '11px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, background: '#fffbeb', color: '#92400e', marginTop: 4 }}>Reduction globale</button></div>)}</div><button onClick={() => { localStorage.removeItem('ck_user'); window.location.href = '/login' }} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#94a3b8', padding: '6px 12px', fontSize: '11px', cursor: 'pointer' }}>Déconnexion</button>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', padding: '16px 16px 0' }}>
        {[
          { label: 'Total articles', value: totalArticles, color: '#0891b2', bg: '#e0f7fa' },
          { label: 'Références', value: produits.length, color: '#6366f1', bg: '#ede9fe' },
          { label: '🔴 À préparer', value: commandesNouvelles.length, color: commandesNouvelles.length > 0 ? '#E24B4A' : '#1D9E75', bg: commandesNouvelles.length > 0 ? '#fff0f0' : '#f0fdf4' },
          { label: '📦 En préparation', value: commandesEnPrep.length, color: '#7c3aed', bg: '#f5f3ff' },
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
          { key: 'commandes', label: `🔴 Commandes${commandes.length > 0 ? ` (${commandes.length})` : ''}` },
          { key: 'historique', label: `📋 Historique${historique.length > 0 ? ` (${historique.length})` : ''}` },
          { key: 'produits', label: '🏷️ Produits' },
          { key: 'nouveau_produit', label: '➕ Publier' },
          { key: 'approvisionner', label: '🏪 Appro.' },
          { key: 'depenses', label: 'Depenses' },
        ].map(o => (
          <button key={o.key} onClick={() => setOnglet(o.key as any)}
            style={{ flexShrink: 0, padding: '9px 14px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, background: onglet === o.key ? (o.key === 'commandes' ? '#E24B4A' : '#0891b2') : 'transparent', color: onglet === o.key ? '#fff' : '#888' }}>
            {o.label}
          </button>
        ))}
        <button onClick={() => setShowReductionGlobale(true)} style={{ flexShrink: 0, padding: '9px 14px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, background: '#f59e0b', color: '#1a1a1a', marginLeft: 'auto' }}>🏷️ Réduction globale</button>
      </div>

      <div style={{ padding: '16px' }}>
        {success && (<div style={{ background: '#f0fdf4', border: '1px solid #1D9E75', borderRadius: '10px', padding: '12px 16px', color: '#1D9E75', fontSize: '13px', marginBottom: '12px', fontWeight: 600 }}>{success}</div>)}

        {/* ONGLET COMMANDES */}
        {onglet === 'commandes' && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#E24B4A' }}>🔴 Nouvelles commandes</span>
                <span style={{ background: '#fff0f0', border: '1px solid #fecaca', color: '#E24B4A', fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 20 }}>{commandesNouvelles.length}</span>
              </div>
              {commandesNouvelles.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: 12, padding: '24px', textAlign: 'center', color: '#ccc', fontSize: 13, border: '1px solid #e5e7eb' }}>✅ Aucune nouvelle commande</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {commandesNouvelles.map(cmd => (
                    <div key={cmd.id} style={{ background: '#fff', borderRadius: 14, padding: 16, border: '2px solid #fecaca', boxShadow: '0 2px 8px rgba(226,75,74,0.1)', cursor: 'pointer' }} onClick={() => setCommandeDetail(cmd)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div><span style={{ fontSize: 13, fontWeight: 700, color: '#E24B4A', background: '#fff0f0', padding: '3px 10px', borderRadius: 20 }}>#{cmd.id.slice(0, 6).toUpperCase()}</span><span style={{ marginLeft: 8, fontSize: 12, color: '#aaa' }}>{new Date(cmd.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></div>
                        <span style={{ fontSize: 16, fontWeight: 800, color: '#1D9E75' }}>{cmd.montant_total?.toLocaleString('fr-FR')} F</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                        <div><p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{cmd.nom_client || '—'}</p><p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>📱 {cmd.telephone}</p></div>
                        <div><p style={{ margin: 0, fontSize: 12, color: '#0891b2', fontWeight: 600 }}>Réf: {cmd.produit_ref}</p><p style={{ margin: '2px 0 0', fontSize: 12, color: '#555' }}>📐 {cmd.taille} — 🎨 {cmd.variantes}</p></div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); changerStatutCommande(cmd.id, 'en_preparation') }} style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>📦 Prendre en charge</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#7c3aed' }}>📦 En préparation</span>
                <span style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', color: '#7c3aed', fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 20 }}>{commandesEnPrep.length}</span>
              </div>
              {commandesEnPrep.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: 12, padding: '24px', textAlign: 'center', color: '#ccc', fontSize: 13, border: '1px solid #e5e7eb' }}>Aucune commande en préparation</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {commandesEnPrep.map(cmd => (
                    <div key={cmd.id} style={{ background: '#fff', borderRadius: 14, padding: 16, border: '2px solid #ddd6fe', cursor: 'pointer' }} onClick={() => setCommandeDetail(cmd)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div><span style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed', background: '#f5f3ff', padding: '3px 10px', borderRadius: 20 }}>#{cmd.id.slice(0, 6).toUpperCase()}</span><span style={{ marginLeft: 8, fontSize: 12, color: '#aaa' }}>{new Date(cmd.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></div>
                        <span style={{ fontSize: 16, fontWeight: 800, color: '#1D9E75' }}>{cmd.montant_total?.toLocaleString('fr-FR')} F</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                        <div><p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{cmd.nom_client || '—'}</p><p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>📱 {cmd.telephone}</p></div>
                        <div><p style={{ margin: 0, fontSize: 12, color: '#0891b2', fontWeight: 600 }}>Réf: {cmd.produit_ref}</p><p style={{ margin: '2px 0 0', fontSize: 12, color: '#555' }}>📐 {cmd.taille} — 🎨 {cmd.variantes}</p></div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); changerStatutCommande(cmd.id, 'en_livraison') }} style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: '#BA7517', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>🚚 Prête — Envoyer en livraison</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ONGLET HISTORIQUE */}
        {onglet === 'historique' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {[
                { key: 'tous', label: 'Toutes', count: historique.length },
                { key: 'livre', label: '✅ Livrées', count: historique.filter(c => c.statut === 'livre').length },
                { key: 'en_livraison', label: '🚚 En livraison', count: historique.filter(c => c.statut === 'en_livraison').length },
                { key: 'retour', label: '↩️ Retours', count: historique.filter(c => c.statut === 'retour').length },
                { key: 'annule', label: '❌ Annulées', count: historique.filter(c => c.statut === 'annule').length },
              ].map(f => (
                <button key={f.key} onClick={() => setFiltreHistorique(f.key as any)}
                  style={{ padding: '7px 16px', borderRadius: 20, border: `1.5px solid ${filtreHistorique === f.key ? '#0891b2' : '#e5e7eb'}`, background: filtreHistorique === f.key ? '#0891b2' : '#fff', color: filtreHistorique === f.key ? '#fff' : '#555', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  {f.label} ({f.count})
                </button>
              ))}
            </div>
            {historiqueFiltree.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 12, padding: '40px', textAlign: 'center', color: '#ccc', fontSize: 13, border: '1px solid #e5e7eb' }}>Aucune commande dans cet historique</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {historiqueFiltree.map(cmd => {
                  const sc = STATUT_CONFIG[cmd.statut] || STATUT_CONFIG['annule']
                  return (
                    <div key={cmd.id} style={{ background: '#fff', borderRadius: 14, padding: 16, border: `1.5px solid ${sc.border}`, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }} onClick={() => setCommandeDetail(cmd)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: sc.color, background: sc.bg, padding: '3px 10px', borderRadius: 20 }}>#{cmd.id.slice(0, 6).toUpperCase()}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: sc.color }}>{sc.label}</span>
                        </div>
                        <span style={{ fontSize: 15, fontWeight: 800, color: cmd.statut === 'annule' ? '#aaa' : '#1D9E75' }}>{cmd.montant_total?.toLocaleString('fr-FR')} F</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                        <div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{cmd.nom_client || '—'}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>📱 {cmd.telephone}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#aaa' }}>📍 {cmd.adresse}</p>
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: 12, color: '#0891b2', fontWeight: 600 }}>Réf: {cmd.produit_ref}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#555' }}>📐 {cmd.taille} — 🎨 {cmd.variantes}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#aaa' }}>{new Date(cmd.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      {(cmd.statut === 'livre' || cmd.statut === 'en_livraison') && (
                        <button onClick={e => { e.stopPropagation(); traiterRetour(cmd) }}
                          style={{ width: '100%', padding: '9px', borderRadius: 9, border: '1.5px solid #bae6fd', background: '#e0f7fa', color: '#0891b2', fontWeight: 700, fontSize: 12, cursor: 'pointer', marginTop: 4 }}>
                          ↩️ Traiter un retour — Remettre en stock
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ONGLET PRODUITS */}
        {onglet === 'produits' && (
          <div>
            {stockCritique.length > 0 && (
              <div style={{ background: '#fff5f5', border: '1px solid #E24B4A', borderRadius: '10px', padding: '12px 16px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>⚠️</span>
                <p style={{ margin: 0, color: '#E24B4A', fontSize: '13px', fontWeight: 600 }}>{stockCritique.length} variante(s) en stock critique (≤ 3 pièces) !</p>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
              {produits.map((prod: any) => {
                const stockTotal = getStockProduit(prod.id)
                const variantes = getVariantesProduit(prod.id)
                const hasCritique = variantes.some((v: any) => v.quantite <= 3)
                const prixReduit = calculerPrixReduit(prod)
                return (
                  <div key={prod.id} style={{ background: '#fff', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: hasCritique ? '1.5px solid #E24B4A66' : '1.5px solid transparent' }}>
                    <div onClick={() => { setProduitDetail(prod); setShowReductionIndiv(false) }} style={{ cursor: 'pointer' }}>
                      <div style={{ height: '180px', background: '#f8f9fa', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        {prod.image_url ? <img src={prod.image_url} alt={prod.nom} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '6px' }} /> : <div style={{ fontSize: '40px', opacity: 0.2 }}>👗</div>}
                        {prod.reduction_type && <div style={{ position: 'absolute', top: 8, left: 8, background: '#E24B4A', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20 }}>{prod.reduction_type === 'pourcentage' ? `-${prod.reduction_valeur}%` : `-${prod.reduction_valeur?.toLocaleString('fr-FR')} F`}</div>}
                        {isSuperAdmin && <div style={{ position: 'absolute', top: 8, right: 8, background: prod.activite === 'ck_design' ? '#0891b2' : '#d4a853', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>{prod.activite === 'ck_design' ? 'CK' : 'SD'}</div>}
                        <div style={{ position: 'absolute', bottom: 8, right: 8, fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: stockTotal === 0 ? '#E24B4A' : hasCritique ? '#EF9F27' : '#1D9E75', color: '#fff' }}>{stockTotal} pcs</div>
                      </div>
                      <div style={{ padding: '12px 14px 8px' }}>
                        <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '14px' }}>{prod.nom}</p>
                        <p style={{ margin: '0 0 4px', color: '#aaa', fontSize: '11px' }}>Réf: {prod.reference}</p>
                        {prixReduit ? <div><span style={{ fontSize: 12, color: '#aaa', textDecoration: 'line-through', marginRight: 6 }}>{prod.prix_vente?.toLocaleString('fr-FR')} F</span><span style={{ fontSize: 15, fontWeight: 700, color: '#E24B4A' }}>{prixReduit.toLocaleString('fr-FR')} F</span></div> : <p style={{ margin: 0, color: '#0891b2', fontWeight: 700, fontSize: '15px' }}>{prod.prix_vente?.toLocaleString('fr-FR')} F</p>}
                      </div>
                    </div>
                    <div style={{ padding: '6px 14px 12px', display: 'flex', gap: 6 }}>
                      <button onClick={() => ouvrirModification(prod)} style={{ flex: 1, fontSize: '11px', fontWeight: 600, padding: '6px 8px', borderRadius: '8px', cursor: 'pointer', border: '1.5px solid #0891b2', background: '#f0f9ff', color: '#0891b2' }}>✏️ Modifier</button>
                      <button onClick={() => toggleDisponible(prod.id, prod.disponible)} style={{ flex: 1, fontSize: '11px', fontWeight: 600, padding: '6px 8px', borderRadius: '8px', cursor: 'pointer', border: 'none', background: prod.disponible ? '#f0fdf4' : '#fff5f5', color: prod.disponible ? '#1D9E75' : '#E24B4A' }}>{prod.disponible ? '✅ Publié' : '❌ Masqué'}</button><button onClick={() => supprimerProduit(prod.id)} style={{ flex: 1, fontSize: '11px', fontWeight: 600, padding: '6px 8px', borderRadius: '8px', cursor: 'pointer', border: 'none', background: '#fff0f0', color: '#E24B4A' }}>Supprimer</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ONGLET NOUVEAU PRODUIT */}
        {onglet === 'nouveau_produit' && (
          <div style={{ maxWidth: '600px' }}>
            <div style={{ background: '#fff', borderRadius: '14px', padding: '22px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: '16px', color: '#0891b2', fontWeight: 700 }}>➕ Publier un nouveau produit</h3>
              <p style={{ margin: '0 0 20px', fontSize: '12px', color: '#aaa' }}>Ce produit sera visible dans le catalogue client.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div><label style={labelStyle}>Nom *</label><input value={prodForm.nom} onChange={e => setProdForm(p => ({ ...p, nom: e.target.value }))} placeholder="Ex: Robe Wax" style={inputStyle} /></div>
                <div><label style={labelStyle}>Référence <span style={{ color: '#0891b2', fontWeight: 400 }}>(auto)</span></label><input value={prodForm.reference} readOnly style={{ ...inputStyle, background: '#e8f4fd', border: '1.5px solid #bae6fd', color: '#0891b2', fontWeight: 600 }} /></div>
                <div><label style={labelStyle}>Prix de vente (F) *</label><input type="number" value={prodForm.prix_vente} onChange={e => setProdForm(p => ({ ...p, prix_vente: Number(e.target.value) }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>Prix d'achat (F)</label><input type="number" value={prodForm.prix_achat} onChange={e => setProdForm(p => ({ ...p, prix_achat: Number(e.target.value) }))} style={inputStyle} /></div>
                {isSuperAdmin && <div><label style={labelStyle}>Activité</label><select value={prodForm.activite} onChange={e => setProdForm(p => ({ ...p, activite: e.target.value, categorie: '', reference: '' }))} style={inputStyle}><option value="ck_design">🎨 CK Design</option><option value="succes_design">✨ Succès Design</option></select></div>}
                <div><label style={labelStyle}>Catégorie *</label><select value={prodForm.categorie} onChange={e => setProdForm(p => ({ ...p, categorie: e.target.value }))} style={inputStyle}><option value="">Choisir une catégorie...</option>{categoriesFiltrees.map((c: any) => <option key={c.id} value={c.nom}>{c.nom}</option>)}</select></div>
              </div>
              <div style={{ marginBottom: '12px' }}><label style={labelStyle}>Description</label><textarea value={prodForm.description} onChange={e => setProdForm(p => ({ ...p, description: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' as const }} /></div>
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>📷 Photo principale</label>
                <input type="file" accept="image/*" ref={fileRef} onChange={async e => { const file = e.target.files?.[0]; if (file) { const preview = URL.createObjectURL(file); setProdForm(p => ({ ...p, preview })); const comp = await compressImage(file); setProdForm(p => ({ ...p, image_file: comp })) } }} style={{ display: 'none' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button onClick={() => fileRef.current?.click()} style={{ padding: '10px 16px', borderRadius: '9px', border: '1.5px dashed #0891b2', background: '#f0f9ff', color: '#0891b2', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>📷 Choisir une photo</button>
                  {prodForm.preview && <div style={{ width: 80, height: 80, background: '#f8f9fa', borderRadius: 9, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img src={prodForm.preview} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>}
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={labelStyle}>COULEURS & TAILLES</label>
                  <button onClick={() => setCouleurs(prev => [...prev, nouvelleCouleur(tailles)])} style={{ background: '#f0f9ff', color: '#0891b2', border: '1px solid #0891b244', borderRadius: '8px', padding: '5px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>+ Couleur</button>
                </div>
                {tailles.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    {taillesAdulte.length > 0 && <div style={{ marginBottom: 6 }}><span style={{ fontSize: 11, color: '#888', fontWeight: 600, marginRight: 8 }}>👕 Adulte :</span>{taillesAdulte.map(t => <span key={t} style={{ fontSize: 11, background: '#e0f7fa', color: '#0891b2', padding: '2px 8px', borderRadius: 20, marginRight: 4, fontWeight: 600 }}>{t}</span>)}</div>}
                    {taillesEnfant.length > 0 && <div><span style={{ fontSize: 11, color: '#888', fontWeight: 600, marginRight: 8 }}>👶 Enfant :</span>{taillesEnfant.map(t => <span key={t} style={{ fontSize: 11, background: '#f0fdf4', color: '#1D9E75', padding: '2px 8px', borderRadius: 20, marginRight: 4, fontWeight: 600 }}>{t}</span>)}</div>}
                  </div>
                )}
                {couleurs.map((c, ci) => (
                  <div key={ci} style={{ background: '#f8f9fa', borderRadius: '12px', padding: '14px', marginBottom: '10px', border: '1px solid #eee' }}>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                      <input value={c.couleur} onChange={e => updateCouleur(ci, 'couleur', e.target.value)} placeholder="Nom couleur" style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', background: '#fff', border: '1.5px solid #e5e5e5', color: '#1a1a1a', fontSize: '13px', outline: 'none' }} />
                      <button onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = async (e: any) => { const file = e.target.files?.[0]; if (file) { updateCouleur(ci, 'preview', URL.createObjectURL(file)); const comp = await compressImage(file); updateCouleur(ci, 'image_file', comp) } }; input.click() }} style={{ padding: '8px 12px', borderRadius: '8px', border: '1.5px dashed #0891b2', background: '#f0f9ff', color: '#0891b2', fontSize: '12px', cursor: 'pointer' }}>📷</button>
                      {c.preview && <div style={{ width: 38, height: 38, background: '#f8f9fa', borderRadius: 8, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img src={c.preview} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>}
                      {couleurs.length > 1 && <button onClick={() => setCouleurs(prev => prev.filter((_, i) => i !== ci))} style={{ background: '#fff5f5', color: '#E24B4A', border: 'none', borderRadius: '8px', padding: '7px 11px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>✕</button>}
                    </div>
                    {taillesAdulte.length > 0 && (<div style={{ marginBottom: 8 }}><p style={{ margin: '0 0 6px', fontSize: 11, color: '#888', fontWeight: 600 }}>👕 Adulte</p><div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>{c.tailles.filter(t => !t.taille.includes('mois') && !t.taille.includes('an') && !t.taille.includes('ans')).map(t => { const realTi = c.tailles.findIndex(x => x.taille === t.taille); return <div key={t.taille} onClick={() => updateTailleCouleur(ci, realTi, 'active', !t.active)} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', background: t.active ? '#0891b2' : '#fff', border: `1.5px solid ${t.active ? '#0891b2' : '#e5e5e5'}`, borderRadius: '8px', padding: '5px 9px' }}><span style={{ fontSize: '12px', fontWeight: 700, color: t.active ? 'white' : '#888' }}>{t.taille}</span>{t.active && <input type="number" value={t.quantite} min={0} onClick={e => e.stopPropagation()} onChange={e => updateTailleCouleur(ci, realTi, 'quantite', Number(e.target.value))} style={{ width: '40px', padding: '1px 4px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.4)', background: 'transparent', color: 'white', fontSize: '11px', textAlign: 'center', outline: 'none' }} />}</div> })}</div></div>)}
                    {taillesEnfant.length > 0 && (<div><p style={{ margin: '0 0 6px', fontSize: 11, color: '#888', fontWeight: 600 }}>👶 Enfant</p><div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>{c.tailles.filter(t => t.taille.includes('mois') || t.taille.includes('an') || t.taille.includes('ans')).map(t => { const realTi = c.tailles.findIndex(x => x.taille === t.taille); return <div key={t.taille} onClick={() => updateTailleCouleur(ci, realTi, 'active', !t.active)} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', background: t.active ? '#1D9E75' : '#fff', border: `1.5px solid ${t.active ? '#1D9E75' : '#e5e5e5'}`, borderRadius: '8px', padding: '5px 9px' }}><span style={{ fontSize: '12px', fontWeight: 700, color: t.active ? 'white' : '#888' }}>{t.taille}</span>{t.active && <input type="number" value={t.quantite} min={0} onClick={e => e.stopPropagation()} onChange={e => updateTailleCouleur(ci, realTi, 'quantite', Number(e.target.value))} style={{ width: '40px', padding: '1px 4px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.4)', background: 'transparent', color: 'white', fontSize: '11px', textAlign: 'center', outline: 'none' }} />}</div> })}</div></div>)}
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 20, background: '#fffbf0', borderRadius: 12, padding: 16, border: '1px solid #fde68a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: prodForm.reduction_type ? 12 : 0 }}>
                  <label style={{ color: '#92400e', fontSize: '13px', fontWeight: 700 }}>🏷️ Réduction (optionnel)</label>
                  <button onClick={() => setProdForm(p => ({ ...p, reduction_type: p.reduction_type ? null : 'pourcentage', reduction_valeur: 0, reduction_quantite_min: 1 }))} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, border: 'none', background: prodForm.reduction_type ? '#fee2e2' : '#f0fdf4', color: prodForm.reduction_type ? '#991b1b' : '#1D9E75', cursor: 'pointer', fontWeight: 600 }}>{prodForm.reduction_type ? '✕ Supprimer' : '+ Ajouter'}</button>
                </div>
                {prodForm.reduction_type && (<><div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>{[{ id: 'pourcentage', label: '📊 %' }, { id: 'fixe', label: '💰 Fixe' }, { id: 'quantite', label: '📦 Qté' }].map(t => (<button key={t.id} onClick={() => setProdForm(p => ({ ...p, reduction_type: t.id }))} style={{ flex: 1, padding: '8px', borderRadius: 8, border: `2px solid ${prodForm.reduction_type === t.id ? '#f59e0b' : '#e5e7eb'}`, background: prodForm.reduction_type === t.id ? '#fff' : '#f8f9fa', color: prodForm.reduction_type === t.id ? '#92400e' : '#555', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{t.label}</button>))}</div><input type="number" value={prodForm.reduction_valeur || 0} onChange={e => setProdForm(p => ({ ...p, reduction_valeur: Number(e.target.value) }))} placeholder={prodForm.reduction_type === 'pourcentage' ? 'Ex: 10 pour 10%' : 'Ex: 500 F'} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', marginBottom: 10 }} /></>)}
              </div>
              <button onClick={publierProduit} disabled={saving} style={{ width: '100%', padding: '14px', borderRadius: '10px', background: '#0891b2', border: 'none', color: 'white', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: '15px', opacity: saving ? 0.85 : 1 }}>{saving ? (savingProgress || '⏳ Publication...') : '🚀 Publier le produit'}</button>
            </div>
          </div>
        )}

        {/* ONGLET APPROVISIONNER */}
        {onglet === 'approvisionner' && (
          <div style={{ background: '#fff', borderRadius: '14px', padding: '22px', maxWidth: '500px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
            <h3 style={{ margin: '0 0 18px', fontSize: '16px', color: '#0891b2', fontWeight: 700 }}>🏪 Approvisionner une boutique</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div><label style={labelStyle}>Boutique *</label><select value={approForm.boutique_id} onChange={e => setApproForm(p => ({ ...p, boutique_id: e.target.value }))} style={inputStyle}><option value="">Choisir une boutique...</option>{boutiques.map((b: any) => <option key={b.id} value={b.id}>{b.nom} — {b.lieu}</option>)}</select></div>
              <div><label style={labelStyle}>Produit *</label><select value={approForm.nom_produit} onChange={e => { const prod = produits.find((p: any) => p.nom === e.target.value); setApproForm(p => ({ ...p, nom_produit: e.target.value, prix_vente: prod?.prix_vente || 0 })) }} style={inputStyle}><option value="">Choisir un produit...</option>{produits.map((p: any) => <option key={p.id} value={p.nom}>{p.nom}</option>)}</select></div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}><label style={labelStyle}>Taille</label><select value={approForm.taille} onChange={e => setApproForm(p => ({ ...p, taille: e.target.value }))} style={inputStyle}><option value="">Choisir...</option>{tailles.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <div style={{ flex: 1 }}><label style={labelStyle}>Couleur</label><input value={approForm.couleur} onChange={e => setApproForm(p => ({ ...p, couleur: e.target.value }))} placeholder="Ex: Noir" style={inputStyle} /></div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}><label style={labelStyle}>Quantité</label><input type="number" min={1} value={approForm.quantite} onChange={e => setApproForm(p => ({ ...p, quantite: Number(e.target.value) }))} style={inputStyle} /></div>
                <div style={{ flex: 1 }}><label style={labelStyle}>Prix vente boutique</label><input type="number" value={approForm.prix_vente} onChange={e => setApproForm(p => ({ ...p, prix_vente: Number(e.target.value) }))} style={inputStyle} /></div>
              </div>
              <button onClick={approvisionnerBoutique} disabled={saving} style={{ width: '100%', padding: '13px', borderRadius: '10px', background: '#0891b2', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}>{saving ? '...' : '✅ Approvisionner'}</button>
            </div>
          </div>
        )}
        {onglet === 'depenses' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button onClick={() => { setSousOngletDep('generale'); fetchDepenses() }} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: sousOngletDep === 'generale' ? '#0891b2' : '#f0f0f0', color: sousOngletDep === 'generale' ? '#fff' : '#555', fontWeight: 700, cursor: 'pointer' }}>Depense generale</button>
              <button onClick={() => { setSousOngletDep('achat'); fetchDepenses() }} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: sousOngletDep === 'achat' ? '#d4a853' : '#f0f0f0', color: sousOngletDep === 'achat' ? '#fff' : '#555', fontWeight: 700, cursor: 'pointer' }}>Achat fournisseur</button>
            </div>
            <div style={{ background: '#fff', borderRadius: 14, padding: 20, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
              {sousOngletDep === 'generale' ? (<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}><div><label style={labelStyle}>Categorie</label><select value={depForm.categorie} onChange={e => setDepForm(p => ({ ...p, categorie: e.target.value }))} style={inputStyle}><option value=''>Choisir...</option><option value='Loyer'>Loyer</option><option value='Transport'>Transport</option><option value='Salaire'>Salaire</option><option value='Communication'>Communication</option><option value='Fournitures'>Fournitures</option><option value='Autre'>Autre</option></select></div><div><label style={labelStyle}>Description</label><input value={depForm.libelle} onChange={e => setDepForm(p => ({ ...p, libelle: e.target.value }))} placeholder='Ex: Loyer boutique' style={inputStyle} /></div><div><label style={labelStyle}>Montant (F)</label><input type='number' value={depForm.montant} onChange={e => setDepForm(p => ({ ...p, montant: Number(e.target.value) }))} style={inputStyle} /></div><div><label style={labelStyle}>Date</label><input type='date' value={depForm.date_depense} onChange={e => setDepForm(p => ({ ...p, date_depense: e.target.value }))} style={inputStyle} /></div></div>) : (<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}><div><label style={labelStyle}>Fournisseur</label><input value={depForm.fournisseur} onChange={e => setDepForm(p => ({ ...p, fournisseur: e.target.value }))} placeholder='Ex: Grossiste Treichville' style={inputStyle} /></div><div><label style={labelStyle}>Produit</label><input value={depForm.libelle} onChange={e => setDepForm(p => ({ ...p, libelle: e.target.value }))} placeholder='Ex: Polo homme' style={inputStyle} /></div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><div><label style={labelStyle}>Quantite</label><input type='number' value={depForm.quantite} onChange={e => setDepForm(p => ({ ...p, quantite: Number(e.target.value) }))} style={inputStyle} /></div><div><label style={labelStyle}>Prix unitaire (F)</label><input type='number' value={depForm.prix_unitaire} onChange={e => setDepForm(p => ({ ...p, prix_unitaire: Number(e.target.value), montant: Number(e.target.value) * depForm.quantite }))} style={inputStyle} /></div></div><div style={{ background: '#f0fdf4', borderRadius: 10, padding: '10px 14px' }}><p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1D9E75' }}>Total: {(depForm.quantite * depForm.prix_unitaire).toLocaleString('fr-FR')} F</p></div><div><label style={labelStyle}>Date</label><input type='date' value={depForm.date_depense} onChange={e => setDepForm(p => ({ ...p, date_depense: e.target.value }))} style={inputStyle} /></div></div>)}
              <button onClick={ajouterDepense} disabled={saving} style={{ width: '100%', marginTop: 16, padding: '13px', borderRadius: 10, border: 'none', background: saving ? '#aaa' : '#0891b2', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>{saving ? '...' : 'Enregistrer'}</button>
            </div>
            <div style={{ background: '#fff', borderRadius: 14, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}><h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Historique depenses</h3><button onClick={fetchDepenses} style={{ background: '#f0f0f0', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>Actualiser</button></div>
              <div style={{ marginBottom: 12, background: '#f0fdf4', borderRadius: 10, padding: '10px 14px' }}><p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1D9E75' }}>Total ce mois: {depenses2.filter(d => new Date(d.date_depense).getMonth() === new Date().getMonth()).reduce((s, d) => s + (d.montant || 0), 0).toLocaleString('fr-FR')} F</p></div>
              {depenses2.length === 0 ? <p style={{ textAlign: 'center', color: '#aaa', fontSize: 13, padding: 20 }}>Aucune depense. Cliquez Actualiser.</p> : depenses2.map((d: any) => (<div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}><div><p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{d.libelle}</p><p style={{ margin: 0, fontSize: 11, color: '#888' }}>{d.categorie} - {d.date_depense}</p></div><span style={{ fontSize: 14, fontWeight: 700, color: '#E24B4A' }}>{d.montant?.toLocaleString('fr-FR')} F</span></div>))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}







