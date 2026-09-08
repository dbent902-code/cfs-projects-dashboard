import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { formatDate, isOverdue } from '../lib/compliance'

export default function Dashboard() {
  const [rows, setRows] = useState(null)

  useEffect(() => {
    async function load() {
      const [{ data: buildings }, { data: inspections }, { data: defects }] = await Promise.all([
        supabase.from('buildings').select('*').order('name'),
        supabase
          .from('inspections')
          .select('building_id, inspection_date')
          .eq('status', 'completed')
          .order('inspection_date', { ascending: false }),
        supabase.from('defects').select('building_id, status').neq('status', 'closed'),
      ])

      const lastInspectionByBuilding = {}
      for (const insp of inspections ?? []) {
        if (!lastInspectionByBuilding[insp.building_id]) {
          lastInspectionByBuilding[insp.building_id] = insp.inspection_date
        }
      }

      const openDefectsByBuilding = {}
      for (const d of defects ?? []) {
        openDefectsByBuilding[d.building_id] = (openDefectsByBuilding[d.building_id] ?? 0) + 1
      }

      const combined = (buildings ?? []).map((b) => ({
        ...b,
        lastInspectionDate: lastInspectionByBuilding[b.id] ?? null,
        openDefects: openDefectsByBuilding[b.id] ?? 0,
        overdue: isOverdue(lastInspectionByBuilding[b.id] ?? null, b.inspection_frequency_months),
      }))
      setRows(combined)
    }
    load()
  }, [])

  if (rows === null) return <p className="text-muted">Loading...</p>

  const overdueCount = rows.filter((r) => r.overdue).length
  const totalOpenDefects = rows.reduce((sum, r) => sum + r.openDefects, 0)

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      <div className="stat-grid">
        <div className="stat-tile">
          <div className="stat-value">{rows.length}</div>
          <div className="stat-label">Buildings</div>
        </div>
        <div className={`stat-tile ${overdueCount > 0 ? 'warn' : ''}`}>
          <div className="stat-value">{overdueCount}</div>
          <div className="stat-label">Overdue for inspection</div>
        </div>
        <div className={`stat-tile ${totalOpenDefects > 0 ? 'warn' : ''}`}>
          <div className="stat-value">{totalOpenDefects}</div>
          <div className="stat-label">Open defects</div>
        </div>
      </div>

      <div className="section-title" style={{ marginTop: 0 }}>Buildings</div>

      {rows.length === 0 && (
        <div className="empty-state">
          No buildings yet. <Link to="/buildings">Add your first building</Link>.
        </div>
      )}

      <div className="card-list">
        {rows.map((b) => (
          <Link key={b.id} to={`/buildings/${b.id}`} className="card-link">
            <div className="card">
              <div className="card-title">{b.name}</div>
              <div className="card-subtitle">Last inspection: {formatDate(b.lastInspectionDate)}</div>
              <div className="card-meta-row">
                {b.overdue ? (
                  <span className="badge badge-overdue">Inspection overdue</span>
                ) : (
                  <span className="badge badge-ok">Up to date</span>
                )}
                {b.openDefects > 0 && <span className="badge badge-open">{b.openDefects} open defect(s)</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
