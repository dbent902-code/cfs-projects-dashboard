import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext.jsx'
import { CHECKLIST_ITEMS } from '../lib/checklist'
import { formatDate } from '../lib/compliance'
import ChecklistItemRow from '../components/ChecklistItemRow.jsx'

export default function InspectionForm() {
  const { inspectionId } = useParams()
  const { profile } = useAuth()

  const [inspection, setInspection] = useState(null)
  const [building, setBuilding] = useState(null)
  const [doors, setDoors] = useState([])
  const [items, setItems] = useState([])
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState('')

  async function loadAll() {
    const { data: insp } = await supabase.from('inspections').select('*').eq('id', inspectionId).single()
    if (!insp) return
    setInspection(insp)

    const [{ data: b }, { data: itemRows }] = await Promise.all([
      supabase.from('buildings').select('*').eq('id', insp.building_id).single(),
      supabase.from('inspection_items').select('*').eq('inspection_id', inspectionId),
    ])
    setBuilding(b)
    setItems(itemRows ?? [])

    const doorIds = [...new Set((itemRows ?? []).map((i) => i.fire_door_id))]
    if (doorIds.length > 0) {
      const { data: doorRows } = await supabase.from('fire_doors').select('*').in('id', doorIds).order('location_label')
      setDoors(doorRows ?? [])
    }
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspectionId])

  const itemsByDoor = useMemo(() => {
    const map = {}
    for (const item of items) {
      if (!map[item.fire_door_id]) map[item.fire_door_id] = {}
      map[item.fire_door_id][item.item_key] = item
    }
    return map
  }, [items])

  const isCompleted = inspection?.status === 'completed'

  async function updateItem(itemId, patch) {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, ...patch } : i)))
    await supabase.from('inspection_items').update(patch).eq('id', itemId)
  }

  async function handleComplete() {
    const incomplete = items.filter((i) => i.result === 'na' && !i.notes)
    if (incomplete.length > 0) {
      const proceed = confirm(
        `${incomplete.length} checklist item(s) are still marked N/A with no notes. Complete anyway?`
      )
      if (!proceed) return
    }
    setCompleting(true)
    setError('')
    const { error } = await supabase.from('inspections').update({ status: 'completed' }).eq('id', inspectionId)
    setCompleting(false)
    if (error) {
      setError(error.message)
      return
    }
    setInspection((prev) => ({ ...prev, status: 'completed' }))
  }

  if (!inspection || !building) return <p className="text-muted">Loading...</p>

  return (
    <div>
      <Link to={`/buildings/${building.id}`} className="back-link">
        <ArrowLeft size={16} /> {building.name}
      </Link>

      <div className="page-header">
        <h1 style={{ fontSize: '1.1rem' }}>Inspection - {formatDate(inspection.inspection_date)}</h1>
        <span className={`badge ${isCompleted ? 'badge-ok' : 'badge-open'}`}>
          {isCompleted ? 'Completed' : 'In progress'}
        </span>
      </div>

      {error && <div className="form-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {isCompleted && (
        <Link to={`/buildings/${building.id}/report/${inspection.id}`} className="btn-secondary btn-block" style={{ display: 'block', textAlign: 'center', marginBottom: '1rem', textDecoration: 'none' }}>
          View / print PDF report
        </Link>
      )}

      {doors.map((door) => (
        <div key={door.id} className="door-checklist-block">
          <h3>{door.location_label}</h3>
          {CHECKLIST_ITEMS.map((checklistItem) => {
            const item = itemsByDoor[door.id]?.[checklistItem.key]
            if (!item) return null
            return (
              <ChecklistItemRow
                key={item.id}
                item={item}
                label={checklistItem.label}
                companyId={profile?.company_id}
                disabled={isCompleted}
                onResultChange={(result) => updateItem(item.id, { result })}
                onNotesChange={(notes) => updateItem(item.id, { notes })}
              />
            )
          })}
        </div>
      ))}

      {!isCompleted && (
        <div className="sticky-footer">
          <div className="sticky-footer-inner">
            <button className="btn-primary btn-block" onClick={handleComplete} disabled={completing}>
              {completing ? 'Completing...' : 'Complete inspection'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
