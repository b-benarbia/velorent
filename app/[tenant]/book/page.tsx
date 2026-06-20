'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

// ── Démo — tous les types de vélos ───────────────────────────────────────────
const DEMO_BIKES: Bike[] = [
  { id:'d1', name:'Trek FX 3',          type:'CITY',     dailyRate:18, hourlyRate:3,  totalPrice:36 },
  { id:'d2', name:'Giant Trance E+',    type:'ELECTRIC', dailyRate:35, hourlyRate:6,  totalPrice:70 },
  { id:'d3', name:'Specialized Stumpjumper', type:'MOUNTAIN', dailyRate:28, hourlyRate:5, totalPrice:56 },
  { id:'d4', name:'Canyon Ultimate CF', type:'ROAD',     dailyRate:32, hourlyRate:5,  totalPrice:64 },
  { id:'d5', name:'Babboe City',        type:'CARGO',    dailyRate:40, hourlyRate:7,  totalPrice:80 },
  { id:'d6', name:'Btwin 500 Kids',     type:'KIDS',     dailyRate:12, hourlyRate:2,  totalPrice:24 },
  { id:'d7', name:'Fun2Go Tandem',      type:'TANDEM',   dailyRate:45, hourlyRate:8,  totalPrice:90 },
  { id:'d8', name:'Salsa Mukluk',       type:'FATBIKE',  dailyRate:30, hourlyRate:5,  totalPrice:60 },
  { id:'d9', name:'Haibike XDURO AllMtn', type:'EMTB',  dailyRate:42, hourlyRate:7,  totalPrice:84 },
  { id:'d10',name:'Xiaomi Pro 2',       type:'ESCOOTER', dailyRate:20, hourlyRate:4,  totalPrice:40 },
]

// ── Types ─────────────────────────────────────────────────────────────────────

interface Tenant {
  id: string; name: string; address?: string; phone?: string
  email?: string; logoUrl?: string; currency: string
  depositConfig?: Record<string, number>
  hasStripe?: boolean  // true si stripeSecretKey est configurée
}
interface Bike {
  id: string; name: string; type: string
  dailyRate: number; hourlyRate: number | null
  imageUrl?: string | null; totalPrice?: number; durationHours?: number
}
type Step = 1 | 2 | 3 | 4 | 'success'

// ── i18n ──────────────────────────────────────────────────────────────────────

const LANGS: Record<string, Record<string, string>> = {
  fr: {
    bookTitle:'Réserver un vélo', bookSubtitle:'Disponibilité en temps réel',
    step1:'Dates', step2:'Vélo', step3:'Vos infos', step4:'Confirmation',
    startDate:'Date de début', endDate:'Date de fin',
    checkAvailability:'Voir les vélos disponibles',
    availableCount:'vélos disponibles', noAvailable:'Aucun vélo disponible sur cette période',
    noAvailableHint:"Essayez d'autres dates ou contactez le shop directement.",
    perDay:'/jour', perHour:'/h', totalPrice:'Prix total estimé',
    duration:'Durée', hours:'h', days:'j',
    yourName:'Nom complet', yourEmail:'Adresse email', yourPhone:'Téléphone (optionnel)',
    confirmBooking:'Confirmer la réservation', bookingSummary:'Récapitulatif',
    from:'Du', to:'au', bike:'Vélo',
    successTitle:'Réservation envoyée !', successText:'Un email de confirmation a été envoyé à',
    successCode:'Votre code de réservation',
    successHint:'Le shop confirmera votre réservation dans les plus brefs délais.',
    newBooking:'Faire une autre réservation', back:'Retour', next:'Suivant',
    loading:'Vérification...', required:'Champ requis', invalidEmail:'Email invalide',
    contactShop:'Contacter le shop', included:'Inclus', popular:'Populaire',
    bestValue:'Meilleur rapport', premium:'Premium', recommended:'Recommandé',
  },
  en: {
    bookTitle:'Book a bike', bookSubtitle:'Real-time availability',
    step1:'Dates', step2:'Bike', step3:'Your info', step4:'Confirm',
    startDate:'Start date', endDate:'End date',
    checkAvailability:'Check availability',
    availableCount:'bikes available', noAvailable:'No bikes available for this period',
    noAvailableHint:'Try different dates or contact the shop directly.',
    perDay:'/day', perHour:'/h', totalPrice:'Estimated total',
    duration:'Duration', hours:'h', days:'d',
    yourName:'Full name', yourEmail:'Email address', yourPhone:'Phone (optional)',
    confirmBooking:'Confirm booking', bookingSummary:'Summary',
    from:'From', to:'to', bike:'Bike',
    successTitle:'Booking sent!', successText:'A confirmation email has been sent to',
    successCode:'Your booking code',
    successHint:'The shop will confirm your booking shortly.',
    newBooking:'Make another booking', back:'Back', next:'Next',
    loading:'Checking...', required:'Required field', invalidEmail:'Invalid email',
    contactShop:'Contact the shop', included:'Included', popular:'Popular',
    bestValue:'Best value', premium:'Premium', recommended:'Recommended',
  },
  es: {
    bookTitle:'Reservar una bici', bookSubtitle:'Disponibilidad en tiempo real',
    step1:'Fechas', step2:'Bici', step3:'Tus datos', step4:'Confirmar',
    startDate:'Fecha de inicio', endDate:'Fecha de fin',
    checkAvailability:'Ver bicis disponibles',
    availableCount:'bicis disponibles', noAvailable:'No hay bicis disponibles en este período',
    noAvailableHint:'Prueba otras fechas o contacta directamente con la tienda.',
    perDay:'/día', perHour:'/h', totalPrice:'Precio total estimado',
    duration:'Duración', hours:'h', days:'d',
    yourName:'Nombre completo', yourEmail:'Correo electrónico', yourPhone:'Teléfono (opcional)',
    confirmBooking:'Confirmar reserva', bookingSummary:'Resumen',
    from:'Del', to:'al', bike:'Bici',
    successTitle:'¡Reserva enviada!', successText:'Se ha enviado un email de confirmación a',
    successCode:'Tu código de reserva',
    successHint:'La tienda confirmará tu reserva en breve.',
    newBooking:'Hacer otra reserva', back:'Atrás', next:'Siguiente',
    loading:'Comprobando...', required:'Campo obligatorio', invalidEmail:'Email inválido',
    contactShop:'Contactar con la tienda', included:'Incluido', popular:'Popular',
    bestValue:'Mejor relación', premium:'Premium', recommended:'Recomendado',
  },
  de: {
    bookTitle:'Fahrrad buchen', bookSubtitle:'Echtzeit-Verfügbarkeit',
    step1:'Daten', step2:'Fahrrad', step3:'Ihre Daten', step4:'Bestätigen',
    startDate:'Startdatum', endDate:'Enddatum',
    checkAvailability:'Verfügbarkeit prüfen',
    availableCount:'Fahrräder verfügbar', noAvailable:'Keine Fahrräder verfügbar',
    noAvailableHint:'Versuchen Sie andere Daten oder kontaktieren Sie das Geschäft.',
    perDay:'/Tag', perHour:'/Std', totalPrice:'Geschätzter Gesamtpreis',
    duration:'Dauer', hours:'Std', days:'T',
    yourName:'Vollständiger Name', yourEmail:'E-Mail-Adresse', yourPhone:'Telefon (optional)',
    confirmBooking:'Buchung bestätigen', bookingSummary:'Zusammenfassung',
    from:'Von', to:'bis', bike:'Fahrrad',
    successTitle:'Buchung gesendet!', successText:'Bestätigungs-E-Mail gesendet an',
    successCode:'Ihr Buchungscode',
    successHint:'Das Geschäft wird Ihre Buchung in Kürze bestätigen.',
    newBooking:'Weitere Buchung', back:'Zurück', next:'Weiter',
    loading:'Prüfen...', required:'Pflichtfeld', invalidEmail:'Ungültige E-Mail',
    contactShop:'Geschäft kontaktieren', included:'Inklusive', popular:'Beliebt',
    bestValue:'Bestes Preis-Leistungs-Verhältnis', premium:'Premium', recommended:'Empfohlen',
  },
  it: {
    bookTitle:'Prenota una bici', bookSubtitle:'Disponibilità in tempo reale',
    step1:'Date', step2:'Bici', step3:'I tuoi dati', step4:'Conferma',
    startDate:'Data di inizio', endDate:'Data di fine',
    checkAvailability:'Verifica disponibilità',
    availableCount:'bici disponibili', noAvailable:'Nessuna bici disponibile',
    noAvailableHint:'Prova altre date o contatta direttamente il negozio.',
    perDay:'/giorno', perHour:'/h', totalPrice:'Prezzo totale stimato',
    duration:'Durata', hours:'h', days:'g',
    yourName:'Nome completo', yourEmail:'Indirizzo email', yourPhone:'Telefono (facoltativo)',
    confirmBooking:'Conferma prenotazione', bookingSummary:'Riepilogo',
    from:'Dal', to:'al', bike:'Bici',
    successTitle:'Prenotazione inviata!', successText:"Un'email di conferma è stata inviata a",
    successCode:'Il tuo codice di prenotazione',
    successHint:'Il negozio confermerà la tua prenotazione a breve.',
    newBooking:'Altra prenotazione', back:'Indietro', next:'Avanti',
    loading:'Verifica...', required:'Campo obbligatorio', invalidEmail:'Email non valida',
    contactShop:'Contatta il negozio', included:'Incluso', popular:'Popolare',
    bestValue:'Miglior rapporto', premium:'Premium', recommended:'Consigliato',
  },
  nl: {
    bookTitle:'Fiets reserveren', bookSubtitle:'Realtime beschikbaarheid',
    step1:'Data', step2:'Fiets', step3:'Uw gegevens', step4:'Bevestigen',
    startDate:'Startdatum', endDate:'Einddatum',
    checkAvailability:'Beschikbaarheid controleren',
    availableCount:'fietsen beschikbaar', noAvailable:'Geen fietsen beschikbaar',
    noAvailableHint:'Probeer andere datums of neem contact op met de winkel.',
    perDay:'/dag', perHour:'/uur', totalPrice:'Geschatte totaalprijs',
    duration:'Duur', hours:'u', days:'d',
    yourName:'Volledige naam', yourEmail:'E-mailadres', yourPhone:'Telefoon (optioneel)',
    confirmBooking:'Reservering bevestigen', bookingSummary:'Overzicht',
    from:'Van', to:'tot', bike:'Fiets',
    successTitle:'Reservering verzonden!', successText:'Een bevestigingsmail is verzonden naar',
    successCode:'Uw reserveringscode',
    successHint:'De winkel zal uw reservering spoedig bevestigen.',
    newBooking:'Nog een reservering', back:'Terug', next:'Volgende',
    loading:'Controleren...', required:'Verplicht veld', invalidEmail:'Ongeldig e-mailadres',
    contactShop:'Contact opnemen', included:'Inbegrepen', popular:'Populair',
    bestValue:'Beste prijs-kwaliteit', premium:'Premium', recommended:'Aanbevolen',
  },
  pt: {
    bookTitle:'Reservar uma bicicleta', bookSubtitle:'Disponibilidade em tempo real',
    step1:'Datas', step2:'Bicicleta', step3:'Os seus dados', step4:'Confirmar',
    startDate:'Data de início', endDate:'Data de fim',
    checkAvailability:'Ver bicicletas disponíveis',
    availableCount:'bicicletas disponíveis', noAvailable:'Nenhuma bicicleta disponível',
    noAvailableHint:'Tente outras datas ou contacte diretamente a loja.',
    perDay:'/dia', perHour:'/h', totalPrice:'Preço total estimado',
    duration:'Duração', hours:'h', days:'d',
    yourName:'Nome completo', yourEmail:'Endereço de email', yourPhone:'Telefone (opcional)',
    confirmBooking:'Confirmar reserva', bookingSummary:'Resumo',
    from:'De', to:'a', bike:'Bicicleta',
    successTitle:'Reserva enviada!', successText:'Um email de confirmação foi enviado para',
    successCode:'O seu código de reserva',
    successHint:'A loja confirmará a sua reserva em breve.',
    newBooking:'Outra reserva', back:'Voltar', next:'Seguinte',
    loading:'A verificar...', required:'Campo obrigatório', invalidEmail:'Email inválido',
    contactShop:'Contactar a loja', included:'Incluído', popular:'Popular',
    bestValue:'Melhor relação', premium:'Premium', recommended:'Recomendado',
  },
}

