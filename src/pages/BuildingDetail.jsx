import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { CHECKLIST_ITEMS } from '../lib/checklist'
import { formatDate, isOverdue } from '../lib/compliance'

export default function BuildingDetail() {
  const { buildingId } = useParams()
  const navigate = useNavigate()

  const [building, setBuilding] = useState(null)
  const [doors, setDoors] = useState([])
  const [inspections, setInspections] = useState([])
  const [showDoorForm, setShowDoorForm] = useState(false)
  const [doorLabel, setDoorLabel] = useState('')
  const [doorType, setDoorType] = useState('')
  const [savingDoor, setSavingDoor] = useState(false)
  const [startingInspection, setStartingInspection] = useState(false)
  const [error, setError] = useState('')

  async function loadAll() {
    const [{ data: b }, { data: d }, { data: insp }] = await Promise.all([
      supabase.from('buildings').select('*').eq('id', buildingId).single(),
      supabase.from('fire_doors').select('*').eq('building_id', buildingId).order('location_label'),
      supabase
        .from('inspections')
        .select('*')
        .eq('building_id', buildingId)
        .order('inspection_date', { ascending: false }),
    ])
    setBuilding(b)
    setDoors(d ?? [])
    setInspections(insp ?? [])
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingId])

  const lastCompleted = inspections.find((i) => i.status === 'completed')
  const overdue = building ? isOverdue(lastCompleted?.inspection_date, building.inspection_frequency_months) : false

  async function handleAddDoor(e) {
    e.preventDefault()
    setSavingDoor(true)
    setError('')
    const { error } = await supabase.from('fire_doors').insert({
      building_id: buildingId,
      location_label: doorLabel,
      door_type: doorType,
    })
    setSavingDoor(false)
    if (error) {
      setError(error.message)
      return
    }
    setDoorLabel('')
    setDoorType('')
    setShowDoorForm(false)
    loadAll()
  }

  async function handleDeleteDoor(doorId) {
    if (!confirm('Remove this door? This cannot be undone.')) return
    await supabase.from('fire_doors').delete().eq('id', doorId)
    loadAll()
  }

  async function handleStartInspection() {
    if (doors.length === 0) {
      setError('Add at least one fire door before starting an inspection.')
      return
    }
    setStartingInspection(true)
    setError('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data: inspection, error: inspError } = await supabase
      .from('inspections')
      .insert({ building_id: buildingId, inspector_id: user?.id })
      .select()
      .single()

    if (inspError) {
      setError(inspError.message)
      setStartingInspection(false)
      return
    }

    const rows = doors.flatMap((door) =>
      CHECKLIST_ITEMS.map((item) => ({
        inspection_id: inspection.id,
        fire_door_id: door.id,
        item_key: item.key,
        result: 'na',
      }))
    )
    const { error: itemsError } = await supabase.from('inspection_items').insert(rows)
    setStartingInspection(false)
    if (itemsError) {
      setError(itemsError.message)
      return
    }
    navigate(`/inspections/${inspection.id}`)
  }

  if (!building) return <p className="text-muted">Loading...</p>

  return (
    <div>
      <Link to="/buildings" className="back-link">
        <ArrowLeft size={16} /> Buildings
      </Link>

      <div className="page-header">
        <h1>{building.name}</h1>
      </div>
      {building.address && <p className="card-subtitle">{building.address}</p>}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="list-item-row">
          <div>
            <div className="card-subtitle">Inspection frequency</div>
            <div>Every {building.inspection_frequency_months} month(s)</div>
          </div>
          {overdue ? (
            <span className="badge badge-overdue">Overdue</span>
          ) : (
            <span className="badge badge-ok">Up to date</span>
          )}
        </div>
        <div className="card-subtitle" style={{ marginTop: '0.5rem' }}>
          Last completed inspection: {formatDate(lastCompleted?.inspection_date)}
        </div>
      </div>

      {error && <div className="form-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <button className="btn-primary btn-block" onClick={handleStartInspection} disabled={startingInspection}>
        {startingInspection ? 'Starting...' : 'Start new inspection'}
      </button>

      <div className="page-header" style={{ marginTop: '1.5rem' }}>
        <h1 style={{ fontSize: '1.05rem' }}>Fire doors ({doors.length})</h1>
        <button className="btn-secondary" onClick={() => setShowDoorForm(true)}>
          <Plus size={16} style={{ verticalAlign: 'middle' }} /> Add door
        </button>
      </div>

      {doors.length === 0 && <div className="empty-state">No fire doors added yet.</div>}

      <div className="card-list">
        {doors.map((door) => (
          <div key={door.id} className="card">
            <div className="list-item-row">
              <div>
                <div className="card-title" style={{ fontSize: '0.95rem' }}>
                  {door.location_label}
                </div>
                {door.door_type && <div className="card-subtitle">{door.door_type}</div>}
              </div>
              <button className="icon-button" style={{ color: 'var(--color-fail)' }} onClick={() => handleDeleteDoor(door.id)}>
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="section-title">Inspection history</div>
      {inspections.length === 0 && <div className="empty-state">No inspections recorded yet.</div>}
      <div className="card-list">
        {inspections.map((insp) => (
          <Link key={insp.id} to={`/inspections/${insp.id}`} className="card-link">
            <div className="card">
              <div className="list-item-row">
                <div className="card-title" style={{ fontSize: '0.95rem' }}>{formatDate(insp.inspection_date)}</div>
                <span className={`badge ${insp.status === 'completed' ? 'badge-ok' : 'badge-open'}`}>
                  {insp.status === 'completed' ? 'Completed' : 'In progress'}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {showDoorForm && (
        <div className="modal-backdrop" onClick={() => setShowDoorForm(false)}>
          <form className="modal-sheet" onClick={(e) => e.stopPropagation()} onSubmit={handleAddDoor}>
            <h2 style={{ margin: 0 }}>Add fire door</h2>
            <label>
              Location
              <input
                value={doorLabel}
                onChange={(e) => setDoorLabel(e.target.value)}
                placeholder="e.g. Flat 3 entrance door"
                required
                autoFocus
              />
            </label>
            <label>
              Door type (optional)
              <input value={doorType} onChange={(e) => setDoorType(e.target.value)} placeholder="e.g. FD30" />
            </label>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowDoorForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={savingDoor}>
                {savingDoor ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
