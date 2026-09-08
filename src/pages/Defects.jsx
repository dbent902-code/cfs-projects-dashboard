import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { formatDate } from '../lib/compliance'

const TABS = [
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'closed', label: 'Closed' },
]

export default function Defects() {
  const [defects, setDefects] = useState(null)
  const [tab, setTab] = useState('open')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('defects')
        .select('*, buildings(name), fire_doors(location_label)')
        .order('due_date', { ascending: true })
      setDefects(data ?? [])
    }
    load()
  }, [])

  const filtered = defects?.filter((d) => d.status === tab) ?? []
  const now = Date.now()

  return (
    <div>
      <div className="page-header">
        <h1>Defects</h1>
      </div>

      <div className="result-toggle" style={{ marginBottom: '1rem' }}>
        {TABS.map((t) => (
          <button key={t.key} type="button" className={tab === t.key ? `selected ${t.key === 'open' ? 'fail' : t.key === 'closed' ? 'pass' : 'na'}` : ''} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {defects === null && <p className="text-muted">Loading...</p>}
      {defects && filtered.length === 0 && <div className="empty-state">No {tab.replace('_', ' ')} defects.</div>}

      <div className="card-list">
        {filtered.map((d) => {
          const overdue = d.status !== 'closed' && d.due_date && new Date(d.due_date).getTime() < now
          return (
            <Link key={d.id} to={`/defects/${d.id}`} className="card-link">
              <div className="card">
                <div className="list-item-row">
                  <div>
                    <div className="card-title" style={{ fontSize: '0.95rem' }}>
                      {d.buildings?.name} - {d.fire_doors?.location_label}
                    </div>
                    <div className="card-subtitle">{d.description}</div>
                  </div>
                  <span className={`badge ${overdue ? 'badge-overdue' : `badge-${d.status}`}`}>
                    {overdue ? 'Overdue' : d.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="card-subtitle" style={{ marginTop: '0.5rem' }}>
                  Due: {formatDate(d.due_date)}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
