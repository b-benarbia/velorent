// server-only — never import this file from client components
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

// ── Types ──────────────────────────────────────────────────────────────────

export interface InvoiceData {
  number:    string
  issuedAt:  string       // ISO date string
  currency:  string
  tenant: {
    name:     string
    address?: string | null
    phone?:   string | null
    email?:   string | null
  }
  customer: {
    firstName: string
    lastName:  string
    email?:    string | null
    phone?:    string | null
  }
  bikes:      { name: string; code: string }[]
  rental: {
    startAt:          string
    endAt?:           string | null
    expectedReturnAt?: string | null
    paymentMethod:    string
  }
  amountHt:  number
  taxRate:   number      // 0.20 = 20%
  amountTtc: number
}

// ── Helpers ──────────────────────────────────────────────────────────────

const TEAL     = '#0D9488'
const TEAL_DK  = '#134E4A'
const TEAL_BG  = '#F0FDFA'
const SL900    = '#0F172A'
const SL500    = '#64748B'
const SL300    = '#CBD5E1'
const SL50     = '#F8FAFC'
const WHITE    = '#ffffff'

function fmt(n: number, cur = '€') { return `${n.toFixed(2)} ${cur}` }

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtDateTime(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function durationLabel(startAt: string, endAt?: string | null, expectedAt?: string | null) {
  const end = endAt || expectedAt
  if (!end) return null
  const ms = new Date(end).getTime() - new Date(startAt).getTime()
  const h  = Math.floor(ms / 3600000)
  const m  = Math.floor((ms % 3600000) / 60000)
  if (h === 0) return `${m}min`
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

const PAYMENT_LABEL: Record<string, string> = {
  CASH: 'Espèces', CARD: 'Carte bancaire', BIZUM: 'Bizum', TRANSFER: 'Virement',
}

// ── Styles ────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, color: SL900, backgroundColor: WHITE, padding: 0 },

  // Header band
  header:    { backgroundColor: TEAL, padding: '18 26 16' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  shopName:  { fontSize: 16, fontFamily: 'Helvetica-Bold', color: WHITE, letterSpacing: 0.2 },
  shopMeta:  { fontSize: 8, color: 'rgba(255,255,255,0.55)', marginTop: 2, lineHeight: 1.5 },
  invLabel:  { fontSize: 7, color: 'rgba(255,255,255,0.5)', letterSpacing: 1.4, textTransform: 'uppercase', textAlign: 'right', marginBottom: 3 },
  invNumber: { fontSize: 20, fontFamily: 'Courier-Bold', color: WHITE, textAlign: 'right', letterSpacing: 0.8 },
  invDate:   { fontSize: 7.5, color: 'rgba(255,255,255,0.45)', textAlign: 'right', marginTop: 4 },

  // Body
  body: { paddingLeft: 26, paddingRight: 26, paddingBottom: 20 },

  // Section heading
  secTitle: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', letterSpacing: 1.8, textTransform: 'uppercase', color: TEAL, marginBottom: 6, marginTop: 18 },

  // Info block (customer / shop info)
  infoRow:  { flexDirection: 'row', gap: 16, marginTop: 18 },
  infoBox:  { flex: 1, backgroundColor: SL50, borderRadius: 6, padding: '10 12' },
  infoLbl:  { fontSize: 6, fontFamily: 'Helvetica-Bold', letterSpacing: 1.6, textTransform: 'uppercase', color: TEAL, marginBottom: 5 },
  infoName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: SL900, marginBottom: 3 },
  infoMeta: { fontSize: 8, color: SL500, lineHeight: 1.5 },

  // Items table
  tableHeader: { flexDirection: 'row', backgroundColor: SL50, borderRadius: 4, padding: '6 10', marginTop: 14 },
  tableRow:    { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', padding: '8 10' },
  thLabel:     { fontSize: 7, fontFamily: 'Helvetica-Bold', letterSpacing: 1.2, textTransform: 'uppercase', color: SL500 },
  tdText:      { fontSize: 9, color: SL900 },
  tdSub:       { fontSize: 8, color: SL500, marginTop: 2 },
  colDesc:     { flex: 1 },
  colQty:      { width: 30, textAlign: 'center' },
  colHt:       { width: 64, textAlign: 'right' },

  // Totals block
  totalsBox:  { alignSelf: 'flex-end', width: 220, marginTop: 14, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: SL300 },
  totalRow:   { flexDirection: 'row', justifyContent: 'space-between', padding: '6 14', backgroundColor: WHITE },
  totalRowLast:{ flexDirection: 'row', justifyContent: 'space-between', padding: '10 14', backgroundColor: TEAL_DK },
  totLbl:     { fontSize: 8.5, color: SL500 },
  totVal:     { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: SL900 },
  totLblLast: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: WHITE },
  totValLast: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: WHITE },

  // Payment badge
  payRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  payBadge:  { borderRadius: 20, paddingLeft: 10, paddingRight: 10, paddingTop: 4, paddingBottom: 4, backgroundColor: TEAL_BG },
  payTxt:    { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: TEAL },
  payLbl:    { fontSize: 8, color: SL500 },
  paidBadge: { borderRadius: 20, paddingLeft: 10, paddingRight: 10, paddingTop: 4, paddingBottom: 4, backgroundColor: '#DCFCE7' },
  paidTxt:   { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#16A34A' },

  // Footer
  footer:    { position: 'absolute', bottom: 18, left: 26, right: 26, borderTopWidth: 1, borderTopColor: SL300, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  footerTxt: { fontSize: 7, color: SL500 },
})

// ── Component ─────────────────────────────────────────────────────────────

export function InvoicePDF({ data }: { data: InvoiceData }) {
  const {
    number, issuedAt, currency, tenant, customer, bikes, rental,
    amountHt, taxRate, amountTtc,
  } = data

  const cur  = currency === 'EUR' ? '€' : currency
  const tva  = amountTtc - amountHt
  const pct  = Math.round(taxRate * 100)
  const dur  = durationLabel(rental.startAt, rental.endAt, rental.expectedReturnAt)
  const bikeNames = bikes.map(b => `${b.name}${b.code ? ` (${b.code})` : ''}`).join(', ')

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerRow}>
            <View>
              <Text style={s.shopName}>{tenant.name}</Text>
              <Text style={s.shopMeta}>
                {[tenant.address, tenant.phone, tenant.email].filter(Boolean).join('  ·  ')}
              </Text>
            </View>
            <View>
              <Text style={s.invLabel}>Facture</Text>
              <Text style={s.invNumber}>{number}</Text>
              <Text style={s.invDate}>{fmtDate(issuedAt)}</Text>
            </View>
          </View>
        </View>

        {/* ── Body ── */}
        <View style={s.body}>

          {/* Info row — shop + customer */}
          <View style={s.infoRow}>
            <View style={s.infoBox}>
              <Text style={s.infoLbl}>Émetteur</Text>
              <Text style={s.infoName}>{tenant.name}</Text>
              {tenant.address && <Text style={s.infoMeta}>{tenant.address}</Text>}
              {tenant.phone  && <Text style={s.infoMeta}>{tenant.phone}</Text>}
              {tenant.email  && <Text style={s.infoMeta}>{tenant.email}</Text>}
            </View>
            <View style={s.infoBox}>
              <Text style={s.infoLbl}>Facturé à</Text>
              <Text style={s.infoName}>{customer.firstName} {customer.lastName}</Text>
              {customer.email && <Text style={s.infoMeta}>{customer.email}</Text>}
              {customer.phone && <Text style={s.infoMeta}>{customer.phone}</Text>}
            </View>
          </View>

          {/* ── Items table ── */}
          <Text style={s.secTitle}>Détail de la prestation</Text>

          {/* Table header */}
          <View style={s.tableHeader}>
            <View style={s.colDesc}><Text style={s.thLabel}>Désignation</Text></View>
            <View style={s.colQty}><Text style={s.thLabel}>Qté</Text></View>
            <View style={s.colHt}><Text style={s.thLabel}>Total HT</Text></View>
          </View>

          {/* Single item — rental */}
          <View style={s.tableRow}>
            <View style={s.colDesc}>
              <Text style={s.tdText}>Location {bikeNames}</Text>
              <Text style={s.tdSub}>
                {fmtDateTime(rental.startAt)}
                {(rental.endAt || rental.expectedReturnAt)
                  ? ` → ${fmtDateTime(rental.endAt || rental.expectedReturnAt)}`
                  : ''}
                {dur ? `  ·  Durée : ${dur}` : ''}
              </Text>
            </View>
            <View style={s.colQty}><Text style={s.tdText}>1</Text></View>
            <View style={s.colHt}><Text style={s.tdText}>{fmt(amountHt, cur)}</Text></View>
          </View>

          {/* ── Totals ── */}
          <View style={s.totalsBox}>
            <View style={s.totalRow}>
              <Text style={s.totLbl}>Total HT</Text>
              <Text style={s.totVal}>{fmt(amountHt, cur)}</Text>
            </View>
            {pct > 0 && (
              <View style={[s.totalRow, { borderTopWidth: 1, borderTopColor: '#F1F5F9' }]}>
                <Text style={s.totLbl}>TVA {pct}%</Text>
                <Text style={s.totVal}>{fmt(tva, cur)}</Text>
              </View>
            )}
            <View style={s.totalRowLast}>
              <Text style={s.totLblLast}>Total TTC</Text>
              <Text style={s.totValLast}>{fmt(amountTtc, cur)}</Text>
            </View>
          </View>

          {/* ── Payment ── */}
          <View style={s.payRow}>
            <Text style={s.payLbl}>Paiement :</Text>
            <View style={s.payBadge}>
              <Text style={s.payTxt}>{PAYMENT_LABEL[rental.paymentMethod] ?? rental.paymentMethod}</Text>
            </View>
            <View style={s.paidBadge}>
              <Text style={s.paidTxt}>✓ PAYÉ</Text>
            </View>
          </View>

        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerTxt}>{tenant.name}</Text>
          <Text style={s.footerTxt}>Facture {number} · {fmtDate(issuedAt)}</Text>
          <Text style={s.footerTxt} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  )
}
