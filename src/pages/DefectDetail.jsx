import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { formatDate } from '../lib/compliance'

const STATUSES = ['open', 'in_progress', 'closed']

export default function DefectDetail() {
  const { defectId } = useParams()
  const [defect, setDefect] = useState(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('defects')
      .select('*, buildings(id, name), fire_doors(location_label)')
      .eq('id', defectId)
      .single()
    setDefect(data)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defectId])

  async function handleStatusChange(status) {
    setSaving(true)
    const patch = { status, closed_at: status === 'closed' ? new Date().toISOString() : null }
    await supabase.from('defects').update(patch).eq('id', defectId)
    setDefect((prev) => ({ ...prev, ...patch }))
    setSaving(false)
  }

  if (!defect) return <p className="text-muted">Loading...</p>

  return (
    <div>
      <Link to="/defects" className="back-link">
        <ArrowLeft size={16} /> Defects
      </Link>

      <div className="page-header">
        <h1 style={{ fontSize: '1.15rem' }}>{defect.fire_doors?.location_label}</h1>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-subtitle">
          {defect.buildings && (
            <Link to={`/buildings/${defect.buildings.id}`}>{defect.buildings.name}</Link>
          )}
        </div>
        <p style={{ marginTop: '0.75rem' }}>{defect.description}</p>
        <div className="card-subtitle">Due: {formatDate(defect.due_date)}</div>
        {defect.closed_at && <div className="card-subtitle">Closed: {formatDate(defect.closed_at)}</div>}
      </div>

      <div className="section-title" style={{ marginTop: 0 }}>Status</div>
      <div className="result-toggle">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            disabled={saving}
            className={defect.status === s ? `selected ${s === 'open' ? 'fail' : s === 'closed' ? 'pass' : 'na'}` : ''}
            onClick={() => handleStatusChange(s)}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>
    </div>
  )
}
