'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Parametres() {
  const [onglet, setOnglet] = useState('livreurs')
  const [livreurs, setLivreurs] = useState<any[]>([])
  const [zones, setZones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState('')

  // Formulaire livreur
  const [nomLivreur, setNomLivreur] = useState('')
  const [telLivreur, setTelLivreur] = useState('')
  const [zoneLivreur, setZoneLivreur] = useState('')
  const [mdpLivreur, setMdpLivreur] = useState('')
  const [savingLivreur, setSavingLivreur] = useState(false)

  // Formulaire zone
  const [nomZone, setNomZone] = useState('')
  const [savingZone, setSavingZone] = useState(false)

  // Edit livreur
  const [editLivreur, setEditLivreur] = useState<any>(null)
  const [editZone, setEditZone] = useState('')

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data: livs } = await supabase
      .from('utilisateurs')
      .select('*')
      .eq('role', 'livreur')
      .order('nom')

    const { data: zns } = await supabase
      .from('zones')
      .select('*')
      .order('nom')

    setLivreurs(livs || [])
    setZones(zns || [])
    setLoading(false)
  }

  async function ajouterLivreur() {
    if (!nomLivreur || !telLivreur || !mdpLivreur) return alert('Nom, téléphone et mot de passe obligatoires !')
    setSavingLivreur(true)

    const { error } = await supabase.from('utilisateurs').insert({
      nom: nomLivreur,
      telephone: telLivreur,
      zone: zoneLivreur || null,
      mot_de_passe: mdpLivreur,
      role: 'livreur',
      email: telLivreur + '@ckdress.ci',
      actif: true
    })

    if (error) {
      alert('Erreur : ' + error.message)
    } else {
      setSuccess('✅ Livreur ajouté !')
      setNomLivreur(''); setTelLivreur(''); setZoneLivreur(''); setMdpLivreur('')
      fetchData()
      setTimeout(() => setSuccess(''), 3000)
    }
    setSavingLivreur(false)
  }

  async function updateLivreur() {
    if (!editLivreur) return
    const { error } = await supabase
      .from('utilisateurs')
      .update({ nom: editLivreur.nom, telephone: editLivreur.telephone, zone: editZone || null, actif: editLivreur.actif })
      .eq('id', editLivreur.id)

    if (error) {
      alert('Erreur : ' + error.message)
    } else {
      setSuccess('✅ Livreur mis à jour !')
      setEditLivreur(null)
      fetchData()
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  async function toggleActif(id: string, actif: boolean) {
    await supabase.from('utilisateurs').update({ actif: !actif }).eq('id', id)
    fetchData()
  }

  async function ajouterZone() {
    if (!nomZone) return alert('Entrez le nom de la zone !')
    setSavingZone(true)
    const { error } = await supabase.from('zones').insert({ nom: nomZone })
    if (error) {
      alert('Cette zone existe déjà !')
    } else {
      setSuccess('✅ Zone ajoutée !')
      setNomZone('')
      fetchData()
      setTimeout(() => setSuccess(''), 3000)
    }
    setSavingZone(false)
  }

  async function supprimerZone(id: string) {
    if (!confirm('Supprimer cette zone ?')) return
    await supabase.from('zones').delete().eq('id', id)
    fetchData()
  }

  const inputStyle: any = {
    width: '100%', padding: '10px', borderRadius: '8px',
    border: '1px solid #333', background: '#1a1a1a',
    color: 'white', fontSize: '13px', boxSizing: 'border-box',
    fontFamily: 'sans-serif'
  }

  const tabStyle = (t: string) => ({
    padding: '8px 18px', borderRadius: '8px', cursor: 'pointer',
    fontSize: '13px', fontWeight: '500' as any, border: 'none',
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
          <a href="/livraisons" style={{ color: '#666', fontSize: '13px', textDecoration: 'none' }}>Livraisons</a>
          <a href="/reporting" style={{ color: '#666', fontSize: '13px', textDecoration: 'none' }}>Reporting</a>
        </div>
      </div>

      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 4px' }}>Paramètres</h2>
          <div style={{ color: '#666', fontSize: '13px' }}>Gérez les livreurs, zones et configuration</div>
        </div>

        {/* ONGLETS */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <button style={tabStyle('livreurs')} onClick={() => setOnglet('livreurs')}>👤 Livreurs</button>
          <button style={tabStyle('zones')} onClick={() => setOnglet('zones')}>📍 Zones</button>
        </div>

        {success && (
          <div style={{ background: '#0a2a1a', border: '1px solid #1D9E75', borderRadius: '8px', padding: '10px 16px', color: '#1D9E75', fontSize: '13px', marginBottom: '16px' }}>
            {success}
          </div>
        )}

        {/* ONGLET LIVREURS */}
        {onglet === 'livreurs' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>

            {/* FORMULAIRE AJOUT */}
            <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ fontSize: '13px', color: '#888', margin: '0 0 16px', textTransform: 'uppercase' }}>
                {editLivreur ? `Modifier — ${editLivreur.nom}` : 'Ajouter un livreur'}
              </h3>

              {editLivreur ? (
                <>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ color: '#666', fontSize: '11px', display: 'block', marginBottom: '4px' }}>Nom</label>
                    <input style={inputStyle} value={editLivreur.nom} onChange={e => setEditLivreur({ ...editLivreur, nom: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ color: '#666', fontSize: '11px', display: 'block', marginBottom: '4px' }}>Téléphone</label>
                    <input style={inputStyle} value={editLivreur.telephone || ''} onChange={e => setEditLivreur({ ...editLivreur, telephone: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ color: '#666', fontSize: '11px', display: 'block', marginBottom: '4px' }}>Zone principale</label>
                    <select style={inputStyle} value={editZone} onChange={e => setEditZone(e.target.value)}>
                      <option value="">Aucune zone</option>
                      {zones.map(z => <option key={z.id} value={z.nom}>{z.nom}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setEditLivreur(null)} style={{ flex: 1, background: 'none', border: '1px solid #333', color: '#888', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                      Annuler
                    </button>
                    <button onClick={updateLivreur} style={{ flex: 2, background: '#1D9E75', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                      Enregistrer
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ color: '#666', fontSize: '11px', display: 'block', marginBottom: '4px' }}>Nom complet *</label>
                    <input style={inputStyle} value={nomLivreur} onChange={e => setNomLivreur(e.target.value)} placeholder="Ex: Koné Bakary" />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ color: '#666', fontSize: '11px', display: 'block', marginBottom: '4px' }}>Téléphone *</label>
                    <input style={inputStyle} value={telLivreur} onChange={e => setTelLivreur(e.target.value)} placeholder="0707000000" />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ color: '#666', fontSize: '11px', display: 'block', marginBottom: '4px' }}>Zone principale</label>
                    <select style={inputStyle} value={zoneLivreur} onChange={e => setZoneLivreur(e.target.value)}>
                      <option value="">Choisir une zone...</option>
                      {zones.map(z => <option key={z.id} value={z.nom}>{z.nom}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ color: '#666', fontSize: '11px', display: 'block', marginBottom: '4px' }}>Mot de passe *</label>
                    <input style={inputStyle} value={mdpLivreur} onChange={e => setMdpLivreur(e.target.value)} placeholder="Minimum 4 caractères" type="password" />
                  </div>
                  <button onClick={ajouterLivreur} disabled={savingLivreur}
                    style={{ width: '100%', background: '#1D9E75', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                    {savingLivreur ? 'Ajout...' : '+ Ajouter le livreur'}
                  </button>
                </>
              )}
            </div>

            {/* LISTE LIVREURS */}
            <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ fontSize: '13px', color: '#888', margin: '0 0 16px', textTransform: 'uppercase' }}>
                Livreurs enregistrés ({livreurs.length})
              </h3>
              {loading ? (
                <div style={{ color: '#555', textAlign: 'center', padding: '30px' }}>Chargement...</div>
              ) : livreurs.length === 0 ? (
                <div style={{ color: '#555', textAlign: 'center', padding: '30px' }}>Aucun livreur enregistré</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #222' }}>
                      {['Nom', 'Téléphone', 'Zone', 'Statut', 'Actions'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px', color: '#555', fontWeight: '500' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {livreurs.map((l, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #1a1a1a' }}>
                        <td style={{ padding: '12px 8px', fontWeight: '500' }}>{l.nom}</td>
                        <td style={{ padding: '12px 8px', color: '#888' }}>{l.telephone || '—'}</td>
                        <td style={{ padding: '12px 8px' }}>
                          {l.zone ? (
                            <span style={{ background: '#1D9E7522', color: '#1D9E75', padding: '2px 8px', borderRadius: '8px', fontSize: '11px' }}>
                              📍 {l.zone}
                            </span>
                          ) : (
                            <span style={{ color: '#555', fontSize: '11px' }}>Non définie</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <span style={{ background: l.actif ? '#1D9E7522' : '#E24B4A22', color: l.actif ? '#1D9E75' : '#E24B4A', padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '600' }}>
                            {l.actif ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => { setEditLivreur(l); setEditZone(l.zone || '') }}
                              style={{ background: '#1a1a1a', border: '1px solid #333', color: '#888', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>
                              ✏️ Modifier
                            </button>
                            <button onClick={() => toggleActif(l.id, l.actif)}
                              style={{ background: l.actif ? '#2a0a0a' : '#0a2a1a', border: `1px solid ${l.actif ? '#E24B4A44' : '#1D9E7544'}`, color: l.actif ? '#E24B4A' : '#1D9E75', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>
                              {l.actif ? '⏸ Désactiver' : '▶ Activer'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ONGLET ZONES */}
        {onglet === 'zones' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
            <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ fontSize: '13px', color: '#888', margin: '0 0 16px', textTransform: 'uppercase' }}>Ajouter une zone</h3>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#666', fontSize: '11px', display: 'block', marginBottom: '4px' }}>Nom de la zone *</label>
                <input style={inputStyle} value={nomZone} onChange={e => setNomZone(e.target.value)} placeholder="Ex: Bingerville" onKeyDown={e => e.key === 'Enter' && ajouterZone()} />
              </div>
              <button onClick={ajouterZone} disabled={savingZone}
                style={{ width: '100%', background: '#1D9E75', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                {savingZone ? 'Ajout...' : '+ Ajouter la zone'}
              </button>
            </div>

            <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ fontSize: '13px', color: '#888', margin: '0 0 16px', textTransform: 'uppercase' }}>
                Zones de livraison ({zones.length})
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
                {zones.map((z, i) => (
                  <div key={i} style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: '10px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '500' }}>📍 {z.nom}</div>
                      <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>
                        {livreurs.filter(l => l.zone === z.nom).length} livreur(s)
                      </div>
                    </div>
                    <button onClick={() => supprimerZone(z.id)}
                      style={{ background: 'none', border: 'none', color: '#E24B4A', cursor: 'pointer', fontSize: '14px', padding: '4px' }}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}