const BIKE_TYPE_LABELS: Record<string, Record<string, string>> = {
  fr: { CITY:'Ville', ELECTRIC:'Électrique', MOUNTAIN:'Montagne', CARGO:'Cargo', KIDS:'Enfant', ESCOOTER:'E-Scooter', ROAD:'Route', TANDEM:'Tandem', FATBIKE:'Fat Bike', EMTB:'E-MTB' },
  en: { CITY:'City', ELECTRIC:'Electric', MOUNTAIN:'Mountain', CARGO:'Cargo', KIDS:'Kids', ESCOOTER:'E-Scooter', ROAD:'Road', TANDEM:'Tandem', FATBIKE:'Fat Bike', EMTB:'E-MTB' },
  es: { CITY:'Ciudad', ELECTRIC:'Eléctrica', MOUNTAIN:'Montaña', CARGO:'Cargo', KIDS:'Niño', ESCOOTER:'Patinete', ROAD:'Carretera', TANDEM:'Tándem', FATBIKE:'Fat Bike', EMTB:'E-MTB' },
  de: { CITY:'Stadt', ELECTRIC:'Elektro', MOUNTAIN:'Gebirge', CARGO:'Cargo', KIDS:'Kinder', ESCOOTER:'E-Roller', ROAD:'Rennrad', TANDEM:'Tandem', FATBIKE:'Fat Bike', EMTB:'E-MTB' },
  it: { CITY:'Città', ELECTRIC:'Elettrica', MOUNTAIN:'Montagna', CARGO:'Cargo', KIDS:'Bambino', ESCOOTER:'Monopattino', ROAD:'Strada', TANDEM:'Tandem', FATBIKE:'Fat Bike', EMTB:'E-MTB' },
  nl: { CITY:'Stad', ELECTRIC:'Elektrisch', MOUNTAIN:'Berg', CARGO:'Cargo', KIDS:'Kind', ESCOOTER:'E-Step', ROAD:'Weg', TANDEM:'Tandem', FATBIKE:'Fat Bike', EMTB:'E-MTB' },
  pt: { CITY:'Cidade', ELECTRIC:'Elétrica', MOUNTAIN:'Montanha', CARGO:'Cargo', KIDS:'Criança', ESCOOTER:'Trotinete', ROAD:'Estrada', TANDEM:'Tandem', FATBIKE:'Fat Bike', EMTB:'E-MTB' },
}

