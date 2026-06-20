// server-only — never import this file from client components
import {
  Document, Page, Text, View, Image, StyleSheet,
} from '@react-pdf/renderer'

// ── Types ──────────────────────────────────────────────────────────────────
interface ContractData {
  contractNumber: string
  generatedAt:    string
  tenant: {
    name:    string
    address?: string | null
    phone?:  string | null
    email?:  string | null
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
  bike: {
    name:         string
    code:         string
    serialNumber?: string | null
    type:         string
  }
  rental: {
    startAt:          string  // human-readable
    startTime:        string
    expectedReturn?:  string | null
    endAt?:           string | null
    endTime?:         string | null
    paymentMethod:    string
    amountPaid:       string
    depositAmount:    string
    depositMethod?:   string | null
    lockNumber?:      string | null
    accessories:      { label: string; qty: number; codes?: string[] }[]
    openingSignature?: string | null
    staffSignature?:   string | null
  }
}

// ── Styles ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page:        { fontFamily: 'Helvetica', fontSize: 9, color: '#0f172a', backgroundColor: '#ffffff' },
  header:      { backgroundColor: '#0f172a', padding: '20 24 16' },
  headerRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  shopName:    { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#ffffff', letterSpacing: 0.3 },
  shopMeta:    { fontSize: 8, color: '#64748b', marginTop: 2 },
  contractNum: { fontSize: 18, fontFamily: 'Courier-Bold', color: '#ffffff', textAlign: 'right', letterSpacing: 1 },
  contractLbl: { fontSize: 7, color: '#475569', textAlign: 'right', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 },
  contractDate:{ fontSize: 7, color: '#475569', textAlign: 'right', marginTop: 3 },
  headerDivider: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', marginTop: 14, paddingTop: 12, flexDirection: 'row', gap: 28 },
  dateLabel:   { fontSize: 7, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 },
  dateValue:   { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  body:        { padding: '16 24 20' },
  section:     { marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, overflow: 'hidden' },
  sectionHead: { backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', padding: '6 12', flexDirection: 'row', alignItems: 'center', gap: 7 },
  sectionNum:  { width: 16, height: 16, borderRadius: 8, backgroundColor: '#0f172a', color: '#ffffff', fontSize: 7, fontFamily: 'Helvetica-Bold', textAlign: 'center', paddingTop: 4 },
  sectionLbl:  { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.9 },
  sectionBody: { padding: '10 12' },
  grid2:       { flexDirection: 'row', gap: 16, marginBottom: 6 },
  field:       { flex: 1 },
  fieldLabel:  { fontSize: 6.5, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  fieldValue:  { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  bigName:     { fontSize: 17, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginBottom: 8 },
  docBox:      { backgroundColor: '#0f172a', borderRadius: 5, padding: '8 12', marginTop: 6 },
  docLabel:    { fontSize: 6, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 3 },
  docNum:      { fontSize: 18, fontFamily: 'Courier-Bold', color: '#ffffff', letterSpacing: 2 },
  serialBox:   { backgroundColor: '#fefce8', borderWidth: 1, borderColor: '#fde68a', borderRadius: 5, padding: '6 10', marginTop: 6 },
  serialLabel: { fontSize: 6, color: '#92400e', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 },
  serialNum:   { fontSize: 14, fontFamily: 'Courier-Bold', color: '#92400e', letterSpacing: 1.5 },
  accChip:     { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, padding: '3 7', marginRight: 5, marginBottom: 4 },
  accChips:    { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  finGrid:     { flexDirection: 'row', gap: 12 },
  finItem:     { flex: 1 },
  finAmount:   { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#16a34a' },
  finDeposit:  { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 5, padding: '7 10', flex: 1 },
  finDepLabel: { fontSize: 6, color: '#9a3412', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  finDepAmt:   { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#c2410c' },
  clause:      { flexDirection: 'row', gap: 8, marginBottom: 5, padding: '6 8', borderRadius: 4, borderWidth: 1 },
  clauseNum:   { width: 14, height: 14, borderRadius: 7, fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#ffffff', textAlign: 'center', paddingTop: 3, flexShrink: 0 },
  clauseText:  { fontSize: 7.5, lineHeight: 1.55, flex: 1 },
  termsHead:   { backgroundColor: '#0f172a', padding: '7 12', borderRadius: 5, marginBottom: 6 },
  termsLbl:    { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff', textTransform: 'uppercase', letterSpacing: 0.9 },
  sigRow:      { flexDirection: 'row', gap: 12 },
  sigBox:      { flex: 1 },
  sigLabel:    { fontSize: 6.5, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.7, textAlign: 'center', marginBottom: 5, lineHeight: 1.4 },
  sigCanvas:   { height: 70, borderWidth: 1, borderStyle: 'dashed', borderColor: '#cbd5e1', borderRadius: 5, backgroundColor: '#ffffff', marginBottom: 4 },
  sigCanvasFilled: { height: 70, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 5, backgroundColor: '#ffffff', marginBottom: 4 },
  sigLine:     { borderTopWidth: 1.5, borderTopColor: '#94a3b8', paddingTop: 3 },
  sigDate:     { fontSize: 6.5, color: '#64748b', textAlign: 'center' },
  footer:      { backgroundColor: '#f8fafc', borderTopWidth: 1, borderTopColor: '#e2e8f0', padding: '8 24', flexDirection: 'row', justifyContent: 'space-between' },
  footerText:  { fontSize: 7, color: '#94a3b8' },
})

const DOC_LABEL: Record<string, string> = {
  PASSPORT: 'Pasaporte / Passeport', DNI: 'DNI', NIE: 'NIE',
  ID_CARD: "D. Identidad / C.N.I.", DRIVING_LICENSE: 'Permis de conduire',
  OTHER: 'Otro / Autre',
}
const PAYMENT_LABEL: Record<string, string> = {
  CASH: 'Efectivo / Espèces', CARD: 'Tarjeta / Carte', BIZUM: 'Bizum',
  TRANSFER: 'Virement', ONLINE: 'Online', HOTEL: 'Hotel',
}

const CLAUSES = [
  { n: '1', es: 'El arrendatario declara haber recibido el material en perfectas condiciones.', en: 'Renter declares receipt of equipment in perfect condition.', fr: 'Le locataire déclare avoir reçu le matériel en parfait état.', highlight: false },
  { n: '2', es: 'El arrendatario es el único responsable de la custodia del material.', en: 'Renter is solely responsible for safekeeping of equipment.', fr: 'Le locataire est seul responsable de la garde du matériel.', highlight: false },
  { n: '3', es: 'En caso de robo, pérdida o daño, el arrendatario abonará el coste íntegro.', en: 'In case of theft, loss or damage, renter shall pay full cost.', fr: 'En cas de vol, perte ou dommage, le locataire paiera le coût total.', highlight: false },
  { n: '4', es: 'En caso de robo, denuncia policial obligatoria en 24h.', en: 'In case of theft, police report mandatory within 24 hours.', fr: 'En cas de vol, dépôt de plainte obligatoire dans les 24h.', highlight: true },
  { n: '5', es: 'La fianza quedará retenida hasta la devolución en el mismo estado.', en: 'Deposit held until equipment returned in same condition.', fr: 'La caution est retenue jusqu\'à restitution dans le même état.', highlight: false },
  { n: '6', es: 'El retraso generará cargos adicionales por cada hora/día de retraso.', en: 'Late returns will incur additional charges.', fr: 'Tout retard entraînera des frais supplémentaires.', highlight: false },
  { n: '7', es: 'Este contrato tiene plena validez probatoria judicial.', en: 'This contract has full legal evidentiary value.', fr: 'Ce contrat a pleine valeur probatoire judiciaire.', highlight: false },
  { n: '8', es: 'Datos personales tratados conforme al RGPD (UE 2016/679).', en: 'Personal data processed per GDPR (EU 2016/679).', fr: 'Données personnelles traitées conformément au RGPD.', highlight: false },
]

// ── Component ─────────────────────────────────────────────────────────────
export function ContractPDF({ data }: { data: ContractData }) {
  const { tenant, customer, bike, rental, contractNumber, generatedAt } = data
  const hasDocPhoto = !!customer.documentPhotoUrl
  const sectionOffset = hasDocPhoto ? 1 : 0

  return (
    <Document title={`Contrat ${contractNumber}`} author={tenant.name}>
      <Page size="A4" style={s.page}>

        {/* ── HEADER ── */}
        <View style={s.header}>
          <View style={s.headerRow}>
            <View>
              <Text style={s.shopName}>{tenant.name}</Text>
              {tenant.address && <Text style={s.shopMeta}>{tenant.address}</Text>}
              <Text style={s.shopMeta}>{[tenant.phone, tenant.email].filter(Boolean).join('  ·  ')}</Text>
            </View>
            <View>
              <Text style={s.contractLbl}>Contrato · Contract · Contrat</Text>
              <Text style={s.contractNum}>N° {contractNumber}</Text>
              <Text style={s.contractDate}>Generado · {generatedAt}</Text>
            </View>
          </View>
          <View style={s.headerDivider}>
            <View>
              <Text style={s.dateLabel}>Fecha / Date</Text>
              <Text style={s.dateValue}>{rental.startAt}</Text>
            </View>
            <View>
              <Text style={s.dateLabel}>Hora salida / Départ</Text>
              <Text style={s.dateValue}>{rental.startTime}</Text>
            </View>
            {rental.expectedReturn && (
              <View>
                <Text style={s.dateLabel}>Devolución prevista / Retour prévu</Text>
                <Text style={s.dateValue}>{rental.expectedReturn}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={s.body}>

          {/* ── SECTION 1 — LOCATAIRE ── */}
          <View style={s.section}>
            <View style={s.sectionHead}>
              <Text style={s.sectionNum}>1</Text>
              <Text style={s.sectionLbl}>Datos del arrendatario · Renter · Locataire</Text>
            </View>
            <View style={s.sectionBody}>
              <Text style={s.bigName}>{customer.firstName} {customer.lastName}</Text>
              <View style={s.grid2}>
                <View style={s.field}>
                  <Text style={s.fieldLabel}>Nacionalidad / Nationalité</Text>
                  <Text style={s.fieldValue}>{customer.nationality ?? '—'}</Text>
                </View>
                {customer.phone && (
                  <View style={s.field}>
                    <Text style={s.fieldLabel}>Teléfono / Téléphone</Text>
                    <Text style={s.fieldValue}>{customer.phone}</Text>
                  </View>
                )}
                {customer.email && (
                  <View style={s.field}>
                    <Text style={s.fieldLabel}>Email</Text>
                    <Text style={s.fieldValue}>{customer.email}</Text>
                  </View>
                )}
              </View>
              {customer.documentNumber && (
                <View style={s.docBox}>
                  <Text style={s.docLabel}>{DOC_LABEL[customer.documentType ?? ''] ?? 'Documento de identidad'}</Text>
                  <Text style={s.docNum}>{customer.documentNumber}</Text>
                </View>
              )}
            </View>
          </View>

          {/* ── SECTION 2 — PHOTO ID (conditionnel) ── */}
          {hasDocPhoto && (
            <View style={s.section}>
              <View style={s.sectionHead}>
                <Text style={s.sectionNum}>2</Text>
                <Text style={s.sectionLbl}>Documento de identidad / Pièce d&apos;identité</Text>
              </View>
              <View style={s.sectionBody}>
                <Image src={customer.documentPhotoUrl!} style={{ maxHeight: 140, objectFit: 'contain' }} />
              </View>
            </View>
          )}

          {/* ── SECTION 3 — MATÉRIEL ── */}
          <View style={s.section}>
            <View style={s.sectionHead}>
              <Text style={s.sectionNum}>{2 + sectionOffset}</Text>
              <Text style={s.sectionLbl}>Material alquilado · Equipment · Matériel loué</Text>
            </View>
            <View style={s.sectionBody}>
              <View style={s.grid2}>
                <View style={s.field}>
                  <Text style={s.fieldLabel}>Vehículo / Véhicule</Text>
                  <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#0f172a' }}>{bike.name}</Text>
                </View>
                <View style={s.field}>
                  <Text style={s.fieldLabel}>Código / Code</Text>
                  <Text style={{ fontSize: 13, fontFamily: 'Courier-Bold', color: '#6366F1' }}>{bike.code}</Text>
                </View>
              </View>
              {bike.serialNumber && (
                <View style={s.serialBox}>
                  <Text style={s.serialLabel}>N° série — CRÍTICO DENUNCIA / CRITICAL POLICE REPORT</Text>
                  <Text style={s.serialNum}>{bike.serialNumber}</Text>
                </View>
              )}
              {rental.lockNumber && (
                <View style={{ marginTop: 6 }}>
                  <Text style={s.fieldLabel}>Candado / Cadenas N°</Text>
                  <Text style={{ fontSize: 11, fontFamily: 'Courier-Bold', color: '#0f172a' }}>{rental.lockNumber}</Text>
                </View>
              )}
              {rental.accessories.length > 0 && (
                <>
                  <Text style={{ ...s.fieldLabel, marginTop: 8, marginBottom: 0 }}>Accesorios / Accessoires</Text>
                  <View style={s.accChips}>
                    {rental.accessories.map((acc, i) => {
                      const codes = (acc.codes ?? []).filter(Boolean)
                      return (
                        <View key={i} style={s.accChip}>
                          <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#0f172a' }}>
                            {acc.qty > 1 ? `${acc.qty}× ` : ''}{acc.label}
                            {codes.length > 0 ? ` (#${codes.join(', #')})` : ''}
                          </Text>
                        </View>
                      )
                    })}
                  </View>
                </>
              )}
            </View>
          </View>

          {/* ── SECTION 4 — FINANCES ── */}
          <View style={s.section}>
            <View style={s.sectionHead}>
              <Text style={s.sectionNum}>{3 + sectionOffset}</Text>
              <Text style={s.sectionLbl}>Condiciones económicas · Payment · Finances</Text>
            </View>
            <View style={s.sectionBody}>
              <View style={s.finGrid}>
                <View style={s.finItem}>
                  <Text style={s.fieldLabel}>Importe / Montant</Text>
                  <Text style={s.finAmount}>{rental.amountPaid} €</Text>
                  <Text style={{ fontSize: 8, color: '#64748b', marginTop: 2 }}>{PAYMENT_LABEL[rental.paymentMethod] ?? rental.paymentMethod}</Text>
                </View>
                {Number(rental.depositAmount) > 0 && (
                  <View style={s.finDeposit}>
                    <Text style={s.finDepLabel}>Fianza / Caution / Deposit</Text>
                    <Text style={s.finDepAmt}>{rental.depositAmount} €</Text>
                    <Text style={{ fontSize: 7, color: '#9a3412', marginTop: 2 }}>{PAYMENT_LABEL[rental.depositMethod ?? 'CASH'] ?? 'Espèces'} · Reembolsable</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* ── CONDITIONS GÉNÉRALES ── */}
          <View style={{ marginBottom: 12 }}>
            <View style={s.termsHead}>
              <Text style={s.termsLbl}>Condiciones generales · General Terms · Conditions générales</Text>
            </View>
            {CLAUSES.map(c => (
              <View key={c.n} style={{ ...s.clause, borderColor: c.highlight ? '#fca5a5' : '#f1f5f9', backgroundColor: c.highlight ? '#fff5f5' : '#fafafa' }}>
                <Text style={{ ...s.clauseNum, backgroundColor: c.highlight ? '#dc2626' : '#0f172a' }}>{c.n}</Text>
                <Text style={{ ...s.clauseText, color: c.highlight ? '#7f1d1d' : '#374151', fontFamily: c.highlight ? 'Helvetica-Bold' : 'Helvetica' }}>
                  {c.es}{' '}<Text style={{ fontFamily: 'Helvetica-Oblique', color: c.highlight ? '#991b1b' : '#6b7280' }}>/ {c.en}</Text>
                  {' '}<Text style={{ color: c.highlight ? '#b91c1c' : '#9ca3af' }}>/ {c.fr}</Text>
                </Text>
              </View>
            ))}
          </View>

          {/* ── SIGNATURES ── */}
          <View style={s.section}>
            <View style={s.sectionHead}>
              <Text style={s.sectionLbl}>Firmas · Signatures · Signatures</Text>
            </View>
            <View style={{ ...s.sectionBody }}>
              <View style={s.sigRow}>
                {/* Client opening */}
                <View style={s.sigBox}>
                  <Text style={s.sigLabel}>Firma cliente (salida){'\n'}Signature départ</Text>
                  {rental.openingSignature
                    ? <Image src={rental.openingSignature} style={s.sigCanvasFilled} />
                    : <View style={s.sigCanvas} />
                  }
                  <View style={s.sigLine}><Text style={s.sigDate}>{rental.startAt}</Text></View>
                </View>

                {/* Client closing */}
                <View style={s.sigBox}>
                  <Text style={s.sigLabel}>Firma cliente (retorno){'\n'}Signature retour</Text>
                  <View style={s.sigCanvas} />
                  <View style={s.sigLine}><Text style={s.sigDate}>{rental.endAt ? rental.endTime : '___/___/______'}</Text></View>
                </View>

                {/* Staff */}
                <View style={s.sigBox}>
                  <Text style={s.sigLabel}>Firma responsable{'\n'}Signature staff</Text>
                  {rental.staffSignature
                    ? <Image src={rental.staffSignature} style={{ ...s.sigCanvasFilled, borderColor: '#6366F1' }} />
                    : <View style={{ ...s.sigCanvas, borderColor: '#c7d2fe', backgroundColor: '#fafbff' }} />
                  }
                  <View style={s.sigLine}><Text style={s.sigDate}>{rental.startAt}</Text></View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── FOOTER ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{tenant.name}{tenant.address ? ` · ${tenant.address}` : ''} · Generado por VeloRent</Text>
          <Text style={s.footerText}>Contrato N° {contractNumber} · {generatedAt}</Text>
        </View>

      </Page>
    </Document>
  )
}

export type { ContractData }
