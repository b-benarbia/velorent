// server-only — never import this file from client components
import {
  Document, Page, Text, View, Image, StyleSheet, Svg, Path, Circle as SvgCircle,
} from '@react-pdf/renderer'

// ── Types ──────────────────────────────────────────────────────────────────
interface BikeData {
  name:         string
  code:         string
  serialNumber?: string | null
  type?:        string | null
}

interface ContractData {
  contractNumber: string
  generatedAt:    string
  isCompleted?:   boolean
  tenant: {
    name:    string
    address?: string | null
    phone?:  string | null
    email?:  string | null
    logoUrl?: string | null
  }
  customer: {
    firstName:        string
    lastName:         string
    nationality?:     string | null
    phone?:           string | null
    email?:           string | null
    documentType?:    string | null
    documentNumber?:  string | null
    documentPhotoUrl?: string | null
  }
  bikes: BikeData[]
  rental: {
    startAt:          string
    startAtFull:      string
    startTime:        string
    expectedReturn?:  string | null
    expectedReturnFull?: string | null
    endAt?:           string | null
    endAtFull?:       string | null
    endTime?:         string | null
    paymentMethod:    string
    amountPaid:       string
    depositAmount:    string
    depositMethod?:   string | null
    lockNumber?:      string | null
    accessories:      { label: string; qty: number; codes?: string[] }[]
    openingSignature?: string | null
    staffSignature?:   string | null
    closingSignature?: string | null
  }
}

// ── Styles ────────────────────────────────────────────────────────────────
const INDIGO   = '#0D9488'
const INDIGO_D = '#134E4A'
const INDIGO_BG = '#F0FDFA'
const INDIGO_BORDER = '#99F6E4'
const SLATE_900 = '#0F172A'
const SLATE_700 = '#1E293B'
const SLATE_500 = '#64748B'
const SLATE_400 = '#94A3B8'
const SLATE_200 = '#E2E8F0'
const SLATE_50  = '#F8FAFC'
const GREEN     = '#16A34A'
const RED       = '#DC2626'
const RED_BG    = '#FFF5F5'
const RED_BORDER = '#FECACA'

