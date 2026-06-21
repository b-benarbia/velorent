'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  Bike, BarChart3, FileText, Smartphone,
  Globe, Check, X, ChevronRight, Star,
  QrCode, Wrench, Hotel, Bell, Menu, ChevronDown
} from 'lucide-react'

const LANG = {
  fr: {
    nav: { features: 'Fonctionnalités', pricing: 'Tarifs', login: 'Se connecter', trial: 'Essai gratuit' },
    hero: {
      badge: '🇪🇸 🇫🇷 🇮🇹 Fait pour les loueurs européens',
      title: 'Le logiciel de location de vélos qui fait le travail à votre place',
      subtitle: 'Gérez votre flotte, vos clients, vos réservations et votre comptabilité depuis n\'importe quel appareil. Plus simple que Booqable, moitié moins cher.',
      cta: 'Démarrer l\'essai gratuit',
      sub: '14 jours gratuits · Pas de carte bancaire',
      demo: 'Voir une démo',
    },
    stats: [
      { value: '7', label: 'langues supportées' },
      { value: '€0', label: 'de commission' },
      { value: '5 min', label: 'pour démarrer' },
      { value: '14j', label: 'd\'essai gratuit' },
    ],
    problem: {
      title: 'Fini les tableurs et les post-its',
      old: { label: 'L\'ancienne façon', items: ['Carnets papier impossibles à retrouver', 'Appels téléphoniques pour chaque réservation', 'Pas de vue d\'ensemble sur la flotte', 'Comptabilité manuelle en fin de mois', 'Impossible depuis un téléphone'] },
      new: { label: 'Avec VeloRent', items: ['Toute la flotte en temps réel sur un écran', 'Réservations en ligne 24h/24 sans décrocher', 'Alertes automatiques de retard', 'Export comptable en 1 clic', 'Vue staff optimisée pour mobile'] },
    },
    features: {
      title: 'Tout ce qu\'il faut, rien de superflu',
      subtitle: 'Conçu spécifiquement pour les loueurs de vélos, pas pour toutes les industries à la fois.',
      items: [
        { icon: BarChart3, title: 'Tableau de bord temps réel', desc: 'KPIs du jour, revenus du mois, vélos disponibles, retards — tout en un coup d\'œil.' },
        { icon: Smartphone, title: 'Vue staff mobile', desc: 'Votre équipe gère les entrées/sorties depuis un téléphone, sans formation.' },
        { icon: Globe, title: '7 langues intégrées', desc: 'Français, espagnol, anglais, allemand, italien, néerlandais, portugais.' },
        { icon: FileText, title: 'Contrats & signatures', desc: 'Contrats PDF générés automatiquement avec signature numérique.' },
        { icon: Hotel, title: 'Partenaires hôtels', desc: 'Gérez vos partenariats hôtels avec tarifs négociés et facturation groupée.' },
        { icon: QrCode, title: 'QR code par vélo', desc: 'Scannez le QR code d\'un vélo pour ouvrir une location en 5 secondes.' },
        { icon: Bell, title: 'Alertes de retard', desc: 'Détection automatique des retards avec liste des clients à rappeler.' },
        { icon: Wrench, title: 'Suivi maintenance', desc: 'Planifiez les révisions et bloquez les vélos en maintenance.' },
      ],
    },
    compare: {
      title: 'Pourquoi VeloRent plutôt que les autres ?',
      subtitle: 'Booqable est fait pour toutes les industries. VeloRent est fait pour vous.',
      features: [
        'Spécialisé location de vélos', '7 langues dont ES, FR, IT', 'Vue staff mobile dédiée',
        'Partenaires hôtels intégrés', 'Alertes retard automatiques', 'QR code par vélo',
        'Suivi maintenance', 'Support en français/espagnol', 'Prix en euros, facturation EU',
      ],
      velorent: [true, true, true, true, true, true, true, true, true],
      booqable:  [false, false, false, false, true, true, false, false, false],
    },
    pricing: {
      title: 'Des tarifs clairs, sans surprise',
      subtitle: 'Pas de commission sur vos réservations. Payez uniquement votre abonnement.',
      yearly: '-20% sur le tarif annuel',
      plans: [
        { name: 'Starter', price: '19', period: '/mois', desc: 'Pour démarrer et tester', highlight: false, badge: null, cta: 'Démarrer gratuitement', features: ['1 boutique', '2 utilisateurs', '100 locations/mois', 'Tableau de bord', 'Réservations online', 'Contrats PDF'] },
        { name: 'Pro', price: '39', period: '/mois', desc: 'Pour les boutiques actives', highlight: true, badge: 'Le plus populaire', cta: 'Démarrer gratuitement', features: ['1 boutique', '5 utilisateurs', 'Locations illimitées', 'Vue staff mobile', 'Partenaires hôtels', 'Export comptable', 'QR codes vélos'] },
        { name: 'Business', price: '69', period: '/mois', desc: 'Pour plusieurs boutiques', highlight: false, badge: null, cta: 'Nous contacter', features: ['Multi-boutiques', 'Utilisateurs illimités', 'Tout du plan Pro', 'Notifications WhatsApp', 'Accès API', 'Support prioritaire'] },
      ],
    },
    faq: {
      title: 'Questions fréquentes',
      items: [
        { q: 'Est-ce que l\'essai gratuit demande une carte bancaire ?', a: 'Non. 14 jours gratuits sans aucune information de paiement. Vous décidez à la fin si vous voulez continuer.' },
        { q: 'Est-ce que je peux importer mes données existantes ?', a: 'Oui, on vous aide à importer vos clients et votre flotte depuis Excel ou un autre logiciel. Support inclus.' },
        { q: 'Que se passe-t-il si je dépasse ma limite de locations ?', a: 'On vous prévient avant. Vous pouvez upgrader à tout moment, pas de surcharge automatique.' },
        { q: 'La page de réservation client est-elle personnalisable ?', a: 'Oui — votre logo, vos couleurs, votre URL personnalisée. Vos clients ne voient pas VeloRent.' },
        { q: 'Est-ce que mes données restent en Europe ?', a: 'Oui. Hébergement en Europe, conformité RGPD, facturation en euros.' },
      ],
    },
    cta: { title: 'Prêt à gérer votre boutique autrement ?', sub: '14 jours gratuits, sans engagement, sans carte bancaire.', btn: 'Créer mon compte gratuitement' },
    footer: {
      tagline: 'Le logiciel de location de vélos pensé pour les professionnels européens.',
      product: 'Produit', company: 'Entreprise',
      links: { product: ['Fonctionnalités', 'Tarifs', 'Page de réservation', 'Contrats & signatures'], company: ['À propos', 'Mentions légales', 'Confidentialité', 'Contact'] },
      copy: '© 2026 VeloRent. Tous droits réservés.',
    },
  },
  es: {
    nav: { features: 'Características', pricing: 'Precios', login: 'Iniciar sesión', trial: 'Prueba gratis' },
    hero: {
      badge: '🇪🇸 🇫🇷 🇮🇹 Hecho para alquiladores europeos',
      title: 'El software de alquiler de bicicletas que trabaja por ti',
      subtitle: 'Gestiona tu flota, clientes, reservas y contabilidad desde cualquier dispositivo. Más simple que Booqable, la mitad de precio.',
      cta: 'Empezar prueba gratuita', sub: '14 días gratis · Sin tarjeta bancaria', demo: 'Ver una demo',
    },
    stats: [
      { value: '7', label: 'idiomas incluidos' }, { value: '€0', label: 'de comisión' },
      { value: '5 min', label: 'para empezar' }, { value: '14d', label: 'de prueba gratis' },
    ],
    problem: {
      title: 'Adiós a las hojas de cálculo',
      old: { label: 'La forma antigua', items: ['Cuadernos en papel', 'Llamadas para cada reserva', 'Sin visión global de la flota', 'Contabilidad manual', 'Imposible desde el móvil'] },
      new: { label: 'Con VeloRent', items: ['Toda la flota en tiempo real', 'Reservas online 24h/7', 'Alertas automáticas de retraso', 'Export contable en 1 clic', 'Vista de personal para móvil'] },
    },
    features: {
      title: 'Todo lo que necesitas, nada más',
      subtitle: 'Diseñado específicamente para alquiler de bicicletas, no para todas las industrias.',
      items: [
        { icon: BarChart3, title: 'Panel en tiempo real', desc: 'KPIs del día, ingresos del mes, bicis disponibles, retrasos — todo de un vistazo.' },
        { icon: Smartphone, title: 'Vista del personal móvil', desc: 'Tu equipo gestiona entradas/salidas desde el móvil, sin formación.' },
        { icon: Globe, title: '7 idiomas integrados', desc: 'Español, francés, inglés, alemán, italiano, neerlandés, portugués.' },
        { icon: FileText, title: 'Contratos y firmas', desc: 'Contratos PDF generados automáticamente con firma digital.' },
        { icon: Hotel, title: 'Socios hoteleros', desc: 'Gestiona acuerdos con hoteles con tarifas negociadas y facturación agrupada.' },
        { icon: QrCode, title: 'QR por bicicleta', desc: 'Escanea el QR de una bici para abrir un alquiler en 5 segundos.' },
        { icon: Bell, title: 'Alertas de retraso', desc: 'Detección automática de retrasos con lista de clientes a llamar.' },
        { icon: Wrench, title: 'Seguimiento mantenimiento', desc: 'Planifica revisiones y bloquea bicis en mantenimiento.' },
      ],
    },
    compare: {
      title: '¿Por qué VeloRent?',
      subtitle: 'Booqable es para todas las industrias. VeloRent es para ti.',
      features: [
        'Especializado en alquiler de bicis', '7 idiomas: ES, FR, IT, EN', 'Vista de personal móvil',
        'Socios hoteleros integrados', 'Alertas de retraso automáticas', 'QR por bicicleta',
        'Seguimiento de mantenimiento', 'Soporte en español', 'Precio en euros, facturación EU',
      ],
      velorent: [true, true, true, true, true, true, true, true, true],
      booqable:  [false, false, false, false, true, true, false, false, false],
    },
    pricing: {
      title: 'Precios claros, sin sorpresas',
      subtitle: 'Sin comisión sobre tus reservas. Solo pagas tu suscripción.',
      yearly: '-20% en el plan anual',
      plans: [
        { name: 'Starter', price: '19', period: '/mes', desc: 'Para empezar y probar', highlight: false, badge: null, cta: 'Empezar gratis', features: ['1 tienda', '2 usuarios', '100 alquileres/mes', 'Panel de control', 'Reservas online', 'Contratos PDF'] },
        { name: 'Pro', price: '39', period: '/mes', desc: 'Para tiendas activas', highlight: true, badge: 'Más popular', cta: 'Empezar gratis', features: ['1 tienda', '5 usuarios', 'Alquileres ilimitados', 'Vista personal móvil', 'Socios hoteleros', 'Export contable', 'QR bicicletas'] },
        { name: 'Business', price: '69', period: '/mes', desc: 'Para varias tiendas', highlight: false, badge: null, cta: 'Contactar', features: ['Multi-tienda', 'Usuarios ilimitados', 'Todo del plan Pro', 'Notificaciones WhatsApp', 'Acceso API', 'Soporte prioritario'] },
      ],
    },
    faq: {
      title: 'Preguntas frecuentes',
      items: [
        { q: '¿La prueba gratuita requiere tarjeta bancaria?', a: 'No. 14 días gratis sin ninguna información de pago.' },
        { q: '¿Puedo importar mis datos existentes?', a: 'Sí, te ayudamos a importar desde Excel u otro software.' },
        { q: '¿Qué pasa si supero mi límite?', a: 'Te avisamos antes. Puedes hacer upgrade en cualquier momento.' },
        { q: '¿La página de reserva es personalizable?', a: 'Sí — tu logo, colores, URL personalizada. Tus clientes no ven VeloRent.' },
        { q: '¿Mis datos se quedan en Europa?', a: 'Sí. Alojamiento en Europa, cumplimiento RGPD, facturación en euros.' },
      ],
    },
    cta: { title: '¿Listo para gestionar tu tienda de otra manera?', sub: '14 días gratis, sin compromiso, sin tarjeta bancaria.', btn: 'Crear mi cuenta gratis' },
    footer: {
      tagline: 'El software de alquiler de bicicletas para profesionales europeos.',
      product: 'Producto', company: 'Empresa',
      links: { product: ['Características', 'Precios', 'Página de reserva', 'Contratos y firmas'], company: ['Acerca de', 'Aviso legal', 'Privacidad', 'Contacto'] },
      copy: '© 2026 VeloRent. Todos los derechos reservados.',
    },
  },
  en: {
    nav: { features: 'Features', pricing: 'Pricing', login: 'Log in', trial: 'Free trial' },
    hero: {
      badge: '🇪🇸 🇫🇷 🇮🇹 Built for European bike rental shops',
      title: 'The bike rental software that does the work for you',
      subtitle: 'Manage your fleet, customers, bookings and accounting from any device. Simpler than Booqable, half the price.',
      cta: 'Start free trial', sub: '14 days free · No credit card', demo: 'Watch a demo',
    },
    stats: [
      { value: '7', label: 'supported languages' }, { value: '€0', label: 'commission' },
      { value: '5 min', label: 'to get started' }, { value: '14d', label: 'free trial' },
    ],
    problem: {
      title: 'Ditch the spreadsheets and sticky notes',
      old: { label: 'The old way', items: ['Paper notebooks everywhere', 'Phone calls for every booking', 'No fleet overview', 'Manual accounting every month', 'Impossible from a phone'] },
      new: { label: 'With VeloRent', items: ['Full fleet in real time on screen', 'Online bookings 24/7', 'Automatic overdue alerts', 'Accounting export in 1 click', 'Mobile-optimized staff view'] },
    },
    features: {
      title: 'Everything you need, nothing you don\'t',
      subtitle: 'Built specifically for bike rentals, not every industry at once.',
      items: [
        { icon: BarChart3, title: 'Real-time dashboard', desc: 'Today\'s KPIs, monthly revenue, available bikes, overdue — all at a glance.' },
        { icon: Smartphone, title: 'Dedicated staff mobile view', desc: 'Your team handles check-ins and returns from a phone, no training.' },
        { icon: Globe, title: '7 built-in languages', desc: 'French, Spanish, English, German, Italian, Dutch, Portuguese.' },
        { icon: FileText, title: 'Contracts & signatures', desc: 'Auto-generated PDF contracts with digital signature.' },
        { icon: Hotel, title: 'Hotel partners', desc: 'Manage hotel partnerships with negotiated rates and group invoicing.' },
        { icon: QrCode, title: 'Per-bike QR codes', desc: 'Scan a bike\'s QR code to open a rental in 5 seconds.' },
        { icon: Bell, title: 'Overdue alerts', desc: 'Automatic overdue detection with callback list.' },
        { icon: Wrench, title: 'Maintenance tracking', desc: 'Schedule services and block bikes under maintenance.' },
      ],
    },
    compare: {
      title: 'Why VeloRent instead of the others?',
      subtitle: 'Booqable is built for every industry. VeloRent is built for you.',
      features: [
        'Specialized in bike rentals', '7 languages incl. ES, FR, IT', 'Dedicated staff mobile view',
        'Integrated hotel partners', 'Automatic overdue alerts', 'Per-bike QR codes',
        'Maintenance tracking', 'Support in your language', 'EUR pricing, EU billing',
      ],
      velorent: [true, true, true, true, true, true, true, true, true],
      booqable:  [false, false, false, false, true, true, false, false, false],
    },
    pricing: {
      title: 'Clear pricing, no surprises',
      subtitle: 'No commission on your bookings. You only pay your subscription.',
      yearly: '-20% on yearly plan',
      plans: [
        { name: 'Starter', price: '19', period: '/mo', desc: 'To get started', highlight: false, badge: null, cta: 'Start for free', features: ['1 shop', '2 users', '100 rentals/month', 'Dashboard', 'Online bookings', 'PDF contracts'] },
        { name: 'Pro', price: '39', period: '/mo', desc: 'For active shops', highlight: true, badge: 'Most popular', cta: 'Start for free', features: ['1 shop', '5 users', 'Unlimited rentals', 'Staff mobile view', 'Hotel partners', 'Accounting export', 'Bike QR codes'] },
        { name: 'Business', price: '69', period: '/mo', desc: 'For multiple shops', highlight: false, badge: null, cta: 'Contact us', features: ['Multi-shop', 'Unlimited users', 'Everything in Pro', 'WhatsApp notifications', 'API access', 'Priority support'] },
      ],
    },
    faq: {
      title: 'Frequently asked questions',
      items: [
        { q: 'Does the free trial require a credit card?', a: 'No. 14 days free with no payment information required.' },
        { q: 'Can I import my existing data?', a: 'Yes, we help you import from Excel or another software. Support included.' },
        { q: 'What happens if I exceed my limit?', a: 'We notify you first. You can upgrade at any time, no automatic charges.' },
        { q: 'Is the customer booking page customizable?', a: 'Yes — your logo, colors, custom URL. Customers never see VeloRent.' },
        { q: 'Does my data stay in Europe?', a: 'Yes. Hosted in Europe, GDPR compliant, billed in euros.' },
      ],
    },
    cta: { title: 'Ready to manage your shop differently?', sub: '14 days free, no commitment, no credit card.', btn: 'Create my free account' },
    footer: {
      tagline: 'Bike rental software built for European professionals.',
      product: 'Product', company: 'Company',
      links: { product: ['Features', 'Pricing', 'Customer booking page', 'Contracts & signatures'], company: ['About', 'Legal notice', 'Privacy policy', 'Contact'] },
      copy: '© 2026 VeloRent. All rights reserved.',
    },
  },
}

