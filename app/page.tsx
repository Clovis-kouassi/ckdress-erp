'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const WHATSAPP = '2250555303010'
const MSG = encodeURIComponent('Bonjour CK Dress 👋 Je souhaite passer une commande.')

const TEXTES_DEFILANTS = [
  '🎉 Jusqu\'au 31 Mai — Achetez 2 Polos et bénéficiez de la livraison GRATUITE partout à Abidjan !',
  '✨ Nouvelle collection CK Design disponible — Polos, Chemises, Jupes et Robes',
  '🚚 Livraison en 24h à Abidjan — Expédition dans toute la Côte d\'Ivoire en 48h',
  '💬 Commandez facilement via WhatsApp au +225 05 55 30 30 10',
]

const PROMOS = [
  { nom: 'Polo Classic', description: 'Achetez 2, livraison gratuite', prix_original: 6000, prix_promo: 6000, badge: '🎁 Livraison offerte', emoji: '👕', lien: '/catalogue' },
  { nom: 'Tee-shirt Premium', description: 'Offre limitée jusqu\'au 31 mai', prix_original: 3500, prix_promo: 3000, badge: '🔥 -14%', emoji: '👕', lien: '/succes-design/catalogue' },
  { nom: 'Chemise Lin', description: 'Collection printemps 2026', prix_original: 10000, prix_promo: 8500, badge: '⭐ -15%', emoji: '👔', lien: '/catalogue' },
  { nom: 'Polo Importé SD', description: 'Qualité premium importée', prix_original: 7000, prix_promo: 5500, badge: '🌟 -21%', emoji: '👕', lien: '/succes-design/catalogue' },
]