const s = StyleSheet.create({
  page:   { fontFamily: 'Helvetica', fontSize: 9, color: SLATE_900, backgroundColor: '#ffffff' },

  // Header
  header: { backgroundColor: INDIGO, padding: '14 22 12' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  shopName: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#ffffff', letterSpacing: 0.2 },
  shopMeta: { fontSize: 8, color: 'rgba(255,255,255,0.55)', marginTop: 3 },
  badge:    { borderRadius: 20, paddingLeft: 8, paddingRight: 8, paddingTop: 3, paddingBottom: 3, marginBottom: 6, alignSelf: 'flex-end' },
  contractLbl: { fontSize: 7, color: 'rgba(255,255,255,0.55)', textAlign: 'right', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 },
  contractNum: { fontSize: 19, fontFamily: 'Courier-Bold', color: '#ffffff', textAlign: 'right', letterSpacing: 1 },
  contractDate:{ fontSize: 7.5, color: 'rgba(255,255,255,0.4)', textAlign: 'right', marginTop: 4 },

  // Date strip
  dateStrip: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: SLATE_200 },
  dateCell:  { flex: 1, padding: '8 18' },
  dateLbl:   { fontSize: 6.5, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', color: SLATE_400, marginBottom: 2 },
  dateVal:   { fontSize: 10.5, fontFamily: 'Helvetica-Bold', color: SLATE_900, textTransform: 'capitalize' },
  dateTime:  { fontSize: 9, fontFamily: 'Helvetica', color: SLATE_500, marginLeft: 4 },

  // Section divider
  divRow:  { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 10 },
  divLine: { flex: 1, height: 1, backgroundColor: SLATE_200 },
  divLbl:  { fontSize: 7, fontFamily: 'Helvetica-Bold', letterSpacing: 2, textTransform: 'uppercase', color: SLATE_400, marginLeft: 10, marginRight: 10 },

  // Body padding
  body: { paddingLeft: 22, paddingRight: 22, paddingBottom: 14 },

  // Client / Payment two-column
  twoCol:    { flexDirection: 'row', gap: 20, marginBottom: 10 },
  colClient: { flex: 1.3 },
  colPay:    { flex: 1 },

  bigName: { fontSize: 17, fontFamily: 'Helvetica-Bold', color: SLATE_900, marginBottom: 8, letterSpacing: -0.3 },

  rowField: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 6, gap: 8 },
  lbl:      { fontSize: 7, fontFamily: 'Helvetica-Bold', letterSpacing: 1.8, textTransform: 'uppercase', color: SLATE_400, minWidth: 60 },
  val:      { fontSize: 11.5, fontFamily: 'Helvetica-Bold', color: SLATE_700 },
  valMono:  { fontSize: 11.5, fontFamily: 'Courier-Bold', color: SLATE_700 },
  valEmail: { fontSize: 10, color: SLATE_500 },

  docBox:   { flexDirection: 'row', gap: 10, alignItems: 'flex-start', alignSelf: 'flex-start', marginTop: 7, backgroundColor: SLATE_50, borderWidth: 1, borderColor: SLATE_200, borderRadius: 6, padding: '7 10' },
  docLbl:   { fontSize: 7, fontFamily: 'Helvetica-Bold', letterSpacing: 1.5, textTransform: 'uppercase', color: SLATE_400, marginBottom: 3 },
  docNum:   { fontSize: 15, fontFamily: 'Courier-Bold', color: SLATE_900, letterSpacing: 1 },
  docPhoto: { height: 52, width: 78, borderRadius: 4, borderWidth: 1, borderColor: SLATE_200, objectFit: 'cover' },

  // Payment
  amtBox: { backgroundColor: INDIGO_BG, borderWidth: 1, borderColor: INDIGO_BORDER, borderRadius: 10, padding: '10 14', marginBottom: 8 },
  amtLbl: { fontSize: 7, fontFamily: 'Helvetica-Bold', letterSpacing: 1.5, textTransform: 'uppercase', color: '#2DD4BF', marginBottom: 5 },
  amtVal: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: INDIGO_D, letterSpacing: -0.5 },
  amtCur: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: INDIGO_D },
  amtPay: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', letterSpacing: 1, textTransform: 'uppercase', color: INDIGO, marginTop: 5 },

  depBox: { borderWidth: 1, borderColor: SLATE_200, borderRadius: 7, padding: '9 12', marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  depLbl: { fontSize: 7, fontFamily: 'Helvetica-Bold', letterSpacing: 1.5, textTransform: 'uppercase', color: SLATE_400, marginBottom: 4 },
  depAmt: { fontSize: 17, fontFamily: 'Helvetica-Bold', color: SLATE_900 },
  depNote: { fontSize: 8, color: SLATE_400, fontFamily: 'Helvetica-Oblique' },

  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  lockLbl: { fontSize: 7, fontFamily: 'Helvetica-Bold', letterSpacing: 1.5, textTransform: 'uppercase', color: SLATE_400 },
  lockVal: { fontSize: 14, fontFamily: 'Courier-Bold', color: INDIGO_D },

  // Vehicle
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 20, flexWrap: 'wrap' },
  vName: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: SLATE_900, letterSpacing: -0.2, marginBottom: 4 },
  typeBadge: { backgroundColor: INDIGO_BG, borderWidth: 1, borderColor: INDIGO_BORDER, borderRadius: 3, paddingLeft: 7, paddingRight: 7, paddingTop: 2, paddingBottom: 2, alignSelf: 'flex-start' },
  typeBadgeTxt: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: INDIGO_D, textTransform: 'uppercase', letterSpacing: 1 },
  codeBox: {},
  codeLbl: { fontSize: 7, fontFamily: 'Helvetica-Bold', letterSpacing: 1.5, textTransform: 'uppercase', color: SLATE_400, marginBottom: 2 },
  codeVal: { fontSize: 16, fontFamily: 'Courier-Bold', color: INDIGO_D, letterSpacing: 0.5 },
  serialBox: { borderLeftWidth: 3, borderLeftColor: RED, paddingLeft: 11 },
  serialLbl: { fontSize: 7, fontFamily: 'Helvetica-Bold', letterSpacing: 1.5, textTransform: 'uppercase', color: RED, marginBottom: 2 },
  serialVal: { fontSize: 16, fontFamily: 'Courier-Bold', color: SLATE_900, letterSpacing: 0.5 },

  // Multi-bike table
  tbl:    { borderWidth: 1, borderColor: SLATE_200, borderRadius: 6, overflow: 'hidden' },
  tblHdr: { backgroundColor: SLATE_50, borderBottomWidth: 1, borderBottomColor: SLATE_200, flexDirection: 'row', alignItems: 'center', padding: '6 12', gap: 8 },
  tblHdrTxt: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', letterSpacing: 1.5, textTransform: 'uppercase', color: SLATE_400 },
  tblRow: { flexDirection: 'row', alignItems: 'center', padding: '8 12', gap: 8 },
  tblRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  numBadge: { width: 18, height: 18, backgroundColor: INDIGO_BG, borderWidth: 1.5, borderColor: INDIGO_BORDER, borderRadius: 3, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  numBadgeTxt: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: INDIGO_D },

  // Accessories
  accHdr: { backgroundColor: SLATE_50, borderBottomWidth: 1, borderBottomColor: SLATE_200, flexDirection: 'row', alignItems: 'center', padding: '6 12', gap: 10 },
  accRow: { flexDirection: 'row', alignItems: 'center', padding: '7 12', gap: 10 },
  checkBox: { width: 16, height: 16, backgroundColor: INDIGO_BG, borderWidth: 1.5, borderColor: INDIGO_BORDER, borderRadius: 3, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkTxt: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: INDIGO_D },
  accNote: { fontSize: 9, color: SLATE_400, fontFamily: 'Helvetica-Oblique', marginTop: 6 },

  // Clauses
  clauseRow: { flexDirection: 'row', gap: 10, paddingTop: 4, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  clauseNum: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', minWidth: 14, paddingTop: 2, flexShrink: 0 },
  clauseTxt: { fontSize: 9, lineHeight: 1.55, flex: 1 },

  // Signatures
  sigSection: { borderTopWidth: 1, borderTopColor: '#F0FDFA', backgroundColor: '#FAFBFF', paddingLeft: 22, paddingRight: 22, paddingBottom: 14 },
  sigRow: { flexDirection: 'row', gap: 12 },
  sigBox: { flex: 1 },
  sigLbl: { fontSize: 7, fontFamily: 'Helvetica-Bold', letterSpacing: 1.2, textTransform: 'uppercase', textAlign: 'center', marginBottom: 5 },
  sigCanvas: { height: 66, borderWidth: 1.5, borderStyle: 'dashed', borderColor: SLATE_200, borderRadius: 7, backgroundColor: '#ffffff', marginBottom: 4 },
  sigCanvasFilled: { height: 66, borderRadius: 7, backgroundColor: '#ffffff', marginBottom: 4, overflow: 'hidden' },
  sigLine: { borderTopWidth: 2, paddingTop: 5, alignItems: 'center' },
  sigDate: { fontSize: 8, textAlign: 'center', fontFamily: 'Helvetica-Bold' },

  // Footer
  footer: { backgroundColor: SLATE_50, borderTopWidth: 1, borderTopColor: '#F1F5F9', padding: '8 24', flexDirection: 'row', justifyContent: 'space-between' },
  footerTxt: { fontSize: 7.5, color: '#C4CBD6' },
})

