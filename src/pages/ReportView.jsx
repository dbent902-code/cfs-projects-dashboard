import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { formatDate } from '../lib/compliance'
import InspectionReportDocument from '../lib/InspectionReportDocument.jsx'

export default function ReportView() {
  const { buildingId, inspectionId } = useParams()
  const [data, setData] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: inspection } = await supabase.from('inspections').select('*').eq('id', inspectionId).single()
      const { data: building } = await supabase.from('buildings').select('*').eq('id', buildingId).single()
      const { data: company } = await supabase.from('companies').select('name').eq('id', building.company_id).single()

      const { data: itemRows } = await supabase
        .from('inspection_items')
        .select('*, fire_doors(id, location_label, door_type)')
        .eq('inspection_id', inspectionId)

      const doorMap = new Map()
      const itemsByDoor = {}
      for (const item of itemRows ?? []) {
        const door = item.fire_doors
        if (!doorMap.has(door.id)) doorMap.set(door.id, door)
        if (!itemsByDoor[door.id]) itemsByDoor[door.id] = {}
        itemsByDoor[door.id][item.item_key] = item
      }

      const itemIds = (itemRows ?? []).map((i) => i.id)
      const photosByItem = {}
      if (itemIds.length > 0) {
        const { data: photoRows } = await supabase.from('photos').select('*').in('inspection_item_id', itemIds)
        for (const p of photoRows ?? []) {
          const { data: signed } = await supabase.storage.from('inspection-photos').createSignedUrl(p.storage_path, 3600)
          if (!photosByItem[p.inspection_item_id]) photosByItem[p.inspection_item_id] = []
          photosByItem[p.inspection_item_id].push({ ...p, url: signed?.signedUrl })
        }
      }

      const { data: defects } = await supabase
        .from('defects')
        .select('*')
        .in('inspection_item_id', itemIds.length > 0 ? itemIds : ['00000000-0000-0000-0000-000000000000'])

      setData({
        inspection,
        building,
        companyName: company?.name ?? '',
        doors: [...doorMap.values()].sort((a, b) => a.location_label.localeCompare(b.location_label)),
        itemsByDoor,
        photosByItem,
        defects: defects ?? [],
      })
    }
    load()
  }, [buildingId, inspectionId])

  if (!data) return <p className="text-muted">Loading report...</p>

  return (
    <div>
      <Link to={`/inspections/${inspectionId}`} className="back-link">
        <ArrowLeft size={16} /> Back to inspection
      </Link>

      <div className="page-header">
        <h1 style={{ fontSize: '1.1rem' }}>Report - {data.building.name}</h1>
      </div>
      <p className="card-subtitle">Inspection date: {formatDate(data.inspection.inspection_date)}</p>

      <PDFDownloadLink
        document={<InspectionReportDocument {...data} />}
        fileName={`${data.building.name.replace(/[^a-z0-9]+/gi, '-')}-inspection-${data.inspection.inspection_date}.pdf`}
        className="btn-primary btn-block"
        style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: '1rem' }}
      >
        {({ loading }) => (loading ? 'Preparing PDF...' : 'Download PDF report')}
      </PDFDownloadLink>
    </div>
  )
}
