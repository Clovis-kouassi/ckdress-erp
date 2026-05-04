'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LandingPage() {
  const [produits, setProduits] = useState<any[]>([])
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    fetchProduits()
  }, [])

  const fetchProduits = async () => {
    const { data } = await supabase
      .from('produits')
      .select('*')
      .eq('disponible', true)
      .limit(6)
    setProduits(data || [])
  }

  const whatsapp = '2250555303010'
  const msgWhatsapp = encodeURIComponent('Bonjour CK Dress ! Je souhaite passer une commande.')

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: '#fff', color: '#111', minHeight: '100vh' }}>

      {/* NAVBAR */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #e5e5e5', padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-1px', color: '#111' }}>CK</span>
          <span style={{ fontSize: '22px', fontWeight: 300, color: '#555' }}>DRESS</span>
        </div>
        <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          {['Accueil', 'Collection', 'Contact'].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`} style={{ color: '#555', textDecoration: 'none', fontSize: '14px', fontWeight: 500, letterSpacing: '0.5px' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#111')}
              onMouseLeave={e => (e.currentTarget.style.color = '#555')}
            >{item}</a>
          ))}
          <a href={`https://wa.me/${whatsapp}?text=${msgWhatsapp}`} target="_blank"
            style={{ background: '#111', color: 'white', padding: '10px 20px', borderRadius: '4px', textDecoration: 'none', fontSize: '13px', fontWeight: 600, letterSpacing: '0.5px' }}>
            Commander
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section id="accueil" style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        paddingTop: '64px', background: 'linear-gradient(135deg, #f8f8f8 0%, #fff 50%, #f0f0f0 100%)',
        position: 'relative', overflow: 'hidden'
      }}>
        {/* Cercles décoratifs */}
        <div style={{ position: 'absolute', top: '10%', right: '10%', width: '300px', height: '300px', borderRadius: '50%', border: '1px solid #e0e0e0' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '5%', width: '200px', height: '200px', borderRadius: '50%', border: '1px solid #e0e0e0' }} />

        <div style={{ textAlign: 'center', maxWidth: '700px', padding: '0 24px', position: 'relative', zIndex: 1 }}>
          <p style={{ color: '#888', fontSize: '13px', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px' }}>
            Collection Garçon — Abidjan
          </p>
          <h1 style={{ fontSize: 'clamp(40px, 8vw, 80px)', fontWeight: 800, lineHeight: 1.1, margin: '0 0 24px', letterSpacing: '-2px' }}>
            Style &amp;<br />
            <span style={{ color: '#555', fontWeight: 300 }}>Élégance</span>
          </h1>
          <p style={{ color: '#666', fontSize: '17px', lineHeight: 1.7, marginBottom: '40px', maxWidth: '500px', margin: '0 auto 40px' }}>
            Découvrez la collection CK Dress — des vêtements pour garçons alliant style moderne et confort au quotidien.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="#collection" style={{ background: '#111', color: 'white', padding: '16px 36px', borderRadius: '4px', textDecoration: 'none', fontSize: '14px', fontWeight: 600, letterSpacing: '1px' }}>
              VOIR LA COLLECTION
            </a>
            <a href={`https://wa.me/${whatsapp}?text=${msgWhatsapp}`} target="_blank"
              style={{ background: 'transparent', color: '#111', padding: '16px 36px', borderRadius: '4px', textDecoration: 'none', fontSize: '14px', fontWeight: 600, letterSpacing: '1px', border: '1px solid #111' }}>
              COMMANDER
            </a>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: '80px 24px', background: '#111', color: 'white' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '40px', textAlign: 'center' }}>
          {[
            { icon: '🚚', title: 'Livraison rapide', desc: 'Livraison en 48h à Abidjan' },
            { icon: '✂️', title: 'Qualité premium', desc: 'Matières soigneusement sélectionnées' },
            { icon: '💬', title: 'Commande facile', desc: 'Via WhatsApp en quelques secondes' },
            { icon: '↩️', title: 'Satisfaction garantie', desc: 'Échange possible sous 7 jours' },
          ].map((f, i) => (
            <div key={i}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>{f.icon}</div>
              <h3 style={{ color: 'white', margin: '0 0 8px', fontSize: '16px', fontWeight: 600 }}>{f.title}</h3>
              <p style={{ color: '#888', margin: 0, fontSize: '14px', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* COLLECTION */}
      <section id="collection" style={{ padding: '100px 24px', background: '#fff' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <p style={{ color: '#888', fontSize: '12px', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '12px' }}>Notre sélection</p>
            <h2 style={{ fontSize: '42px', fontWeight: 800, margin: 0, letterSpacing: '-1px' }}>Collection Garçon</h2>
          </div>

          {produits.length === 0 ? (
            /* Produits placeholder si pas encore de données */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
              {[
                { nom: 'Chemise Classique', prix: '8500', tag: 'Nouveau' },
                { nom: 'Pantalon Slim', prix: '12000', tag: 'Populaire' },
                { nom: 'Ensemble Casual', prix: '18500', tag: 'Bestseller' },
                { nom: 'Polo Premium', prix: '7500', tag: 'Nouveau' },
                { nom: 'Short Élégant', prix: '6000', tag: '' },
                { nom: 'Veste Légère', prix: '22000', tag: 'Exclusif' },
              ].map((p, i) => (
                <div key={i} style={{ background: '#f8f8f8', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-4px)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  <div style={{ height: '280px', background: `hsl(${i * 40}, 5%, ${85 + i * 2}%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <span style={{ fontSize: '48px' }}>👕</span>
                    {p.tag && (
                      <span style={{ position: 'absolute', top: '16px', left: '16px', background: '#111', color: 'white', fontSize: '11px', padding: '4px 10px', borderRadius: '2px', fontWeight: 600, letterSpacing: '1px' }}>
                        {p.tag}
                      </span>
                    )}
                  </div>
                  <div style={{ padding: '20px' }}>
                    <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 600 }}>{p.nom}</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '18px', fontWeight: 700 }}>{parseInt(p.prix).toLocaleString()} F</span>
                      <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Bonjour ! Je veux commander: ${p.nom}`)}`} target="_blank"
                        style={{ background: '#111', color: 'white', padding: '8px 16px', borderRadius: '4px', textDecoration: 'none', fontSize: '12px', fontWeight: 600 }}>
                        Commander
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Vrais produits depuis Supabase */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
              {produits.map((produit, i) => (
                <div key={produit.id} style={{ background: '#f8f8f8', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-4px)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  <div style={{ height: '280px', background: '#f0f0f0', overflow: 'hidden', position: 'relative' }}>
                    {produit.image_url ? (
                      <img src={produit.image_url} alt={produit.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '48px' }}>👕</span>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '20px' }}>
                    <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 600 }}>{produit.nom}</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '18px', fontWeight: 700 }}>{produit.prix?.toLocaleString()} F</span>
                      <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Bonjour ! Je veux commander: ${produit.nom}`)}`} target="_blank"
                        style={{ background: '#111', color: 'white', padding: '8px 16px', borderRadius: '4px', textDecoration: 'none', fontSize: '12px', fontWeight: 600 }}>
                        Commander
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '48px' }}>
            <a href="/catalogue" style={{ border: '1px solid #111', color: '#111', padding: '14px 40px', borderRadius: '4px', textDecoration: 'none', fontSize: '14px', fontWeight: 600, letterSpacing: '1px' }}>
              VOIR TOUT LE CATALOGUE →
            </a>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" style={{ padding: '100px 24px', background: '#f8f8f8' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: '#888', fontSize: '12px', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '12px' }}>Nous contacter</p>
          <h2 style={{ fontSize: '42px', fontWeight: 800, margin: '0 0 16px', letterSpacing: '-1px' }}>Parlons-nous</h2>
          <p style={{ color: '#666', fontSize: '17px', lineHeight: 1.7, marginBottom: '48px' }}>
            Vous avez une question ? Vous souhaitez passer commande ?<br />
            Contactez-nous directement sur WhatsApp !
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '48px' }}>
            {[
              { icon: '📍', title: 'Localisation', value: 'Abidjan, Côte d\'Ivoire' },
              { icon: '📱', title: 'WhatsApp', value: '+225 05 55 30 30 10' },
              { icon: '🕐', title: 'Horaires', value: 'Lun–Sam, 8h–20h' },
            ].map((c, i) => (
              <div key={i} style={{ background: 'white', padding: '28px 20px', borderRadius: '8px', border: '1px solid #e5e5e5' }}>
                <div style={{ fontSize: '28px', marginBottom: '12px' }}>{c.icon}</div>
                <h4 style={{ margin: '0 0 6px', fontSize: '13px', color: '#888', letterSpacing: '1px', textTransform: 'uppercase' }}>{c.title}</h4>
                <p style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>{c.value}</p>
              </div>
            ))}
          </div>

          <a href={`https://wa.me/${whatsapp}?text=${msgWhatsapp}`} target="_blank"
            style={{ display: 'inline-block', background: '#25D366', color: 'white', padding: '18px 48px', borderRadius: '4px', textDecoration: 'none', fontSize: '16px', fontWeight: 700, letterSpacing: '0.5px' }}>
            💬 Ouvrir WhatsApp
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#111', color: 'white', padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '20px', fontWeight: 800 }}>CK</span>
          <span style={{ fontSize: '20px', fontWeight: 300, color: '#888' }}>DRESS</span>
        </div>
        <p style={{ color: '#555', fontSize: '13px', margin: 0 }}>© 2026 CK Dress — Abidjan, Côte d'Ivoire</p>
      </footer>

    </div>
  )
}