// ── Lookup maps ───────────────────────────────────────────────────────────
const DOC_LABEL: Record<string, string> = {
  PASSPORT: 'Passeport', DNI: 'DNI', NIE: 'NIE / Résidence',
  ID_CARD: "Carte d'identité", DRIVING_LICENSE: 'Permis de conduire', OTHER: 'Pièce d\'identité',
}
const PAYMENT_LABEL: Record<string, string> = {
  CASH: 'Espèces', CARD: 'Carte bancaire', BIZUM: 'Bizum',
  TRANSFER: 'Virement', ONLINE: 'Online', HOTEL: 'Hotel',
}
const BIKE_TYPE: Record<string, string> = {
  CITY: 'Vélo ville', MTB: 'VTT', ROAD: 'Vélo de route', ELECTRIC: 'Vélo électrique',
  CARGO: 'Vélo cargo', KIDS: 'Vélo enfant', SCOOTER: 'Trottinette électrique', OTHER: 'Véhicule',
}

const CLAUSES = [
  { es: 'El arrendatario declara haber recibido el material en perfectas condiciones.', en: 'Renter declares receipt of equipment in perfect condition.', fr: 'Le locataire déclare avoir reçu le matériel en parfait état.', red: false },
  { es: 'El arrendatario es el único responsable de la custodia del material.', en: 'Renter is solely responsible for safekeeping of equipment.', fr: 'Le locataire est seul responsable de la garde du matériel.', red: false },
  { es: 'En caso de robo, pérdida o daño, el arrendatario abonará el coste íntegro.', en: 'In case of theft, loss or damage, renter shall pay full cost.', fr: 'En cas de vol, perte ou dommage, le locataire paiera le coût total.', red: false },
  { es: 'En caso de robo, denuncia policial obligatoria en 24h.', en: 'In case of theft, police report mandatory within 24 hours.', fr: 'En cas de vol, dépôt de plainte obligatoire dans les 24h.', red: true },
  { es: 'La fianza quedará retenida hasta la devolución en el mismo estado.', en: 'Deposit held until equipment returned in same condition.', fr: "La caution est retenue jusqu'à restitution dans le même état.", red: false },
  { es: 'El retraso generará cargos adicionales por cada hora/día de retraso.', en: 'Late returns will incur additional charges.', fr: 'Tout retard entraînera des frais supplémentaires.', red: false },
  { es: 'Este contrato tiene plena validez probatoria judicial.', en: 'This contract has full legal evidentiary value.', fr: 'Ce contrat a pleine valeur probatoire judiciaire.', red: false },
  { es: 'Datos personales tratados conforme al RGPD (UE 2016/679).', en: 'Personal data processed per GDPR (EU 2016/679).', fr: 'Données personnelles traitées conformément au RGPD.', red: false },
]