type LangKey = 'fr' | 'es' | 'en'

export default function LandingPage() {
  const [lang, setLang] = useState<LangKey>('fr')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [mobileMenu, setMobileMenu] = useState(false)
  const t = LANG[lang]

  return (
    <div style={{ fontFamily: 'system-ui,-apple-system,sans-serif', background: '#fff', color: '#0f172a' }}>

      {/* ── NAVBAR ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#0D9488,#0891B2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bike size={18} color="white" />
            </div>
            <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em' }}>VeloRent</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <a href="#features" style={{ fontSize: 14, color: '#475569', textDecoration: 'none', fontWeight: 500 }}>{t.nav.features}</a>
            <a href="#pricing" style={{ fontSize: 14, color: '#475569', textDecoration: 'none', fontWeight: 500 }}>{t.nav.pricing}</a>
            <div style={{ display: 'flex', gap: 3, background: '#f1f5f9', borderRadius: 8, padding: 3 }}>
              {(['fr', 'es', 'en'] as LangKey[]).map(l => (
                <button key={l} onClick={() => setLang(l)} style={{ padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', background: lang === l ? '#0D9488' : 'transparent', color: lang === l ? 'white' : '#64748b', transition: 'all 0.15s' }}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <Link href="/login" style={{ fontSize: 14, color: '#475569', textDecoration: 'none', fontWeight: 500 }}>{t.nav.login}</Link>
            <Link href="/register" style={{ fontSize: 14, fontWeight: 700, color: 'white', background: '#0D9488', padding: '8px 18px', borderRadius: 10, textDecoration: 'none', whiteSpace: 'nowrap' }}>{t.nav.trial}</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ background: 'linear-gradient(160deg,#fafbff 0%,#ede9fe 50%,#fafbff 100%)', padding: '88px 24px 72px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: 100, padding: '6px 16px', fontSize: 13, fontWeight: 600, color: '#0F766E', marginBottom: 28 }}>
            {t.hero.badge}
          </div>
          <h1 style={{ fontSize: 'clamp(30px,5vw,54px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 20 }}>
            {t.hero.title}
          </h1>
          <p style={{ fontSize: 18, color: '#475569', lineHeight: 1.65, marginBottom: 36, maxWidth: 580, margin: '0 auto 36px' }}>
            {t.hero.subtitle}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#0D9488', color: 'white', padding: '14px 28px', borderRadius: 12, fontWeight: 700, fontSize: 16, textDecoration: 'none', boxShadow: '0 4px 24px rgba(13,148,136,0.4)' }}>
              {t.hero.cta} <ChevronRight size={18} />
            </Link>
            <a href="#features" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'white', color: '#374151', padding: '14px 24px', borderRadius: 12, fontWeight: 600, fontSize: 15, textDecoration: 'none', border: '1px solid #e2e8f0' }}>
              {t.hero.demo}
            </a>
          </div>
          <p style={{ fontSize: 13, color: '#94a3b8' }}>{t.hero.sub}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 56, background: 'white', borderRadius: 20, padding: '24px 16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
            {t.stats.map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 28, fontWeight: 800, color: '#0D9488', letterSpacing: '-0.03em' }}>{s.value}</p>
                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROBLEM / SOLUTION ── */}
      <section style={{ padding: '72px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, textAlign: 'center', marginBottom: 48, letterSpacing: '-0.02em' }}>{t.problem.title}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 20, padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <X size={14} color="#ef4444" />
                <span style={{ fontWeight: 700, fontSize: 12, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.problem.old.label}</span>
              </div>
              {t.problem.old.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                  <X size={13} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 14, color: '#7f1d1d' }}>{item}</span>
                </div>
              ))}
            </div>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 20, padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <Check size={14} color="#16a34a" />
                <span style={{ fontWeight: 700, fontSize: 12, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.problem.new.label}</span>
              </div>
              {t.problem.new.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                  <Check size={13} color="#16a34a" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 14, color: '#14532d' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding: '72px 24px', background: '#fafbff' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 12 }}>{t.features.title}</h2>
            <p style={{ fontSize: 16, color: '#64748b', maxWidth: 480, margin: '0 auto' }}>{t.features.subtitle}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 18 }}>
            {t.features.items.map((f, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0f0ff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <f.icon size={20} color="#0D9488" />
                </div>
                <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{f.title}</p>
                <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARISON ── */}
      <section style={{ padding: '72px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 12 }}>{t.compare.title}</h2>
            <p style={{ fontSize: 16, color: '#64748b' }}>{t.compare.subtitle}</p>
          </div>
          <div style={{ borderRadius: 20, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 110px', background: '#0f172a', padding: '14px 24px', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Fonctionnalité</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#5EEAD4', textAlign: 'center' }}>VeloRent</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#475569', textAlign: 'center' }}>Booqable</span>
            </div>
            {t.compare.features.map((feat, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 110px', padding: '13px 24px', gap: 8, borderBottom: i < t.compare.features.length - 1 ? '1px solid #f1f5f9' : 'none', background: i % 2 === 0 ? 'white' : '#fafbff' }}>
                <span style={{ fontSize: 14, color: '#374151' }}>{feat}</span>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  {t.compare.velorent[i] ? <Check size={16} color="#16a34a" /> : <X size={16} color="#d1d5db" />}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  {t.compare.booqable[i] ? <Check size={16} color="#16a34a" /> : <X size={16} color="#d1d5db" />}
                </div>
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 110px', padding: '16px 24px', gap: 8, background: '#f0f0ff', borderTop: '2px solid #99F6E4' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0f766e' }}>Prix de départ</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#0f766e', textAlign: 'center' }}>€19/mois</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#94a3b8', textAlign: 'center' }}>$29/mois</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ padding: '72px 24px', background: '#fafbff' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 12 }}>{t.pricing.title}</h2>
            <p style={{ fontSize: 16, color: '#64748b', marginBottom: 12 }}>{t.pricing.subtitle}</p>
            <span style={{ display: 'inline-block', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 100, padding: '4px 14px', fontSize: 13, fontWeight: 600, color: '#15803d' }}>
              ✓ {t.pricing.yearly}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, alignItems: 'stretch' }}>
            {t.pricing.plans.map((plan, i) => (
              <div key={i} style={{ background: plan.highlight ? '#0D9488' : 'white', borderRadius: 20, padding: '32px 28px', border: plan.highlight ? 'none' : '1px solid #e2e8f0', position: 'relative', boxShadow: plan.highlight ? '0 8px 40px rgba(13,148,136,0.35)' : 'none', transform: plan.highlight ? 'scale(1.04)' : 'none', display: 'flex', flexDirection: 'column' }}>
                {plan.badge && (
                  <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#fbbf24', color: '#78350f', fontSize: 11, fontWeight: 800, padding: '4px 14px', borderRadius: 100, whiteSpace: 'nowrap' }}>
                    {plan.badge}
                  </div>
                )}
                <p style={{ fontWeight: 700, fontSize: 18, color: plan.highlight ? 'white' : '#0f172a', marginBottom: 4 }}>{plan.name}</p>
                <p style={{ fontSize: 13, color: plan.highlight ? 'rgba(255,255,255,0.65)' : '#94a3b8', marginBottom: 20 }}>{plan.desc}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
                  <span style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.03em', color: plan.highlight ? 'white' : '#0f172a' }}>€{plan.price}</span>
                  <span style={{ fontSize: 14, color: plan.highlight ? 'rgba(255,255,255,0.6)' : '#94a3b8' }}>{plan.period}</span>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                  {plan.features.map((f, j) => (
                    <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Check size={14} color={plan.highlight ? 'rgba(255,255,255,0.8)' : '#16a34a'} style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: plan.highlight ? 'rgba(255,255,255,0.9)' : '#374151' }}>{f}</span>
                    </div>
                  ))}
                </div>
                <Link href="/register" style={{ display: 'block', textAlign: 'center', padding: '12px', borderRadius: 12, fontWeight: 700, fontSize: 14, textDecoration: 'none', background: plan.highlight ? 'white' : '#0D9488', color: plan.highlight ? '#0D9488' : 'white' }}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIAL ── */}
      <section style={{ padding: '64px 24px', background: '#0f172a' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 20 }}>
            {[...Array(5)].map((_, i) => <Star key={i} size={18} color="#fbbf24" fill="#fbbf24" />)}
          </div>
          <p style={{ fontSize: 20, fontWeight: 600, color: 'white', lineHeight: 1.55, marginBottom: 20, fontStyle: 'italic' }}>
            &ldquo;VeloRent nous a fait gagner 2 heures par jour. La vue staff sur mobile, nos employés l&apos;ont adopté en 10 minutes.&rdquo;
          </p>
          <p style={{ fontSize: 13, color: '#475569' }}>Carlos M. — Alquiler de Bicicletas, Valencia</p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding: '72px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 620, margin: '0 auto' }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, textAlign: 'center', letterSpacing: '-0.02em', marginBottom: 40 }}>{t.faq.title}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {t.faq.items.map((item, i) => (
              <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'white', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 16 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{item.q}</span>
                  <ChevronDown size={16} color="#94a3b8" style={{ flexShrink: 0, transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 20px 16px', background: '#fafbff' }}>
                    <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6 }}>{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ padding: '72px 24px', background: 'linear-gradient(135deg,#0D9488,#0891B2)' }}>
        <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Bike size={28} color="white" />
          </div>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: 12 }}>{t.cta.title}</h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.75)', marginBottom: 32 }}>{t.cta.sub}</p>
          <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'white', color: '#0D9488', padding: '16px 32px', borderRadius: 14, fontWeight: 800, fontSize: 16, textDecoration: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
            {t.cta.btn} <ChevronRight size={18} />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#0f172a', padding: '48px 24px 32px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 40, marginBottom: 40 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#0D9488,#0891B2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bike size={16} color="white" />
                </div>
                <span style={{ fontWeight: 800, fontSize: 16, color: 'white' }}>VeloRent</span>
              </div>
              <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, maxWidth: 260 }}>{t.footer.tagline}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>{t.footer.product}</p>
              {t.footer.links.product.map((l, i) => <a key={i} href="#" style={{ display: 'block', fontSize: 13, color: '#475569', textDecoration: 'none', marginBottom: 10 }}>{l}</a>)}
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>{t.footer.company}</p>
              {t.footer.links.company.map((l, i) => <a key={i} href="#" style={{ display: 'block', fontSize: 13, color: '#475569', textDecoration: 'none', marginBottom: 10 }}>{l}</a>)}
            </div>
          </div>
          <div style={{ borderTop: '1px solid #1e293b', paddingTop: 24, textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: '#334155' }}>{t.footer.copy}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