const BIKE_DESCRIPTIONS: Record<string, Record<string, string>> = {
  fr: {
    CITY:'Confort & légèreté pour explorer la ville',
    ELECTRIC:'Pédalez moins, allez plus loin',
    MOUNTAIN:'Conçu pour les terrains difficiles',
    ROAD:'Vitesse et agilité sur bitume',
    CARGO:'Transportez tout ce dont vous avez besoin',
    KIDS:'Idéal pour les petits aventuriers',
    TANDEM:'Une expérience à partager',
    FATBIKE:'Stabilité sur tous les terrains',
    EMTB:'Électrique tout-terrain',
    ESCOOTER:'Rapide et agile en ville',
  },
  en: {
    CITY:'Comfort & lightness to explore the city',
    ELECTRIC:'Pedal less, go further',
    MOUNTAIN:'Built for challenging terrain',
    ROAD:'Speed and agility on asphalt',
    CARGO:'Carry everything you need',
    KIDS:'Perfect for little adventurers',
    TANDEM:'An experience to share',
    FATBIKE:'Stability on all terrains',
    EMTB:'Electric off-road',
    ESCOOTER:'Fast and agile in the city',
  },
  es: {
    CITY:'Comodidad y ligereza para explorar la ciudad',
    ELECTRIC:'Pedalea menos, llega más lejos',
    MOUNTAIN:'Diseñada para terrenos difíciles',
    ROAD:'Velocidad y agilidad en asfalto',
    CARGO:'Transporta todo lo que necesitas',
    KIDS:'Ideal para pequeños aventureros',
    TANDEM:'Una experiencia para compartir',
    FATBIKE:'Estabilidad en todos los terrenos',
    EMTB:'Eléctrica todoterreno',
    ESCOOTER:'Rápido y ágil en la ciudad',
  },
  de: {
    CITY:'Komfort & Leichtigkeit beim Erkunden der Stadt',
    ELECTRIC:'Weniger treten, weiter kommen',
    MOUNTAIN:'Gebaut für anspruchsvolles Gelände',
    ROAD:'Geschwindigkeit und Agilität auf Asphalt',
    CARGO:'Transportieren Sie alles, was Sie brauchen',
    KIDS:'Ideal für kleine Abenteurer',
    TANDEM:'Ein Erlebnis zum Teilen',
    FATBIKE:'Stabilität in jedem Gelände',
    EMTB:'Elektrisches Geländefahrrad',
    ESCOOTER:'Schnell und wendig in der Stadt',
  },
  it: {
    CITY:'Comfort e leggerezza per esplorare la città',
    ELECTRIC:'Pedala meno, vai più lontano',
    MOUNTAIN:'Progettata per terreni difficili',
    ROAD:'Velocità e agilità sull\'asfalto',
    CARGO:'Trasporta tutto ciò di cui hai bisogno',
    KIDS:'Perfetto per i piccoli avventurieri',
    TANDEM:'Un\'esperienza da condividere',
    FATBIKE:'Stabilità su tutti i terreni',
    EMTB:'Elettrico tutto-terreno',
    ESCOOTER:'Veloce e agile in città',
  },
  nl: {
    CITY:'Comfort & lichtheid om de stad te verkennen',
    ELECTRIC:'Minder trappen, verder komen',
    MOUNTAIN:'Gebouwd voor uitdagend terrein',
    ROAD:'Snelheid en wendbaarheid op asfalt',
    CARGO:'Vervoer alles wat je nodig hebt',
    KIDS:'Perfect voor kleine avonturiers',
    TANDEM:'Een ervaring om te delen',
    FATBIKE:'Stabiliteit op elk terrein',
    EMTB:'Elektrisch off-road',
    ESCOOTER:'Snel en wendbaar in de stad',
  },
  pt: {
    CITY:'Conforto e leveza para explorar a cidade',
    ELECTRIC:'Pedale menos, vá mais longe',
    MOUNTAIN:'Concebida para terrenos difíceis',
    ROAD:'Velocidade e agilidade no asfalto',
    CARGO:'Transporte tudo o que precisa',
    KIDS:'Ideal para os pequenos aventureiros',
    TANDEM:'Uma experiência para partilhar',
    FATBIKE:'Estabilidade em todos os terrenos',
    EMTB:'Elétrica todo-o-terreno',
    ESCOOTER:'Rápido e ágil na cidade',
  },
}

// Accessoires inclus par type (icône + label court multilingue)
const INCLUDED_ITEMS: Record<string, string[][]> = {
  CITY:     [['🪖','Casque / Helmet'], ['🔒','Antivol / Lock'], ['🗺️','Plan vélo / Map']],
  ELECTRIC: [['🪖','Casque / Helmet'], ['🔒','Antivol / Lock'], ['⚡','Chargeur / Charger']],
  MOUNTAIN: [['🪖','Casque / Helmet'], ['🔒','Antivol / Lock'], ['🛡️','Protection / Guards']],
  ROAD:     [['🪖','Casque / Helmet'], ['🔒','Antivol / Lock'], ['💨','Pompe / Pump']],
  CARGO:    [['🪖','Casque / Helmet'], ['🔒','Antivol / Lock'], ['📦','Filet / Net']],
  KIDS:     [['🪖','Casque enfant'], ['🔒','Antivol / Lock'], ['🛡️','Protège-genoux']],
  TANDEM:   [['🪖','2 Casques / Helmets'], ['🔒','Antivol / Lock'], ['🗺️','Plan vélo / Map']],
  FATBIKE:  [['🪖','Casque / Helmet'], ['🔒','Antivol / Lock'], ['🛡️','Protection / Guards']],
  EMTB:     [['🪖','Casque / Helmet'], ['🔒','Antivol / Lock'], ['⚡','Chargeur / Charger']],
  ESCOOTER: [['🪖','Casque / Helmet'], ['🔒','Antivol / Lock'], ['⚡','Chargeur / Charger']],
}

// ── Photos par défaut par type (Unsplash — licence gratuite commerciale) ─────
const BASE = 'https://images.unsplash.com'
const BIKE_DEFAULT_IMAGES: Record<string, string> = {
  CITY:     `${BASE}/photo-1723631857993-8cb71a468722?w=600&h=400&fit=crop&q=80&auto=format`,
  ELECTRIC: `${BASE}/photo-1620802051782-725fa33db067?w=600&h=400&fit=crop&q=80&auto=format`,
  MOUNTAIN: `${BASE}/photo-1673121414328-52eff37bc6d0?w=600&h=400&fit=crop&q=80&auto=format`,
  ROAD:     `${BASE}/photo-1532298229144-0ec0c57515c7?w=600&h=400&fit=crop&q=80&auto=format`,
  CARGO:    `${BASE}/photo-1745407863651-e7c49ef1c8df?w=600&h=400&fit=crop&q=80&auto=format`,
  KIDS:     `${BASE}/photo-1575550959106-5a7defe28b56?w=600&h=400&fit=crop&q=80&auto=format`,
  TANDEM:   `${BASE}/flagged/photo-1576934848835-f72df622a04b?w=600&h=400&fit=crop&q=80&auto=format`,
  FATBIKE:  `${BASE}/photo-1624243519828-52a0f2c88af3?w=600&h=400&fit=crop&q=80&auto=format`,
  EMTB:     `${BASE}/photo-1621122940876-2b3be129159c?w=600&h=400&fit=crop&q=80&auto=format`,
  ESCOOTER: `${BASE}/photo-1566936737687-8f392a237b8b?w=600&h=400&fit=crop&q=80&auto=format`,
}

// Couleur de fond pour l'illustration par type
const BIKE_COLORS: Record<string, { bg: string; accent: string; stroke: string }> = {
  CITY:     { bg: '#EEF2FF', accent: '#6366F1', stroke: '#4F46E5' },
  ELECTRIC: { bg: '#FFF7ED', accent: '#F59E0B', stroke: '#D97706' },
  MOUNTAIN: { bg: '#F0FDF4', accent: '#22C55E', stroke: '#16A34A' },
  ROAD:     { bg: '#FFF1F2', accent: '#F43F5E', stroke: '#E11D48' },
  CARGO:    { bg: '#F0F9FF', accent: '#0EA5E9', stroke: '#0284C7' },
  KIDS:     { bg: '#FDF4FF', accent: '#A855F7', stroke: '#9333EA' },
  TANDEM:   { bg: '#FFF7ED', accent: '#F97316', stroke: '#EA580C' },
  FATBIKE:  { bg: '#F0FDF4', accent: '#10B981', stroke: '#059669' },
  EMTB:     { bg: '#FFF7ED', accent: '#F59E0B', stroke: '#D97706' },
  ESCOOTER: { bg: '#EEF2FF', accent: '#6366F1', stroke: '#4F46E5' },
}

// ── Illustrations SVG par type de vélo ───────────────────────────────────────