// ── Component ─────────────────────────────────────────────────────────────
export function ContractPDF({ data }: { data: ContractData }) {
  const { tenant, customer, bikes, rental, contractNumber, generatedAt, isCompleted } = data
  const firstBike = bikes[0]

  const hasDoc   = !!(customer.documentNumber || customer.documentPhotoUrl)
  const hasPhoto = !!customer.documentPhotoUrl

  return (
    <Document title={`Contrat ${contractNumber}`} author={tenant.name}>
      <Page size="A4" style={s.page} wrap={false}>

        {/* ══ HEADER ══════════════════════════════════════════════════════ */}
        <View style={s.header}>
          <View style={s.headerRow}>
            {/* Left: shop */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {tenant.logoUrl
                ? <Image src={tenant.logoUrl} style={{ width: 38, height: 38, borderRadius: 8, objectFit: 'cover' }} />
                : (
                  <View style={{ width: 38, height: 38, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                    <Svg width="22" height="22" viewBox="0 0 24 24">
                      <SvgCircle cx="5.5" cy="17.5" r="2.5" stroke="white" strokeWidth="1.8" fill="none" />
                      <SvgCircle cx="18.5" cy="17.5" r="2.5" stroke="white" strokeWidth="1.8" fill="none" />
                      <Path d="M8 17.5h7" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                      <Path d="M15 6l2.5 4.5h-8l1-4.5z" stroke="white" strokeWidth="1.8" strokeLinejoin="round" fill="none" />
                      <Path d="M12 6V4" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                      <Path d="M17.5 11L19 17.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                    </Svg>
                  </View>
                )
              }
              <View>
                <Text style={s.shopName}>{tenant.name}</Text>
                {(tenant.phone || tenant.email) && (
                  <Text style={s.shopMeta}>{[tenant.phone, tenant.email].filter(Boolean).join('  ·  ')}</Text>
                )}
                {tenant.address && <Text style={s.shopMeta}>{tenant.address}</Text>}
              </View>
            </View>

            {/* Right: reference */}
            <View style={{ alignItems: 'flex-end' }}>
              {/* Badge with SVG dot (● ne rend pas en Helvetica PDF) */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingLeft: 8, paddingRight: 8, paddingTop: 3, paddingBottom: 3, marginBottom: 6, backgroundColor: isCompleted ? 'rgba(255,255,255,0.15)' : 'rgba(110,231,183,0.25)', borderWidth: 1, borderColor: isCompleted ? 'rgba(255,255,255,0.2)' : 'rgba(110,231,183,0.5)' }}>
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: isCompleted ? 'rgba(255,255,255,0.5)' : '#6EE7B7' }} />
                <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#ffffff', letterSpacing: 1.2 }}>
                  {isCompleted ? 'CLOTURE' : 'ACTIF'}
                </Text>
              </View>
              <Text style={s.contractLbl}>CONTRAT DE LOCATION</Text>
              <Text style={s.contractNum}>N° {contractNumber}</Text>
              <Text style={s.contractDate}>{generatedAt}</Text>
            </View>
          </View>
        </View>

        {/* ══ DATE STRIP ══════════════════════════════════════════════════ */}
        <View style={s.dateStrip}>
          <View style={{ ...s.dateCell, borderRightWidth: 1, borderRightColor: SLATE_200 }}>
            <Text style={s.dateLbl}>Départ / Salida</Text>
            <Text style={s.dateVal}>
              {rental.startAtFull}{' '}
              <Text style={s.dateTime}>{rental.startTime}</Text>
            </Text>
          </View>
          {rental.expectedReturnFull && (
            <View style={{ ...s.dateCell, borderRightWidth: rental.endAtFull ? 1 : 0, borderRightColor: SLATE_200 }}>
              <Text style={s.dateLbl}>Retour prévu / Devolución</Text>
              <Text style={s.dateVal}>{rental.expectedReturnFull}</Text>
            </View>
          )}
          {rental.endAtFull && (
            <View style={s.dateCell}>
              <Text style={{ ...s.dateLbl, color: GREEN }}>Retour réel / Retorno</Text>
              <Text style={{ ...s.dateVal, color: GREEN }}>{rental.endAtFull}</Text>
            </View>
          )}
        </View>

        <View style={s.body}>

          {/* ══ CLIENT + PAIEMENT ════════════════════════════════════════ */}
          {/* Divider */}
          <View style={s.divRow}>
            <View style={s.divLine} /><Text style={s.divLbl}>Client / Cliente</Text><View style={s.divLine} />
          </View>

          <View style={s.twoCol}>
            {/* Left — client */}
            <View style={s.colClient}>
              <Text style={s.bigName}>{customer.firstName} {customer.lastName}</Text>

              {customer.nationality && (
                <View style={s.rowField}>
                  <Text style={s.lbl}>Nationalité</Text>
                  <Text style={s.val}>{customer.nationality}</Text>
                </View>
              )}
              {customer.phone && (
                <View style={s.rowField}>
                  <Text style={s.lbl}>Téléphone</Text>
                  <Text style={s.valMono}>{customer.phone}</Text>
                </View>
              )}
              {customer.email && (
                <View style={s.rowField}>
                  <Text style={s.lbl}>Email</Text>
                  <Text style={s.valEmail}>{customer.email}</Text>
                </View>
              )}

              {hasDoc && (
                <View style={s.docBox}>
                  {customer.documentNumber && (
                    <View style={{ flex: 1 }}>
                      <Text style={s.docLbl}>{DOC_LABEL[customer.documentType ?? ''] ?? "Pièce d'identité"}</Text>
                      <Text style={s.docNum}>{customer.documentNumber}</Text>
                    </View>
                  )}
                  {hasPhoto && (
                    <Image src={customer.documentPhotoUrl!} style={s.docPhoto} />
                  )}
                </View>
              )}
            </View>

            {/* Right — payment */}
            <View style={s.colPay}>
              <View style={s.amtBox}>
                <Text style={s.amtLbl}>Montant réglé / Importe</Text>
                <Text style={s.amtVal}>
                  {rental.amountPaid}<Text style={s.amtCur}> €</Text>
                </Text>
                <Text style={s.amtPay}>{PAYMENT_LABEL[rental.paymentMethod] ?? rental.paymentMethod}</Text>
              </View>

              {Number(rental.depositAmount) > 0 && (
                <View style={s.depBox}>
                  <View>
                    <Text style={s.depLbl}>Caution / Fianza</Text>
                    <Text style={s.depAmt}>{rental.depositAmount} €</Text>
                  </View>
                  <Text style={s.depNote}>{PAYMENT_LABEL[rental.depositMethod ?? 'CASH'] ?? 'Espèces'}{'\n'}Remboursable</Text>
                </View>
              )}

              {rental.lockNumber && (
                <View style={s.lockRow}>
                  <Text style={s.lockLbl}>Cadenas N°</Text>
                  <Text style={s.lockVal}>{rental.lockNumber}</Text>
                </View>
              )}
            </View>
          </View>

          {/* ══ VÉHICULE(S) ═════════════════════════════════════════════ */}
          <View style={{ borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
            <View style={s.divRow}>
              <View style={s.divLine} />
              <Text style={s.divLbl}>{bikes.length > 1 ? `${bikes.length} Véhicules` : 'Véhicule'}</Text>
              <View style={s.divLine} />
            </View>
          </View>

          {bikes.length === 1 ? (
            /* ── Single bike ── */
            <View style={s.vehicleRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.vName}>{firstBike.name}</Text>
                {firstBike.type && (
                  <View style={s.typeBadge}>
                    <Text style={s.typeBadgeTxt}>{BIKE_TYPE[firstBike.type] ?? firstBike.type}</Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: 'row', gap: 22 }}>
                <View style={s.codeBox}>
                  <Text style={s.codeLbl}>Code</Text>
                  <Text style={s.codeVal}>{firstBike.code}</Text>
                </View>
                {firstBike.serialNumber && (
                  <View style={s.serialBox}>
                    <Text style={s.serialLbl}>N° Série · CRITIQUE</Text>
                    <Text style={s.serialVal}>{firstBike.serialNumber}</Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            /* ── Multi-bike table ── */
            <View style={s.tbl}>
              <View style={s.tblHdr}>
                <View style={{ width: 18 }} />
                <Text style={{ ...s.tblHdrTxt, flex: 1 }}>Véhicule</Text>
                <Text style={{ ...s.tblHdrTxt, width: 64, textAlign: 'center' }}>Code</Text>
                <Text style={{ ...s.tblHdrTxt, width: 80, textAlign: 'right' }}>N° Série</Text>
              </View>
              {bikes.map((bike, i) => (
                <View key={i} style={{ ...s.tblRow, ...(i < bikes.length - 1 ? s.tblRowBorder : {}) }}>
                  <View style={s.numBadge}>
                    <Text style={s.numBadgeTxt}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: SLATE_700 }}>{bike.name}</Text>
                    {bike.type && (
                      <Text style={{ fontSize: 7.5, color: INDIGO_D, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 1 }}>
                        {BIKE_TYPE[bike.type] ?? bike.type}
                      </Text>
                    )}
                  </View>
                  <Text style={{ fontSize: 11, fontFamily: 'Courier-Bold', color: INDIGO_D, width: 64, textAlign: 'center' }}>{bike.code}</Text>
                  <Text style={{ fontSize: 9, fontFamily: 'Courier-Bold', color: bike.serialNumber ? RED : '#CBD5E1', width: 80, textAlign: 'right' }}>
                    {bike.serialNumber ?? '—'}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Accessories ── */}
          {rental.accessories.length > 0 && (
            <View style={{ marginTop: 14, borderWidth: 1, borderColor: SLATE_200, borderRadius: 6, overflow: 'hidden' }}>
              <View style={s.accHdr}>
                <View style={{ width: 16 }} />
                <Text style={{ ...s.tblHdrTxt, flex: 1 }}>Accessoires</Text>
                <Text style={{ ...s.tblHdrTxt, width: 24, textAlign: 'center' }}>Qté</Text>
                <Text style={{ ...s.tblHdrTxt, width: 64, textAlign: 'right' }}>Réf.</Text>
              </View>
              {rental.accessories.map((acc, i, arr) => (
                <View key={i} style={{ ...s.accRow, ...(i < arr.length - 1 ? { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' } : {}) }}>
                  <View style={s.checkBox}>
                    <Text style={s.checkTxt}>✓</Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 11, fontFamily: 'Helvetica-Bold', color: SLATE_700 }}>{acc.label}</Text>
                  <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: SLATE_900, width: 24, textAlign: 'center' }}>{acc.qty ?? 1}</Text>
                  <View style={{ width: 64, alignItems: 'flex-end' }}>
                    {(acc.codes ?? []).filter(Boolean).length > 0
                      ? (acc.codes ?? []).filter(Boolean).map((c, ci) => (
                          <Text key={ci} style={{ fontSize: 9, fontFamily: 'Courier-Bold', color: INDIGO_D }}>#{c}</Text>
                        ))
                      : <Text style={{ fontSize: 9, color: '#CBD5E1' }}>—</Text>
                    }
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ══ CONDITIONS ══════════════════════════════════════════════ */}
          <View style={{ borderTopWidth: 1, borderTopColor: '#F1F5F9', marginTop: 6 }}>
            <View style={s.divRow}>
              <View style={s.divLine} /><Text style={s.divLbl}>Conditions générales</Text><View style={s.divLine} />
            </View>
          </View>

          {CLAUSES.map((c, i) => (
            <View key={i} style={{ ...s.clauseRow, borderBottomColor: c.red ? RED_BORDER : '#F8FAFC', backgroundColor: c.red ? RED_BG : 'transparent' }}>
              <Text style={{ ...s.clauseNum, color: c.red ? RED : '#D1D5DB' }}>{i + 1}.</Text>
              <Text style={{ ...s.clauseTxt, color: c.red ? '#991B1B' : '#4B5563', fontFamily: c.red ? 'Helvetica-Bold' : 'Helvetica' }}>
                {c.red ? '! ' : ''}{c.fr}
              </Text>
            </View>
          ))}

        </View>

        {/* ══ SIGNATURES + FOOTER ════════════════════════════════════════ */}
        <View style={s.sigSection}>
          <View style={s.divRow}>
            <View style={s.divLine} /><Text style={s.divLbl}>Signatures / Firmas</Text><View style={s.divLine} />
          </View>

          <View style={s.sigRow}>
            {/* Signature départ client */}
            <View style={s.sigBox}>
              <Text style={{ ...s.sigLbl, color: rental.openingSignature ? INDIGO_D : '#CBD5E1' }}>
                Client — Départ{'\n'}Firma salida
              </Text>
              {rental.openingSignature ? (
                <View style={{ ...s.sigCanvasFilled, borderWidth: 1.5, borderColor: `${INDIGO_D}28` }}>
                  <Image src={rental.openingSignature} style={{ maxHeight: 80, objectFit: 'contain', padding: 6 }} />
                </View>
              ) : (
                <View style={s.sigCanvas} />
              )}
              <View style={{ ...s.sigLine, borderTopColor: rental.openingSignature ? INDIGO_D : SLATE_200 }}>
                <Text style={{ ...s.sigDate, color: rental.openingSignature ? INDIGO_D : SLATE_400 }}>{rental.startAt}</Text>
              </View>
            </View>

            {/* Signature retour client */}
            <View style={s.sigBox}>
              <Text style={{ ...s.sigLbl, color: rental.closingSignature ? SLATE_700 : '#CBD5E1' }}>
                Client — Retour{'\n'}Firma retorno
              </Text>
              {rental.closingSignature ? (
                <View style={{ ...s.sigCanvasFilled, borderWidth: 1, borderColor: SLATE_200 }}>
                  <Image src={rental.closingSignature} style={{ maxHeight: 80, objectFit: 'contain', padding: 6 }} />
                </View>
              ) : (
                <View style={s.sigCanvas} />
              )}
              <View style={{ ...s.sigLine, borderTopColor: rental.closingSignature ? SLATE_700 : SLATE_200 }}>
                <Text style={{ ...s.sigDate, color: rental.closingSignature ? SLATE_700 : SLATE_400 }}>
                  {rental.endAt ?? '—'}
                </Text>
              </View>
            </View>

            {/* Signature staff */}
            <View style={s.sigBox}>
              <Text style={{ ...s.sigLbl, color: rental.staffSignature ? INDIGO_D : '#CBD5E1' }}>
                Responsable{'\n'}Firma staff
              </Text>
              {rental.staffSignature ? (
                <View style={{ ...s.sigCanvasFilled, borderWidth: 1.5, borderColor: `${INDIGO_D}28` }}>
                  <Image src={rental.staffSignature} style={{ maxHeight: 80, objectFit: 'contain', padding: 6 }} />
                </View>
              ) : (
                <View style={{ ...s.sigCanvas, borderColor: '#99F6E4', backgroundColor: '#FAFBFF' }} />
              )}
              <View style={{ ...s.sigLine, borderTopColor: rental.staffSignature ? INDIGO_D : SLATE_200 }}>
                <Text style={{ ...s.sigDate, color: rental.staffSignature ? INDIGO_D : SLATE_400 }}>{tenant.name}</Text>
              </View>
            </View>
          </View>

          {/* Footer inline — évite un View séparé en fin de Page (bug react-pdf page fantôme) */}
          <View style={{ ...s.footer, marginTop: 8 }}>
            <Text style={s.footerTxt}>{tenant.name}{tenant.address ? ` · ${tenant.address}` : ''} · VeloRent</Text>
            <Text style={s.footerTxt}>Contrat N° {contractNumber} · {generatedAt}</Text>
          </View>
        </View>

      </Page>
    </Document>
  )
}

export type { ContractData }