export default function LandingPage() {
  const [produits, setProduits] = useState<any[]>([])
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    fetchProduits()
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const fetchProduits = async () => {
    const { data } = await supabase.from('produits').select('*').eq('disponible', true).limit(6)
    setProduits(data || [])
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#0a0a0a', color: '#fff', minHeight: '100vh', overflowX: 'hidden' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=Playfair+Display:wght@400;700;800&display=swap" rel="stylesheet" />

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      {/* BANDEAU TEXTE DÉFILANT */}
      <div style={{ background: 'linear-gradient(90deg, #1a1a1a, #2a2a2a)', borderBottom: '1px solid rgba(212,168,83,0.3)', padding: '10px 0', overflow: 'hidden', position: 'relative', zIndex: 999 }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 80, background: 'linear-gradient(90deg, #1a1a1a, transparent)', zIndex: 1 }} />
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, background: 'linear-gradient(270deg, #1a1a1a, transparent)', zIndex: 1 }} />
        <div style={{ display: 'flex', animation: 'marquee 40s linear infinite', whiteSpace: 'nowrap', width: 'max-content' }}>
          {[...TEXTES_DEFILANTS, ...TEXTES_DEFILANTS].map((t, i) => (
            <span key={i} style={{ fontSize: 13, fontWeight: 600, color: '#d4a853', letterSpacing: 0.5, marginRight: 80 }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* NAVBAR */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 1000,
        background: scrolled ? 'rgba(10,10,10,0.97)' : 'rgba(10,10,10,0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: scrolled ? '1px solid rgba(212,168,83,0.2)' : '1px solid rgba(255,255,255,0.05)',
        padding: '0 40px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: '68px',
        transition: 'all 0.3s ease',
        boxShadow: scrolled ? '0 2px 20px rgba(0,0,0,0.3)' : 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, #d4a853, #f0c970)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#0a0a0a' }}>CK</div>
          <div>
            <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: 3, color: '#fff' }}>CK DRESS</span>
            <p style={{ margin: 0, fontSize: 9, color: '#d4a853', letterSpacing: 2, textTransform: 'uppercase' }}>Abidjan · Côte d'Ivoire</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          {[
            { label: 'Accueil', href: '#accueil' },
            { label: 'Nos Marques', href: '#marques' },
            { label: 'Promos 🔥', href: '#promos' },
            { label: 'Collection', href: '#collection' },
            { label: 'À Propos', href: '#apropos' },
            { label: 'Contact', href: '#contact' },
          ].map(item => (
            <a key={item.label} href={item.href}
              style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 13, fontWeight: 500, letterSpacing: 0.5, transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#d4a853')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}>
              {item.label}
            </a>
          ))}
          <a href={`https://wa.me/${WHATSAPP}?text=${MSG}`} target="_blank"
            style={{ background: 'linear-gradient(135deg, #d4a853, #f0c970)', color: '#0a0a0a', padding: '10px 24px', borderRadius: 4, textDecoration: 'none', fontSize: 13, fontWeight: 700, letterSpacing: 0.5, boxShadow: '0 4px 12px rgba(212,168,83,0.3)' }}>
            Commander
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section id="accueil" style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
        background: 'radial-gradient(ellipse at 20% 50%, rgba(212,168,83,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(212,168,83,0.05) 0%, transparent 50%), #0a0a0a'
      }}>
        <div style={{ position: 'absolute', top: '15%', right: '8%', width: 400, height: 400, borderRadius: '50%', border: '1px solid rgba(212,168,83,0.15)' }} />
        <div style={{ position: 'absolute', top: '20%', right: '10%', width: 280, height: 280, borderRadius: '50%', border: '1px solid rgba(212,168,83,0.1)' }} />
        <div style={{ position: 'absolute', bottom: '15%', left: '5%', width: 200, height: 200, borderRadius: '50%', border: '1px solid rgba(212,168,83,0.1)' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 800, height: 800, borderRadius: '50%', border: '1px solid rgba(212,168,83,0.04)' }} />
        <div style={{ position: 'absolute', left: 0, top: '50%', width: '30%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(212,168,83,0.3))' }} />
        <div style={{ position: 'absolute', right: 0, top: '50%', width: '30%', height: 1, background: 'linear-gradient(270deg, transparent, rgba(212,168,83,0.3))' }} />

        <div style={{ textAlign: 'center', maxWidth: 800, padding: '0 24px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: 'rgba(212,168,83,0.1)', border: '1px solid rgba(212,168,83,0.3)', borderRadius: 100, padding: '8px 20px', marginBottom: 32 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#d4a853' }} />
            <span style={{ fontSize: 11, color: '#d4a853', letterSpacing: 3, textTransform: 'uppercase', fontWeight: 600 }}>Collection Abidjan 2026</span>
          </div>

          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(48px, 8vw, 90px)', fontWeight: 800, lineHeight: 1.05, margin: '0 0 8px', letterSpacing: -2, color: '#fff' }}>
            Style,
          </h1>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(48px, 8vw, 90px)', fontWeight: 400, lineHeight: 1.05, margin: '0 0 32px', letterSpacing: -2, color: '#d4a853', fontStyle: 'italic' }}>
            Élégance & Luxe
          </h1>

          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 18, lineHeight: 1.8, margin: '0 auto 48px', maxWidth: 560 }}>
            Découvrez CK Dress — vos tenues de qualité premium livrées directement à Abidjan et dans toute la Côte d'Ivoire.
          </p>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="#collection"
              style={{ background: 'linear-gradient(135deg, #d4a853, #f0c970)', color: '#0a0a0a', padding: '16px 40px', borderRadius: 4, textDecoration: 'none', fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', boxShadow: '0 6px 20px rgba(212,168,83,0.35)' }}>
              Voir la Collection
            </a>
            <a href="#promos"
              style={{ background: 'rgba(226,75,74,0.15)', color: '#fff', padding: '16px 40px', borderRadius: 4, textDecoration: 'none', fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', border: '1px solid rgba(226,75,74,0.4)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(226,75,74,0.25)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(226,75,74,0.15)' }}>
              🔥 Voir les Promos
            </a>
          </div>

          <div style={{ display: 'flex', gap: 48, justifyContent: 'center', marginTop: 72, paddingTop: 48, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            {[
              { value: '500+', label: 'Clients satisfaits' },
              { value: '24h', label: 'Livraison Abidjan' },
              { value: '2', label: 'Marques exclusives' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 32, fontWeight: 800, color: '#d4a853', fontFamily: "'Playfair Display', serif" }}>{s.value}</p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, textTransform: 'uppercase' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: '60px 40px', background: 'rgba(212,168,83,0.05)', borderTop: '1px solid rgba(212,168,83,0.15)', borderBottom: '1px solid rgba(212,168,83,0.15)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 32 }}>
          {[
            { icon: '🚚', title: 'Livraison 24h', desc: 'Livraison rapide à Abidjan sous 24 heures' },
            { icon: '✨', title: 'Qualité Premium', desc: 'Matières soigneusement sélectionnées' },
            { icon: '💬', title: 'Commande WhatsApp', desc: 'Commandez en quelques secondes' },
            { icon: '🔄', title: 'Échange Garanti', desc: 'Échange possible sous 7 jours' },
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 8, background: 'rgba(212,168,83,0.1)', border: '1px solid rgba(212,168,83,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                {f.icon}
              </div>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#fff' }}>{f.title}</h3>
                <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 🔥 BANNIÈRE PROMOS */}
      <section id="promos" style={{ padding: '80px 40px', background: '#0d0d0d' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#E24B4A', borderRadius: 100, padding: '5px 14px', marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: '#fff', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>🔥 Offres Limitées</span>
              </div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, margin: 0, color: '#fff' }}>
                Promotions <span style={{ color: '#d4a853', fontStyle: 'italic' }}>du Moment</span>
              </h2>
            </div>
            <div style={{ background: 'rgba(226,75,74,0.1)', border: '1px solid rgba(226,75,74,0.3)', borderRadius: 12, padding: '12px 20px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 11, color: '#E24B4A', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Expire le</p>
              <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 800, color: '#E24B4A' }}>31 Mai 2026</p>
            </div>
          </div>

          {/* Message promo principal */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(212,168,83,0.12), rgba(212,168,83,0.06))',
            borderRadius: 16, padding: '24px 32px', marginBottom: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            border: '1px solid rgba(212,168,83,0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ fontSize: 40 }}>🎁</div>
              <div>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff', fontFamily: "'Playfair Display', serif" }}>
                  Achetez 2 Polos → Livraison GRATUITE
                </p>
                <p style={{ margin: '6px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
                  Partout à Abidjan — Offre valable jusqu'au 31 Mai 2026
                </p>
              </div>
            </div>
            <a href="/catalogue"
              style={{ background: 'linear-gradient(135deg, #d4a853, #f0c970)', color: '#0a0a0a', padding: '12px 28px', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 700, flexShrink: 0, boxShadow: '0 4px 16px rgba(212,168,83,0.3)' }}>
              En profiter →
            </a>
          </div>

          {/* Cartes promos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {PROMOS.map((promo, i) => (
              <div key={i} style={{ background: '#111', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', transition: 'all 0.3s', boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.border = '1px solid rgba(212,168,83,0.3)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.border = '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ height: 160, background: 'linear-gradient(135deg, #1a1a1a, #222)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <span style={{ fontSize: 52, opacity: 0.2 }}>{promo.emoji}</span>
                  <span style={{ position: 'absolute', top: 12, left: 12, background: '#E24B4A', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 100 }}>
                    {promo.badge}
                  </span>
                </div>
                <div style={{ padding: '16px 20px 20px' }}>
                  <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#fff' }}>{promo.nom}</h3>
                  <p style={{ margin: '0 0 14px', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{promo.description}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecoration: 'line-through', marginRight: 6 }}>
                        {promo.prix_original.toLocaleString('fr-FR')} F
                      </span>
                      <span style={{ fontSize: 20, fontWeight: 800, color: '#d4a853', fontFamily: "'Playfair Display', serif" }}>
                        {promo.prix_promo.toLocaleString('fr-FR')} F
                      </span>
                    </div>
                    <a href={promo.lien} style={{ background: 'linear-gradient(135deg, #d4a853, #f0c970)', color: '#0a0a0a', padding: '8px 16px', borderRadius: 6, textDecoration: 'none', fontSize: 12, fontWeight: 700 }}>
                      Commander
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NOS MARQUES */}
      <section id="marques" style={{ padding: '100px 40px', background: '#0a0a0a' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ color: '#d4a853', fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 16, fontWeight: 600 }}>Notre univers</p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 700, margin: 0 }}>
              Deux Marques, <span style={{ color: '#d4a853', fontStyle: 'italic' }}>Un Style</span>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div style={{ position: 'relative', background: 'linear-gradient(135deg, #111 0%, #1a1a1a 100%)', borderRadius: 16, padding: 48, border: '1px solid rgba(212,168,83,0.2)', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', border: '1px solid rgba(212,168,83,0.1)' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #d4a853, #f0c970)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#0a0a0a', marginBottom: 24 }}>CK</div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, margin: '0 0 8px' }}>CK Design</h3>
                <p style={{ color: '#d4a853', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 20px', fontWeight: 600 }}>Mode Locale · Abidjan</p>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.8, margin: '0 0 32px' }}>
                  Tenues élégantes et modernes conçues localement. Polos, chemises, jupes et robes à des prix accessibles.
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 32 }}>
                  {['Polo', 'Chemise', 'Jupe', 'Robe', 'Tee-shirt'].map(tag => (
                    <span key={tag} style={{ background: 'rgba(212,168,83,0.1)', border: '1px solid rgba(212,168,83,0.2)', color: '#d4a853', fontSize: 11, padding: '4px 12px', borderRadius: 100, fontWeight: 600 }}>{tag}</span>
                  ))}
                </div>
                <a href="/catalogue" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #d4a853, #f0c970)', color: '#0a0a0a', padding: '12px 28px', borderRadius: 4, textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
                  Voir le catalogue →
                </a>
              </div>
            </div>
            <div style={{ position: 'relative', background: 'linear-gradient(135deg, #0d0d0d 0%, #161616 100%)', borderRadius: 16, padding: 48, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.05)' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #fff, #e0e0e0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#0a0a0a', marginBottom: 24 }}>SD</div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, margin: '0 0 8px' }}>Succès Design</h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 20px', fontWeight: 600 }}>Tenues Importées · Premium</p>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.8, margin: '0 0 32px' }}>
                  Collection exclusive de tenues importées. Polos et Tee-shirts premium de qualité internationale.
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 32 }}>
                  {['Polo', 'Tee-shirt', 'Importé', 'Premium'].map(tag => (
                    <span key={tag} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 11, padding: '4px 12px', borderRadius: 100, fontWeight: 600 }}>{tag}</span>
                  ))}
                </div>
                <a href="/succes-design/catalogue" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '12px 28px', borderRadius: 4, textDecoration: 'none', fontSize: 13, fontWeight: 700 }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}>
                  Voir le catalogue →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COLLECTION */}
      <section id="collection" style={{ padding: '100px 40px', background: '#050505' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 64 }}>
            <div>
              <p style={{ color: '#d4a853', fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 16, fontWeight: 600 }}>Notre sélection</p>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 700, margin: 0 }}>
                Dernières <span style={{ color: '#d4a853', fontStyle: 'italic' }}>Créations</span>
              </h2>
            </div>
            <a href="/catalogue" style={{ color: '#d4a853', textDecoration: 'none', fontSize: 13, fontWeight: 600, letterSpacing: 1, borderBottom: '1px solid #d4a853', paddingBottom: 4 }}>
              Voir tout →
            </a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
            {(produits.length > 0 ? produits : [
              { id: '1', nom: 'Polo Classic', prix_vente: 6000, image_url: null, categorie: 'Polo' },
              { id: '2', nom: 'Chemise Lin', prix_vente: 9000, image_url: null, categorie: 'Chemise' },
              { id: '3', nom: 'Robe Soirée', prix_vente: 13000, image_url: null, categorie: 'Robe' },
              { id: '4', nom: 'Jupe Wax', prix_vente: 8000, image_url: null, categorie: 'Jupe' },
              { id: '5', nom: 'Tee-shirt Premium', prix_vente: 3000, image_url: null, categorie: 'Tee-shirt' },
              { id: '6', nom: 'Polo Importé', prix_vente: 5000, image_url: null, categorie: 'Polo' },
            ]).map((produit: any) => (
              <div key={produit.id}
                style={{ background: '#111', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', transition: 'all 0.3s', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.border = '1px solid rgba(212,168,83,0.3)'; e.currentTarget.style.transform = 'translateY(-6px)' }}
                onMouseLeave={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)' }}>
                <div style={{ height: 280, background: 'linear-gradient(135deg, #1a1a1a, #222)', overflow: 'hidden', position: 'relative' }}>
                  {produit.image_url
                    ? <img src={produit.image_url} alt={produit.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 56, opacity: 0.15 }}>👗</span></div>
                  }
                  {produit.categorie && (
                    <span style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(10,10,10,0.8)', color: '#d4a853', fontSize: 10, padding: '4px 12px', borderRadius: 100, fontWeight: 600, letterSpacing: 1, border: '1px solid rgba(212,168,83,0.3)' }}>
                      {produit.categorie}
                    </span>
                  )}
                </div>
                <div style={{ padding: '20px 24px 24px' }}>
                  <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 600, color: '#fff' }}>{produit.nom}</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: '#d4a853', fontFamily: "'Playfair Display', serif" }}>
                      {(produit.prix_vente || produit.prix)?.toLocaleString('fr-FR')} F
                    </span>
                    <a href="/catalogue" style={{ background: 'rgba(212,168,83,0.1)', border: '1px solid rgba(212,168,83,0.3)', color: '#d4a853', padding: '8px 18px', borderRadius: 4, textDecoration: 'none', fontSize: 12, fontWeight: 700 }}>
                      Commander
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 56 }}>
            <a href="/catalogue"
              style={{ display: 'inline-block', border: '1px solid rgba(212,168,83,0.4)', color: '#d4a853', padding: '16px 48px', borderRadius: 4, textDecoration: 'none', fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,168,83,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
              Voir tout le catalogue →
            </a>
          </div>
        </div>
      </section>

      {/* TÉMOIGNAGES */}
      <section id="temoignages" style={{ padding: '100px 40px', background: '#0a0a0a', borderTop: '1px solid rgba(212,168,83,0.1)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ color: '#d4a853', fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 16, fontWeight: 600 }}>Ils nous font confiance</p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 700, margin: 0 }}>
              Avis de nos <span style={{ color: '#d4a853', fontStyle: 'italic' }}>Clients</span>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {[
              { nom: 'Aminata K.', ville: 'Abidjan, Cocody', avis: 'Qualité exceptionnelle ! La robe que j\'ai commandée est magnifique et la livraison était rapide. Je recommande vivement CK Dress !', note: 5 },
              { nom: 'Kouassi M.', ville: 'Abidjan, Yopougon', avis: 'Les polos sont de très bonne qualité. J\'ai commandé plusieurs fois et je suis toujours satisfait. Le service WhatsApp est très pratique.', note: 5 },
              { nom: 'Fatou D.', ville: 'Bouaké', avis: 'Livraison rapide même depuis Bouaké. Les tenues correspondent exactement aux photos. Je suis une cliente fidèle !', note: 5 },
            ].map((t, i) => (
              <div key={i} style={{ background: '#111', borderRadius: 16, padding: 32, border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
                  {Array(t.note).fill(0).map((_, j) => <span key={j} style={{ color: '#d4a853', fontSize: 16 }}>★</span>)}
                </div>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 1.8, margin: '0 0 24px', fontStyle: 'italic' }}>"{t.avis}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg, #d4a853, #f0c970)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#0a0a0a' }}>{t.nom[0]}</div>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fff' }}>{t.nom}</p>
                    <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{t.ville}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* À PROPOS */}
      <section id="apropos" style={{ padding: '100px 40px', background: '#050505' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div>
            <p style={{ color: '#d4a853', fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 16, fontWeight: 600 }}>Notre histoire</p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 700, margin: '0 0 24px', lineHeight: 1.2 }}>
              À Propos de <span style={{ color: '#d4a853', fontStyle: 'italic' }}>CK Dress</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, lineHeight: 1.9, margin: '0 0 20px' }}>
              CK Dress est une marque de mode basée à Abidjan, Côte d'Ivoire. Nous proposons des vêtements élégants et de qualité pour hommes et femmes.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, lineHeight: 1.9, margin: '0 0 40px' }}>
              À travers nos deux marques — <strong style={{ color: '#d4a853' }}>CK Design</strong> pour la mode locale et <strong style={{ color: '#fff' }}>Succès Design</strong> pour les tenues importées.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 40 }}>
              {[
                { value: '2024', label: 'Année de création' },
                { value: '500+', label: 'Clients satisfaits' },
                { value: '2', label: 'Marques exclusives' },
                { value: '48h', label: 'Délai expédition CI' },
              ].map((s, i) => (
                <div key={i} style={{ background: 'rgba(212,168,83,0.05)', border: '1px solid rgba(212,168,83,0.15)', borderRadius: 12, padding: '20px 24px' }}>
                  <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#d4a853', fontFamily: "'Playfair Display', serif" }}>{s.value}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{s.label}</p>
                </div>
              ))}
            </div>
            <a href={`https://wa.me/${WHATSAPP}?text=${MSG}`} target="_blank"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #d4a853, #f0c970)', color: '#0a0a0a', padding: '14px 32px', borderRadius: 4, textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>
              💬 Nous contacter
            </a>
          </div>
          <div style={{ position: 'relative', height: 500 }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(212,168,83,0.08), rgba(212,168,83,0.02))', borderRadius: 24, border: '1px solid rgba(212,168,83,0.15)' }} />
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
              <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg, #d4a853, #f0c970)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 32, fontWeight: 800, color: '#0a0a0a' }}>CK</div>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, margin: '0 0 8px' }}>CK Dress</p>
              <p style={{ color: '#d4a853', fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 32px' }}>Abidjan · CI</p>
              <div style={{ width: 60, height: 1, background: 'linear-gradient(90deg, transparent, #d4a853, transparent)', margin: '0 auto 32px' }} />
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 1.8, maxWidth: 240, margin: '0 auto' }}>"Style, Élégance & Qualité pour tous"</p>
            </div>
            <div style={{ position: 'absolute', top: 20, right: 20, width: 100, height: 100, borderRadius: '50%', border: '1px solid rgba(212,168,83,0.2)' }} />
            <div style={{ position: 'absolute', bottom: 20, left: 20, width: 80, height: 80, borderRadius: '50%', border: '1px solid rgba(212,168,83,0.15)' }} />
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" style={{ padding: '100px 40px', background: '#0a0a0a', borderTop: '1px solid rgba(212,168,83,0.1)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: '#d4a853', fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 16, fontWeight: 600 }}>Nous contacter</p>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 700, margin: '0 0 20px' }}>
            Parlons-nous <span style={{ color: '#d4a853', fontStyle: 'italic' }}>Ensemble</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 17, lineHeight: 1.8, marginBottom: 56 }}>
            Une question ? Une commande spéciale ? Nous sommes disponibles du lundi au samedi de 8h à 20h.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 56 }}>
            {[
              { icon: '📍', title: 'Localisation', value: 'Abidjan, Côte d\'Ivoire' },
              { icon: '📱', title: 'WhatsApp', value: '+225 05 55 30 30 10' },
              { icon: '⏰', title: 'Horaires', value: 'Lun–Sam, 8h–20h' },
            ].map((c, i) => (
              <div key={i} style={{ background: '#111', padding: '32px 24px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(212,168,83,0.1)', border: '1px solid rgba(212,168,83,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 16px' }}>{c.icon}</div>
                <h4 style={{ margin: '0 0 8px', fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, textTransform: 'uppercase' }}>{c.title}</h4>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#fff' }}>{c.value}</p>
              </div>
            ))}
          </div>
          <div style={{ background: 'linear-gradient(135deg, rgba(37,211,102,0.1), rgba(37,211,102,0.05))', border: '1px solid rgba(37,211,102,0.2)', borderRadius: 16, padding: '40px 48px' }}>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, margin: '0 0 8px' }}>Commandez maintenant</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, margin: '0 0 28px' }}>Réponse garantie en moins de 30 minutes</p>
            <a href={`https://wa.me/${WHATSAPP}?text=${MSG}`} target="_blank"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#25D366', color: '#fff', padding: '16px 40px', borderRadius: 8, textDecoration: 'none', fontSize: 16, fontWeight: 700 }}>
              💬 Ouvrir WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#050505', borderTop: '1px solid rgba(212,168,83,0.15)', padding: '48px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #d4a853, #f0c970)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#0a0a0a' }}>CK</div>
              <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: 3, color: '#fff' }}>CK DRESS</span>
            </div>
            <div style={{ display: 'flex', gap: 32 }}>
              {['Catalogue CK Design', 'Catalogue Succès Design', 'WhatsApp'].map((link, i) => (
                <a key={i} href={i === 0 ? '/catalogue' : i === 1 ? '/succes-design/catalogue' : `https://wa.me/${WHATSAPP}`}
                  target={i === 2 ? '_blank' : undefined}
                  style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: 13 }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#d4a853')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>
                  {link}
                </a>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, margin: 0 }}>© 2026 CK Dress — Abidjan, Côte d'Ivoire</p>
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, margin: 0 }}>Style · Élégance · Qualité</p>
          </div>
        </div>
      </footer>
    </div>
  )
}