function BikeSVG({ type, width = 110, color = '#6366F1' }: { type: string; width?: number; color?: string }) {
  const h = Math.round(width * 0.65)
  const s = 2.2  // stroke width
  const sl = 1.5 // light stroke
  const c = color
  const cl = color + '55'

  // Coordonnées de base (échelle 110×70)
  // Roues : arrière (22,50) rayon 16 / avant (88,50) rayon 16
  // BB : (54,46)  Selle-cluster : (40,27)  Tube de direction : (78,27)

  const shared = (
    <>
      {/* Roue arrière */}
      <circle cx="22" cy="50" r="15" stroke={c} strokeWidth={s} fill="none"/>
      {/* Rayon croisé arrière */}
      <line x1="22" y1="35" x2="22" y2="65" stroke={cl} strokeWidth={sl}/>
      <line x1="7"  y1="50" x2="37" y2="50" stroke={cl} strokeWidth={sl}/>
      {/* Roue avant */}
      <circle cx="88" cy="50" r="15" stroke={c} strokeWidth={s} fill="none"/>
      <line x1="88" y1="35" x2="88" y2="65" stroke={cl} strokeWidth={sl}/>
      <line x1="73" y1="50" x2="103" y2="50" stroke={cl} strokeWidth={sl}/>
      {/* Moyeu arrière */}
      <circle cx="22" cy="50" r="2.5" fill={c}/>
      <circle cx="88" cy="50" r="2.5" fill={c}/>
      {/* Pédalier */}
      <circle cx="54" cy="46" r="3" fill={c}/>
    </>
  )

  // Cadre standard (base commune)
  const frame = (
    <>
      {/* Haubans arrière */}
      <line x1="22" y1="50" x2="40" y2="27" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      {/* Bases arrière */}
      <line x1="22" y1="50" x2="54" y2="46" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      {/* Tube de selle */}
      <line x1="54" y1="46" x2="40" y2="27" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      {/* Tube diagonal */}
      <line x1="54" y1="46" x2="78" y2="27" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      {/* Tube supérieur */}
      <line x1="40" y1="27" x2="78" y2="27" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      {/* Fourche */}
      <line x1="78" y1="27" x2="88" y2="50" stroke={c} strokeWidth={s} strokeLinecap="round"/>
    </>
  )

  if (type === 'CITY') return (
    <svg viewBox="0 0 110 70" width={width} height={h} fill="none" xmlns="http://www.w3.org/2000/svg">
      {shared}{frame}
      {/* Selle droite */}
      <line x1="40" y1="27" x2="40" y2="20" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="33" y1="20" x2="47" y2="20" stroke={c} strokeWidth={s+0.5} strokeLinecap="round"/>
      {/* Guidon ville (droit) */}
      <line x1="78" y1="27" x2="78" y2="18" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="73" y1="18" x2="83" y2="18" stroke={c} strokeWidth={s+0.5} strokeLinecap="round"/>
      {/* Panier avant */}
      <rect x="82" y="16" width="13" height="9" rx="2" stroke={c} strokeWidth={sl} fill={cl}/>
      <line x1="84" y1="16" x2="84" y2="25" stroke={c} strokeWidth={sl}/>
      <line x1="88" y1="16" x2="88" y2="25" stroke={c} strokeWidth={sl}/>
    </svg>
  )

  if (type === 'ELECTRIC' || type === 'EMTB') return (
    <svg viewBox="0 0 110 70" width={width} height={h} fill="none" xmlns="http://www.w3.org/2000/svg">
      {shared}{frame}
      {/* Selle */}
      <line x1="40" y1="27" x2="40" y2="20" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="33" y1="20" x2="47" y2="20" stroke={c} strokeWidth={s+0.5} strokeLinecap="round"/>
      {/* Guidon plat */}
      <line x1="78" y1="27" x2="78" y2="20" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="73" y1="20" x2="83" y2="20" stroke={c} strokeWidth={s+0.5} strokeLinecap="round"/>
      {/* Batterie sur le tube diagonal */}
      <rect x="60" y="31" width="12" height="7" rx="2" fill={c} opacity="0.9"/>
      <rect x="72" y="33" width="2" height="3" rx="1" fill={c}/>
      <line x1="62" y1="34.5" x2="69" y2="34.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Éclair */}
      <path d="M65 26 L62 31 L65 31 L62 36" stroke={c} strokeWidth={sl+0.3} strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  )

  if (type === 'MOUNTAIN') return (
    <svg viewBox="0 0 110 70" width={width} height={h} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Pneus plus épais */}
      <circle cx="22" cy="50" r="15" stroke={c} strokeWidth={s+1.5} fill="none"/>
      <circle cx="88" cy="50" r="15" stroke={c} strokeWidth={s+1.5} fill="none"/>
      <circle cx="22" cy="50" r="2.5" fill={c}/>
      <circle cx="88" cy="50" r="2.5" fill={c}/>
      <circle cx="54" cy="46" r="3" fill={c}/>
      {/* Rayons */}
      <line x1="22" y1="35" x2="22" y2="65" stroke={cl} strokeWidth={sl}/>
      <line x1="7"  y1="50" x2="37" y2="50" stroke={cl} strokeWidth={sl}/>
      <line x1="88" y1="35" x2="88" y2="65" stroke={cl} strokeWidth={sl}/>
      <line x1="73" y1="50" x2="103" y2="50" stroke={cl} strokeWidth={sl}/>
      {frame}
      {/* Selle */}
      <line x1="40" y1="27" x2="40" y2="19" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="33" y1="19" x2="47" y2="19" stroke={c} strokeWidth={s+0.5} strokeLinecap="round"/>
      {/* Guidon VTT plat avec poignées */}
      <line x1="78" y1="27" x2="78" y2="19" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="70" y1="19" x2="86" y2="19" stroke={c} strokeWidth={s+1} strokeLinecap="round"/>
      <line x1="70" y1="17" x2="70" y2="21" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="86" y1="17" x2="86" y2="21" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      {/* Amortisseur fourche */}
      <line x1="80" y1="32" x2="84" y2="42" stroke={c} strokeWidth={s-0.5} strokeLinecap="round"/>
      <line x1="82" y1="32" x2="86" y2="42" stroke={c} strokeWidth={s-0.5} strokeLinecap="round"/>
      <line x1="80" y1="37" x2="86" y2="37" stroke={c} strokeWidth={sl} strokeLinecap="round"/>
    </svg>
  )

  if (type === 'ROAD') return (
    <svg viewBox="0 0 110 70" width={width} height={h} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Pneus fins */}
      <circle cx="22" cy="50" r="15" stroke={c} strokeWidth={sl+0.5} fill="none"/>
      <circle cx="88" cy="50" r="15" stroke={c} strokeWidth={sl+0.5} fill="none"/>
      <circle cx="22" cy="50" r="2" fill={c}/>
      <circle cx="88" cy="50" r="2" fill={c}/>
      <circle cx="54" cy="46" r="2.5" fill={c}/>
      <line x1="22" y1="35" x2="22" y2="65" stroke={cl} strokeWidth={sl}/>
      <line x1="7"  y1="50" x2="37" y2="50" stroke={cl} strokeWidth={sl}/>
      <line x1="88" y1="35" x2="88" y2="65" stroke={cl} strokeWidth={sl}/>
      <line x1="73" y1="50" x2="103" y2="50" stroke={cl} strokeWidth={sl}/>
      {/* Cadre plus incliné course */}
      <line x1="22" y1="50" x2="42" y2="29" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="22" y1="50" x2="54" y2="46" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="54" y1="46" x2="42" y2="29" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="54" y1="46" x2="80" y2="24" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="42" y1="29" x2="80" y2="24" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="80" y1="24" x2="88" y2="50" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      {/* Selle basse */}
      <line x1="42" y1="29" x2="38" y2="23" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="33" y1="23" x2="42" y2="23" stroke={c} strokeWidth={s+0.5} strokeLinecap="round"/>
      {/* Cintre dropped (guidon course) */}
      <line x1="80" y1="24" x2="82" y2="17" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <path d="M79 17 Q84 17 84 23" stroke={c} strokeWidth={s} fill="none" strokeLinecap="round"/>
      <path d="M74 17 Q79 17 79 23" stroke={c} strokeWidth={s} fill="none" strokeLinecap="round"/>
    </svg>
  )

  if (type === 'CARGO') return (
    <svg viewBox="0 0 120 70" width={width} height={h} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="28" cy="50" r="14" stroke={c} strokeWidth={s} fill="none"/>
      <circle cx="94" cy="50" r="14" stroke={c} strokeWidth={s} fill="none"/>
      <line x1="28" y1="36" x2="28" y2="64" stroke={cl} strokeWidth={sl}/>
      <line x1="14" y1="50" x2="42" y2="50" stroke={cl} strokeWidth={sl}/>
      <line x1="94" y1="36" x2="94" y2="64" stroke={cl} strokeWidth={sl}/>
      <line x1="80" y1="50" x2="108" y2="50" stroke={cl} strokeWidth={sl}/>
      <circle cx="28" cy="50" r="2.5" fill={c}/>
      <circle cx="94" cy="50" r="2.5" fill={c}/>
      <circle cx="62" cy="46" r="3" fill={c}/>
      {/* Cadre cargo allongé */}
      <line x1="28" y1="50" x2="48" y2="30" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="28" y1="50" x2="62" y2="46" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="62" y1="46" x2="48" y2="30" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="62" y1="46" x2="84" y2="28" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="48" y1="30" x2="84" y2="28" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="84" y1="28" x2="94" y2="50" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      {/* Selle */}
      <line x1="48" y1="30" x2="45" y2="22" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="38" y1="22" x2="52" y2="22" stroke={c} strokeWidth={s+0.5} strokeLinecap="round"/>
      {/* Guidon */}
      <line x1="84" y1="28" x2="85" y2="20" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="80" y1="20" x2="90" y2="20" stroke={c} strokeWidth={s+0.5} strokeLinecap="round"/>
      {/* Caisse cargo avant */}
      <rect x="6" y="28" width="25" height="18" rx="3" stroke={c} strokeWidth={s} fill={cl}/>
      <line x1="10" y1="28" x2="10" y2="46" stroke={c} strokeWidth={sl}/>
      <line x1="18" y1="28" x2="18" y2="46" stroke={c} strokeWidth={sl}/>
      <line x1="26" y1="28" x2="26" y2="46" stroke={c} strokeWidth={sl}/>
    </svg>
  )

  if (type === 'KIDS') return (
    <svg viewBox="0 0 90 70" width={Math.round(width * 0.82)} height={h} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Petites roues */}
      <circle cx="18" cy="50" r="12" stroke={c} strokeWidth={s} fill="none"/>
      <circle cx="72" cy="50" r="12" stroke={c} strokeWidth={s} fill="none"/>
      <line x1="18" y1="38" x2="18" y2="62" stroke={cl} strokeWidth={sl}/>
      <line x1="6"  y1="50" x2="30" y2="50" stroke={cl} strokeWidth={sl}/>
      <line x1="72" y1="38" x2="72" y2="62" stroke={cl} strokeWidth={sl}/>
      <line x1="60" y1="50" x2="84" y2="50" stroke={cl} strokeWidth={sl}/>
      <circle cx="18" cy="50" r="2" fill={c}/>
      <circle cx="72" cy="50" r="2" fill={c}/>
      <circle cx="44" cy="48" r="2.5" fill={c}/>
      {/* Cadre enfant (compact) */}
      <line x1="18" y1="50" x2="34" y2="32" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="18" y1="50" x2="44" y2="48" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="44" y1="48" x2="34" y2="32" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="44" y1="48" x2="64" y2="30" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="34" y1="32" x2="64" y2="30" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="64" y1="30" x2="72" y2="50" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      {/* Selle colorée */}
      <line x1="34" y1="32" x2="32" y2="25" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="27" y1="25" x2="37" y2="25" stroke={c} strokeWidth={s+1} strokeLinecap="round"/>
      {/* Guidon enfant */}
      <line x1="64" y1="30" x2="65" y2="22" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="60" y1="22" x2="70" y2="22" stroke={c} strokeWidth={s+0.5} strokeLinecap="round"/>
      {/* Étoile déco */}
      <text x="50" y="18" fontSize="10" fill={c} opacity="0.6" textAnchor="middle">★</text>
      {/* Stabilisateur */}
      <line x1="60" y1="50" x2="55" y2="60" stroke={c} strokeWidth={sl} strokeLinecap="round"/>
      <circle cx="55" cy="60" r="4" stroke={c} strokeWidth={sl} fill="none"/>
    </svg>
  )

  if (type === 'TANDEM') return (
    <svg viewBox="0 0 140 70" width={Math.round(width * 1.27)} height={h} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="22" cy="50" r="14" stroke={c} strokeWidth={s} fill="none"/>
      <circle cx="118" cy="50" r="14" stroke={c} strokeWidth={s} fill="none"/>
      <line x1="22" y1="36" x2="22" y2="64" stroke={cl} strokeWidth={sl}/>
      <line x1="8" y1="50"  x2="36" y2="50" stroke={cl} strokeWidth={sl}/>
      <line x1="118" y1="36" x2="118" y2="64" stroke={cl} strokeWidth={sl}/>
      <line x1="104" y1="50" x2="132" y2="50" stroke={cl} strokeWidth={sl}/>
      <circle cx="22" cy="50" r="2.5" fill={c}/>
      <circle cx="118" cy="50" r="2.5" fill={c}/>
      <circle cx="60" cy="46" r="3" fill={c}/>
      <circle cx="88" cy="46" r="3" fill={c}/>
      {/* Cadre tandem allongé */}
      <line x1="22" y1="50" x2="44" y2="28" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="22" y1="50" x2="60" y2="46" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="60" y1="46" x2="44" y2="28" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="60" y1="46" x2="88" y2="46" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="44" y1="28" x2="70" y2="28" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="70" y1="28" x2="88" y2="46" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="88" y1="46" x2="106" y2="28" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="70" y1="28" x2="106" y2="28" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="106" y1="28" x2="118" y2="50" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      {/* Selles */}
      <line x1="44" y1="28" x2="42" y2="21" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="36" y1="21" x2="48" y2="21" stroke={c} strokeWidth={s+0.5} strokeLinecap="round"/>
      <line x1="70" y1="28" x2="68" y2="21" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="62" y1="21" x2="74" y2="21" stroke={c} strokeWidth={s+0.5} strokeLinecap="round"/>
      {/* Guidon */}
      <line x1="106" y1="28" x2="108" y2="20" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="103" y1="20" x2="113" y2="20" stroke={c} strokeWidth={s+0.5} strokeLinecap="round"/>
    </svg>
  )

  if (type === 'FATBIKE') return (
    <svg viewBox="0 0 110 70" width={width} height={h} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Pneus très épais */}
      <circle cx="22" cy="50" r="16" stroke={c} strokeWidth={4} fill="none"/>
      <circle cx="88" cy="50" r="16" stroke={c} strokeWidth={4} fill="none"/>
      <circle cx="22" cy="50" r="2.5" fill={c}/>
      <circle cx="88" cy="50" r="2.5" fill={c}/>
      <circle cx="54" cy="46" r="3" fill={c}/>
      <line x1="22" y1="34" x2="22" y2="66" stroke={cl} strokeWidth={sl}/>
      <line x1="6" y1="50" x2="38" y2="50" stroke={cl} strokeWidth={sl}/>
      <line x1="88" y1="34" x2="88" y2="66" stroke={cl} strokeWidth={sl}/>
      <line x1="72" y1="50" x2="104" y2="50" stroke={cl} strokeWidth={sl}/>
      {frame}
      {/* Selle */}
      <line x1="40" y1="27" x2="40" y2="20" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="33" y1="20" x2="47" y2="20" stroke={c} strokeWidth={s+0.5} strokeLinecap="round"/>
      {/* Guidon plat large */}
      <line x1="78" y1="27" x2="78" y2="19" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="69" y1="19" x2="87" y2="19" stroke={c} strokeWidth={s+1} strokeLinecap="round"/>
    </svg>
  )

  if (type === 'ESCOOTER') return (
    <svg viewBox="0 0 110 70" width={width} height={h} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="22" cy="54" r="12" stroke={c} strokeWidth={s} fill="none"/>
      <circle cx="78" cy="54" r="12" stroke={c} strokeWidth={s} fill="none"/>
      <circle cx="22" cy="54" r="2" fill={c}/>
      <circle cx="78" cy="54" r="2" fill={c}/>
      <line x1="22" y1="42" x2="22" y2="66" stroke={cl} strokeWidth={sl}/>
      <line x1="10" y1="54" x2="34" y2="54" stroke={cl} strokeWidth={sl}/>
      <line x1="78" y1="42" x2="78" y2="66" stroke={cl} strokeWidth={sl}/>
      <line x1="66" y1="54" x2="90" y2="54" stroke={cl} strokeWidth={sl}/>
      {/* Plateforme */}
      <rect x="22" y="50" width="56" height="5" rx="2" stroke={c} strokeWidth={s} fill={cl}/>
      {/* Tige */}
      <line x1="60" y1="50" x2="68" y2="18" stroke={c} strokeWidth={s+0.5} strokeLinecap="round"/>
      {/* Guidon trottinette */}
      <line x1="65" y1="18" x2="71" y2="18" stroke={c} strokeWidth={s+1} strokeLinecap="round"/>
      {/* Batterie */}
      <rect x="36" y="45" width="14" height="5" rx="1" fill={c}/>
      {/* Éclair */}
      <path d="M45 32 L42 38 L45 38 L42 44" stroke={c} strokeWidth={sl+0.3} strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  )

  // Fallback (même que CITY)
  return (
    <svg viewBox="0 0 110 70" width={width} height={h} fill="none" xmlns="http://www.w3.org/2000/svg">
      {shared}{frame}
      <line x1="40" y1="27" x2="40" y2="20" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="33" y1="20" x2="47" y2="20" stroke={c} strokeWidth={s+0.5} strokeLinecap="round"/>
      <line x1="78" y1="27" x2="78" y2="18" stroke={c} strokeWidth={s} strokeLinecap="round"/>
      <line x1="73" y1="18" x2="83" y2="18" stroke={c} strokeWidth={s+0.5} strokeLinecap="round"/>
    </svg>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function detectLang(): string {
  if (typeof navigator === 'undefined') return 'en'
  const lang = navigator.language?.slice(0, 2).toLowerCase()
  return LANGS[lang] ? lang : 'en'
}

function fmtDateTime(d: Date, lang: string): string {
  return d.toLocaleString(lang + '-' + lang.toUpperCase(), {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function fmtDuration(hours: number, t: Record<string, string>): string {
  if (hours < 24) return `${Math.round(hours)}${t.hours}`
  const days = Math.ceil(hours / 24)
  return `${days} ${t.days}`
}

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function getDefaultStart(): Date {
  const d = new Date()
  d.setHours(d.getHours() + 1, 0, 0, 0)
  return d
}

function getDefaultEnd(start: Date): Date {
  const d = new Date(start)
  d.setDate(d.getDate() + 1)
  return d
}

// Badge logique : meilleur rapport = le moins cher, premium = le plus cher (si électrique)
function getBadge(bike: Bike, allBikes: Bike[], t: Record<string, string>): { label: string; bg: string; color: string } | null {
  if (allBikes.length === 1) return { label: t.recommended, bg: '#6366F1', color: '#fff' }
  const prices = allBikes.map(b => b.totalPrice ?? 0).filter(p => p > 0)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  if ((bike.totalPrice ?? 0) === minPrice) return { label: t.bestValue, bg: '#10B981', color: '#fff' }
  if ((bike.totalPrice ?? 0) === maxPrice && (bike.type === 'ELECTRIC' || bike.type === 'EMTB')) return { label: t.premium, bg: '#F59E0B', color: '#fff' }
  if (allBikes.indexOf(bike) === 0 && allBikes.length >= 3) return { label: t.popular, bg: '#6366F1', color: '#fff' }
  return null
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function BookPage() {
  const params       = useParams()
  const searchParams = useSearchParams()
  const tenantSlug   = params?.tenant as string
  const isPreview    = searchParams?.get('preview') === '1'

  const [lang, setLang]         = useState('en')
  const paymentResult = searchParams?.get('payment')
  const [step, setStep]         = useState<Step>(isPreview ? 2 : paymentResult === 'success' ? 'success' : 1)
  const [tenant, setTenant]     = useState<Tenant | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const [startAt, setStartAt]   = useState<Date>(getDefaultStart)
  const [endAt, setEndAt]       = useState<Date>(() => getDefaultEnd(getDefaultStart()))
  const [bikes, setBikes]       = useState<Bike[]>(isPreview ? DEMO_BIKES : [])

  const [selectedBike, setSelectedBike] = useState<Bike | null>(null)
  const [form, setForm]         = useState({ name: '', email: '', phone: '' })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [confirmationCode, setConfirmationCode] = useState('')

  const t           = LANGS[lang]          ?? LANGS['en']
  const bikeLabels  = BIKE_TYPE_LABELS[lang] ?? BIKE_TYPE_LABELS['en']
  const bikeDescs   = BIKE_DESCRIPTIONS[lang] ?? BIKE_DESCRIPTIONS['en']

  const PURPLE      = '#6366F1'
  const PURPLE_DARK = '#4F46E5'
  const PURPLE_LIGHT= '#EEF2FF'

  useEffect(() => { setLang(detectLang()) }, [])

  useEffect(() => {
    if (isPreview) {
      setTenant({ id:'demo', name:'VeloRent Demo', address:'Valencia, España', phone:'+34 600 000 000', currency:'EUR' })
      return
    }
    if (!tenantSlug) return
    fetch(`/api/public/${tenantSlug}/availability`)
      .then(r => r.json())
      .then(d => { if (d.tenant) setTenant(d.tenant) })
      .catch(() => {})
  }, [tenantSlug, isPreview])

  const searchAvailability = useCallback(async () => {
    if (!tenantSlug || endAt <= startAt) return
    setLoading(true); setError('')
    try {
      const url = `/api/public/${tenantSlug}/availability?startAt=${startAt.toISOString()}&endAt=${endAt.toISOString()}`
      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erreur'); return }
      setBikes(data.bikes ?? [])
      setStep(2)
    } catch { setError('Erreur réseau') }
    finally { setLoading(false) }
  }, [tenantSlug, startAt, endAt])

  const submitReservation = useCallback(async () => {
    const errs: Record<string, string> = {}
    if (!form.name.trim())  errs.name  = t.required
    if (!form.email.trim()) errs.email = t.required
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = t.invalidEmail
    setFormErrors(errs)
    if (Object.keys(errs).length > 0) return
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/public/${tenantSlug}/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bikeId:        selectedBike?.id,
          bikeType:      selectedBike?.type,
          startAt:       startAt.toISOString(),
          endAt:         endAt.toISOString(),
          customerName:  form.name,
          customerEmail: form.email,
          customerPhone: form.phone || undefined,
          totalPrice:    selectedBike?.totalPrice,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erreur'); return }
      setConfirmationCode(data.confirmationCode)
      setStep('success')
    } catch { setError('Erreur réseau') }
    finally { setLoading(false) }
  }, [tenantSlug, form, selectedBike, startAt, endAt, t])

  const resetBooking = () => {
    setStep(1); setBikes([]); setSelectedBike(null)
    setForm({ name: '', email: '', phone: '' }); setFormErrors({})
    setConfirmationCode(''); setError('')
    setStartAt(getDefaultStart()); setEndAt(getDefaultEnd(getDefaultStart()))
  }

  const currency     = tenant?.currency ?? 'EUR'
  const durationHours = (endAt.getTime() - startAt.getTime()) / 3600000
  const steps        = [t.step1, t.step2, t.step3, t.step4]
  const currentStepIndex = step === 'success' ? 4 : (step as number) - 1

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #f8faff 0%, #eef2ff 100%)', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* ── Bannière preview ── */}
      {isPreview && (
        <div style={{ background: 'linear-gradient(90deg, #f59e0b, #d97706)', color: 'white', textAlign: 'center', padding: '8px 16px', fontSize: 12, fontWeight: 700, letterSpacing: '0.05em' }}>
          MODE APERÇU — Toutes les catégories de vélos · Données fictives
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {tenant?.logoUrl ? (
            <img src={tenant.logoUrl} alt={tenant.name} style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 36, height: 36, background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_DARK})`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BikeSVG type="CITY" width={22} color="white"/>
            </div>
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{tenant?.name ?? '...'}</div>
            {tenant?.address && <div style={{ fontSize: 11, color: '#94a3b8' }}>{tenant.address}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Sélecteur de langue */}
          <select
            value={lang}
            onChange={e => setLang(e.target.value)}
            style={{ fontSize: 13, fontWeight: 600, color: '#374151', background: '#f8fafc', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', outline: 'none' }}
          >
            <option value="fr">🇫🇷 FR</option>
            <option value="en">🇬🇧 EN</option>
            <option value="es">🇪🇸 ES</option>
            <option value="de">🇩🇪 DE</option>
            <option value="it">🇮🇹 IT</option>
            <option value="nl">🇳🇱 NL</option>
            <option value="pt">🇵🇹 PT</option>
          </select>
          {tenant?.phone && (
            <a href={`tel:${tenant.phone}`} style={{ color: PURPLE, fontSize: 13, fontWeight: 600, textDecoration: 'none', background: PURPLE_LIGHT, padding: '6px 12px', borderRadius: 8 }}>
              {tenant.phone}
            </a>
          )}
        </div>
      </div>

      {/* ── Stepper ── */}
      {step !== 'success' && (
        <div style={{ background: 'white', borderBottom: '1px solid #f1f5f9', padding: '0 20px' }}>
          <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex' }}>
            {steps.map((label, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', padding: '12px 4px', position: 'relative' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', margin: '0 auto 4px',
                  background: i <= currentStepIndex ? PURPLE : '#e5e7eb',
                  color: i <= currentStepIndex ? 'white' : '#9ca3af',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, transition: 'all 0.3s',
                  boxShadow: i === currentStepIndex ? `0 0 0 4px ${PURPLE_LIGHT}` : 'none',
                }}>
                  {i < currentStepIndex ? '✓' : i + 1}
                </div>
                <div style={{ fontSize: 11, color: i <= currentStepIndex ? PURPLE : '#9ca3af', fontWeight: i === currentStepIndex ? 700 : 400 }}>
                  {label}
                </div>
                {i < steps.length - 1 && (
                  <div style={{ position: 'absolute', top: 26, left: '60%', right: '-40%', height: 2, background: i < currentStepIndex ? PURPLE : '#e5e7eb', transition: 'background 0.3s' }}/>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 16px' }}>

        {/* Error */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 16, color: '#dc2626', fontSize: 14 }}>
            {error}
          </div>
        )}

        {/* ── STEP 1 : Dates ── */}
        {step === 1 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>{t.bookTitle}</h1>
              <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>{t.bookSubtitle}</p>
            </div>
            <div style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'grid', gap: 18 }}>
                {[
                  { label: t.startDate, val: startAt, onChange: (d: Date) => { setStartAt(d); if (d >= endAt) setEndAt(getDefaultEnd(d)) } },
                  { label: t.endDate,   val: endAt,   onChange: (d: Date) => { if (d > startAt) setEndAt(d) }, min: new Date(startAt.getTime() + 3600000) },
                ].map(({ label, val, onChange, min }) => (
                  <div key={label}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 7 }}>{label}</label>
                    <input type="datetime-local" value={toLocalInputValue(val)}
                      min={min ? toLocalInputValue(min) : toLocalInputValue(new Date())}
                      onChange={e => { const d = new Date(e.target.value); if (!isNaN(d.getTime())) onChange(d) }}
                      style={{ width: '100%', padding: '13px 15px', borderRadius: 12, border: '1.5px solid #e5e7eb', fontSize: 15, outline: 'none', boxSizing: 'border-box', color: '#0f172a', background: '#fafbff' }}
                      onFocus={e => e.target.style.borderColor = PURPLE}
                      onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                    />
                  </div>
                ))}
                {endAt > startAt && (
                  <div style={{ background: PURPLE_LIGHT, borderRadius: 10, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: PURPLE, fontSize: 13, fontWeight: 600 }}>{t.duration}</span>
                    <span style={{ color: PURPLE_DARK, fontSize: 14, fontWeight: 700 }}>{fmtDuration(durationHours, t)}</span>
                  </div>
                )}
                <button onClick={searchAvailability} disabled={loading || endAt <= startAt}
                  style={{ background: loading ? '#c7d2fe' : `linear-gradient(135deg, ${PURPLE}, ${PURPLE_DARK})`, color: 'white', border: 'none', borderRadius: 14, padding: '16px', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 16px rgba(99,102,241,0.35)', width: '100%', transition: 'all 0.2s' }}>
                  {loading ? t.loading : t.checkAvailability}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2 : Vélos ── */}
        {step === 2 && (
          <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <p style={{ color: '#94a3b8', fontSize: 12, margin: '0 0 2px' }}>
                  {fmtDateTime(startAt, lang)} — {fmtDateTime(endAt, lang)}
                </p>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {bikes.length} {t.availableCount}
                </h2>
              </div>
              <button onClick={() => setStep(1)} style={{ background: 'white', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                ← {t.back}
              </button>
            </div>

            {bikes.length === 0 ? (
              <div style={{ background: 'white', borderRadius: 20, padding: 40, textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>😔</div>
                <h3 style={{ color: '#0f172a', margin: '0 0 8px' }}>{t.noAvailable}</h3>
                <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 20px' }}>{t.noAvailableHint}</p>
                <button onClick={() => setStep(1)} style={{ background: PURPLE_LIGHT, color: PURPLE, border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  ← {t.back}
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {bikes.map(bike => {
                  const colors = BIKE_COLORS[bike.type] ?? BIKE_COLORS['CITY']
                  const badge  = getBadge(bike, bikes, t)
                  const imgSrc = bike.imageUrl || BIKE_DEFAULT_IMAGES[bike.type]

                  return (
                    <div key={bike.id}
                      onClick={() => { setSelectedBike(bike); setStep(3) }}
                      style={{ borderRadius: 16, overflow: 'hidden', background: 'white', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', border: '1.5px solid #f1f5f9', cursor: 'pointer', transition: 'all 0.22s' }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = `0 12px 36px ${colors.accent}20`; el.style.borderColor = colors.accent }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'none'; el.style.boxShadow = '0 2px 16px rgba(0,0,0,0.07)'; el.style.borderColor = '#f1f5f9' }}
                    >
                      {/* Photo plein cadre */}
                      <div style={{ position: 'relative', height: 130, overflow: 'hidden', background: colors.bg }}>
                        {imgSrc ? (
                          <img src={imgSrc} alt={bike.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <BikeSVG type={bike.type} width={90} color={colors.stroke}/>
                          </div>
                        )}
                        {/* Gradient bas pour lisibilité */}
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.28) 0%, transparent 55%)' }}/>
                        {/* Badge */}
                        {badge && (
                          <div style={{ position: 'absolute', top: 10, left: 10, background: badge.bg, color: badge.color, fontSize: 9, fontWeight: 800, padding: '4px 9px', borderRadius: 20, letterSpacing: '0.04em', textTransform: 'uppercase', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                            {badge.label}
                          </div>
                        )}
                        {/* Prix flottant bas-droite sur l'image */}
                        {bike.totalPrice != null && (
                          <div style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(255,255,255,0.95)', color: '#0f172a', fontWeight: 800, fontSize: 15, padding: '4px 10px', borderRadius: 10, backdropFilter: 'blur(8px)', lineHeight: 1 }}>
                            {bike.totalPrice}{currency}
                          </div>
                        )}
                      </div>

                      {/* Infos minimalistes */}
                      <div style={{ padding: '11px 13px 13px' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: colors.accent, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
                          {bikeLabels[bike.type] ?? bike.type}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', lineHeight: 1.3, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {bike.name}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>
                          {bike.dailyRate}{currency}{t.perDay}
                          {bike.hourlyRate ? ` · ${bike.hourlyRate}${currency}${t.perHour}` : ''}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3 : Infos client ── */}
        {step === 3 && selectedBike && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <button onClick={() => setStep(2)} style={{ background: '#f8fafc', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                ← {t.back}
              </button>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>{t.step3}</h2>
            </div>

            {/* Récap vélo — carte compacte avec photo */}
            {(() => {
              const sc = BIKE_COLORS[selectedBike.type] ?? BIKE_COLORS['CITY']
              const sImg = selectedBike.imageUrl || BIKE_DEFAULT_IMAGES[selectedBike.type]
              const inclus = INCLUDED_ITEMS[selectedBike.type] ?? INCLUDED_ITEMS['CITY']
              return (
                <div style={{ borderRadius: 16, overflow: 'hidden', background: 'white', boxShadow: '0 2px 16px rgba(0,0,0,0.08)', border: `1.5px solid ${sc.accent}22`, marginBottom: 20 }}>
                  {/* Photo */}
                  <div style={{ position: 'relative', height: 110, background: sc.bg, overflow: 'hidden' }}>
                    {sImg ? (
                      <img src={sImg} alt={selectedBike.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <BikeSVG type={selectedBike.type} width={80} color={sc.stroke}/>
                      </div>
                    )}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 50%)' }}/>
                    <div style={{ position: 'absolute', bottom: 12, left: 14, right: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div>
                        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{bikeLabels[selectedBike.type] ?? selectedBike.type}</div>
                        <div style={{ color: 'white', fontWeight: 800, fontSize: 15, lineHeight: 1.2 }}>{selectedBike.name}</div>
                      </div>
                      {selectedBike.totalPrice != null && (
                        <div style={{ background: 'rgba(255,255,255,0.95)', color: '#0f172a', fontWeight: 800, fontSize: 16, padding: '5px 12px', borderRadius: 10 }}>
                          {selectedBike.totalPrice}{currency}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Dates + Inclus */}
                  <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ color: '#64748b', fontSize: 12 }}>
                      {fmtDateTime(startAt, lang)} → {fmtDateTime(endAt, lang)}
                    </div>
                  </div>
                </div>
              )
            })()}

            <div style={{ background: 'white', borderRadius: 18, padding: 22, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'grid', gap: 18 }}>
                {[
                  { key: 'name',  label: t.yourName,  type: 'text',  required: true },
                  { key: 'email', label: t.yourEmail, type: 'email', required: true },
                  { key: 'phone', label: t.yourPhone, type: 'tel',   required: false },
                ].map(({ key, label, type, required }) => (
                  <div key={key}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 7 }}>
                      {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
                    </label>
                    <input type={type} value={form[key as keyof typeof form]}
                      onChange={e => { setForm(f => ({ ...f, [key]: e.target.value })); setFormErrors(fe => ({ ...fe, [key]: '' })) }}
                      style={{ width: '100%', padding: '13px 15px', borderRadius: 12, fontSize: 15, border: `1.5px solid ${formErrors[key] ? '#fca5a5' : '#e5e7eb'}`, outline: 'none', boxSizing: 'border-box', color: '#0f172a', background: formErrors[key] ? '#fef2f2' : '#fafbff' }}
                      onFocus={e => { if (!formErrors[key]) e.target.style.borderColor = PURPLE }}
                      onBlur={e => { if (!formErrors[key]) e.target.style.borderColor = '#e5e7eb' }}
                    />
                    {formErrors[key] && <p style={{ color: '#dc2626', fontSize: 12, margin: '4px 0 0' }}>{formErrors[key]}</p>}
                  </div>
                ))}
                <button
                  style={{ background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_DARK})`, color: 'white', border: 'none', borderRadius: 14, padding: '15px', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(99,102,241,0.35)', width: '100%' }}
                  onClick={() => {
                    const errs: Record<string, string> = {}
                    if (!form.name.trim()) errs.name = t.required
                    if (!form.email.trim()) errs.email = t.required
                    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = t.invalidEmail
                    setFormErrors(errs)
                    if (Object.keys(errs).length === 0) setStep(4)
                  }}
                >
                  {t.next} →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4 : Récapitulatif + Paiement ── */}
        {step === 4 && selectedBike && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <button onClick={() => setStep(3)} style={{ background: '#f8fafc', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                ← {t.back}
              </button>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>{t.bookingSummary}</h2>
            </div>

            {/* Récap */}
            <div style={{ background: 'white', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', marginBottom: 14 }}>
              {/* Photo header */}
              {(() => {
                const sc = BIKE_COLORS[selectedBike.type] ?? BIKE_COLORS['CITY']
                const sImg = selectedBike.imageUrl || BIKE_DEFAULT_IMAGES[selectedBike.type]
                return (
                  <div style={{ position: 'relative', height: 100, background: sc.bg, overflow: 'hidden' }}>
                    {sImg && <img src={sImg} alt={selectedBike.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.55), rgba(0,0,0,0.2))' }}/>
                    <div style={{ position: 'absolute', inset: 0, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>{bikeLabels[selectedBike.type] ?? selectedBike.type}</div>
                        <div style={{ fontWeight: 800, color: 'white', fontSize: 17 }}>{selectedBike.name}</div>
                      </div>
                      {selectedBike.totalPrice != null && (
                        <div style={{ background: 'rgba(255,255,255,0.95)', color: '#0f172a', fontWeight: 800, fontSize: 18, padding: '6px 14px', borderRadius: 12 }}>
                          {selectedBike.totalPrice} {currency}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}

              <div style={{ padding: '14px 20px' }}>
                {[
                  { label: t.from,      value: fmtDateTime(startAt, lang) },
                  { label: t.to,        value: fmtDateTime(endAt, lang) },
                  { label: t.duration,  value: fmtDuration(durationHours, t) },
                  { label: t.yourName,  value: form.name },
                  { label: t.yourEmail, value: form.email },
                  ...(form.phone ? [{ label: t.yourPhone, value: form.phone }] : []),
                ].map(({ label, value }, i, arr) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < arr.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                    <span style={{ color: '#94a3b8', fontSize: 13 }}>{label}</span>
                    <span style={{ color: '#0f172a', fontSize: 13, fontWeight: 600 }}>{value}</span>
                  </div>
                ))}

                {/* Caution info si configurée */}
                {(() => {
                  const depositAmt = tenant?.depositConfig?.[selectedBike.type] ?? 0
                  if (!depositAmt) return null
                  return (
                    <div style={{ marginTop: 12, padding: '10px 14px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d' }}>Caution de garantie</div>
                        <div style={{ fontSize: 11, color: '#166534' }}>Bloquée sur votre carte — remboursée au retour</div>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: '#15803d' }}>{depositAmt} {currency}</div>
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* Boutons paiement */}
            {tenant?.hasStripe ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {/* Paiement en ligne Stripe */}
                <button
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true); setError('')
                    try {
                      const res = await fetch(`/api/public/${tenantSlug}/checkout`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          bikeId: selectedBike.id,
                          bikeType: selectedBike.type,
                          bikeName: selectedBike.name,
                          startAt: startAt.toISOString(),
                          endAt: endAt.toISOString(),
                          totalPrice: selectedBike.totalPrice,
                          customerName: form.name,
                          customerEmail: form.email,
                          customerPhone: form.phone,
                        }),
                      })
                      const data = await res.json()
                      if (!res.ok) { setError(data.error ?? 'Erreur paiement'); return }
                      window.location.href = data.url  // Redirect vers Stripe Checkout
                    } catch { setError('Erreur réseau') }
                    finally { setLoading(false) }
                  }}
                  style={{ background: loading ? '#c7d2fe' : 'linear-gradient(135deg,#635BFF,#7C3AED)', color: 'white', border: 'none', borderRadius: 14, padding: '17px', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 16px rgba(99,91,255,0.35)', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  {loading ? t.loading : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 8H2M2 12h20M2 16h6M12 16h4M18 16h4" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                      Payer en ligne — {selectedBike.totalPrice ?? ''} {currency}
                    </>
                  )}
                </button>
                {/* Option sans paiement (réservation classique) */}
                <button onClick={submitReservation} disabled={loading}
                  style={{ background: 'white', color: '#64748b', border: '1.5px solid #e5e7eb', borderRadius: 14, padding: '13px', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', width: '100%' }}>
                  {t.confirmBooking} (paiement sur place)
                </button>
              </div>
            ) : (
              <button onClick={submitReservation} disabled={loading}
                style={{ background: loading ? '#c7d2fe' : `linear-gradient(135deg, ${PURPLE}, ${PURPLE_DARK})`, color: 'white', border: 'none', borderRadius: 14, padding: '17px', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 16px rgba(99,102,241,0.35)', width: '100%' }}>
                {loading ? t.loading : t.confirmBooking}
              </button>
            )}
          </div>
        )}

        {/* ── Succès ── */}
        {step === 'success' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px', boxShadow: '0 8px 32px rgba(16,185,129,0.3)', fontSize: 36, color: 'white' }}>
              ✓
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>{t.successTitle}</h1>
            <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 28px' }}>
              {t.successText} <strong>{form.email}</strong>
            </p>
            <div style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', marginBottom: 20 }}>
              <p style={{ color: '#6b7280', fontSize: 12, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{t.successCode}</p>
              <div style={{ fontFamily: 'monospace', fontSize: 28, fontWeight: 800, color: PURPLE, letterSpacing: '0.15em', background: PURPLE_LIGHT, padding: '12px 24px', borderRadius: 12, display: 'inline-block' }}>
                {confirmationCode}
              </div>
              <p style={{ color: '#64748b', fontSize: 13, margin: '14px 0 0', lineHeight: 1.6 }}>{t.successHint}</p>
            </div>
            <button onClick={resetBooking} style={{ background: PURPLE_LIGHT, color: PURPLE, border: 'none', borderRadius: 12, padding: '13px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              {t.newBooking}
            </button>
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', padding: '20px 16px 32px', color: '#cbd5e1', fontSize: 12 }}>
        Propulsé par <span style={{ fontWeight: 700, color: '#94a3b8' }}>VeloRent</span>
      </div>
    </div>
  )
}
