import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'
import { CHECKLIST_ITEMS } from './checklist'
import { formatDate } from './compliance'

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1d23' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  companyName: { fontSize: 16, fontWeight: 700 },
  reportTitle: { fontSize: 12, color: '#6b7280', marginBottom: 12 },
  metaBlock: { marginBottom: 16, borderBottom: '1 solid #e0e2e7', paddingBottom: 12 },
  metaRow: { flexDirection: 'row', marginBottom: 2 },
  metaLabel: { width: 110, color: '#6b7280', fontWeight: 700 },
  doorBlock: { marginBottom: 16 },
  doorTitle: { fontSize: 12, fontWeight: 700, marginBottom: 6, backgroundColor: '#f4f5f7', padding: 6 },
  table: { display: 'flex', width: '100%' },
  tableRow: { flexDirection: 'row', borderBottom: '1 solid #e0e2e7', paddingVertical: 4 },
  tableHeaderRow: { flexDirection: 'row', borderBottom: '1 solid #1a1d23', paddingVertical: 4, fontWeight: 700 },
  colItem: { width: '32%' },
  colResult: { width: '13%', textTransform: 'uppercase' },
  colNotes: { width: '55%' },
  resultPass: { color: '#15803d', fontWeight: 700 },
  resultFail: { color: '#b91c1c', fontWeight: 700 },
  resultNa: { color: '#6b7280', fontWeight: 700 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, gap: 6 },
  photo: { width: 90, height: 90, objectFit: 'cover', marginRight: 6, marginBottom: 6 },
  defectsTitle: { fontSize: 12, fontWeight: 700, marginTop: 8, marginBottom: 6 },
  defectRow: { flexDirection: 'row', borderBottom: '1 solid #e0e2e7', paddingVertical: 4 },
  footer: { position: 'absolute', bottom: 20, left: 32, right: 32, fontSize: 8, color: '#6b7280', textAlign: 'center' },
})

function resultStyle(result) {
  if (result === 'pass') return styles.resultPass
  if (result === 'fail') return styles.resultFail
  return styles.resultNa
}

export default function InspectionReportDocument({ companyName, building, inspection, doors, itemsByDoor, photosByItem, defects }) {
  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.headerRow}>
          <Text style={styles.companyName}>{companyName}</Text>
          <Text>{formatDate(inspection.inspection_date)}</Text>
        </View>
        <Text style={styles.reportTitle}>Fire Door Inspection Report</Text>

        <View style={styles.metaBlock}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Building</Text>
            <Text>{building.name}</Text>
          </View>
          {building.address && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Address</Text>
              <Text>{building.address}</Text>
            </View>
          )}
          {building.client_name && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Client</Text>
              <Text>{building.client_name}</Text>
            </View>
          )}
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Inspection date</Text>
            <Text>{formatDate(inspection.inspection_date)}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Frequency</Text>
            <Text>Every {building.inspection_frequency_months} month(s)</Text>
          </View>
        </View>

        {doors.map((door) => (
          <View key={door.id} style={styles.doorBlock} wrap={false}>
            <Text style={styles.doorTitle}>
              {door.location_label}
              {door.door_type ? ` (${door.door_type})` : ''}
            </Text>
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={styles.colItem}>Check</Text>
                <Text style={styles.colResult}>Result</Text>
                <Text style={styles.colNotes}>Notes</Text>
              </View>
              {CHECKLIST_ITEMS.map((ci) => {
                const item = itemsByDoor[door.id]?.[ci.key]
                if (!item) return null
                return (
                  <View key={ci.key} style={styles.tableRow}>
                    <Text style={styles.colItem}>{ci.label}</Text>
                    <Text style={[styles.colResult, resultStyle(item.result)]}>{item.result}</Text>
                    <Text style={styles.colNotes}>{item.notes || '-'}</Text>
                  </View>
                )
              })}
            </View>
            <View style={styles.photoRow}>
              {CHECKLIST_ITEMS.flatMap((ci) => {
                const item = itemsByDoor[door.id]?.[ci.key]
                const photos = item ? photosByItem[item.id] ?? [] : []
                return photos.map((p) => <Image key={p.id} src={p.url} style={styles.photo} />)
              })}
            </View>
          </View>
        ))}

        {defects.length > 0 && (
          <View wrap={false}>
            <Text style={styles.defectsTitle}>Defects raised from this inspection</Text>
            {defects.map((d) => (
              <View key={d.id} style={styles.defectRow}>
                <Text style={{ width: '55%' }}>{d.description}</Text>
                <Text style={{ width: '20%' }}>Due {formatDate(d.due_date)}</Text>
                <Text style={{ width: '25%', textTransform: 'uppercase' }}>{d.status}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footer} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages} - Generated ${formatDate(new Date())}`} fixed />
      </Page>
    </Document>
  )
}
