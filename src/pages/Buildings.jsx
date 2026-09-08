import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext.jsx'

export default function Buildings() {
  const { profile } = useAuth()
  const [buildings, setBuildings] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [clientName, setClientName] = useState('')
  const [frequency, setFrequency] = useState(3)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadBuildings() {
    const { data, error } = await supabase.from('buildings').select('*').order('name')
    if (!error) setBuildings(data)
  }

  useEffect(() => {
    loadBuildings()
  }, [])

  async function handleAdd(e) {
    e.preventDefault()
    if (!profile?.company_id) return
    setSaving(true)
    setError('')
    const { error } = await supabase.from('buildings').insert({
      company_id: profile.company_id,
      name,
      address,
      client_name: clientName,
      inspection_frequency_months: Number(frequency),
    })
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setName('')
    setAddress('')
    setClientName('')
    setFrequency(3)
    setShowForm(false)
    loadBuildings()
  }

  return (
    <div>
      <div className="page-header">
        <h1>Buildings</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} style={{ verticalAlign: 'middle' }} /> Add
        </button>
      </div>

      {buildings === null && <p className="text-muted">Loading...</p>}
      {buildings?.length === 0 && (
        <div className="empty-state">No buildings yet. Add your first building to get started.</div>
      )}

      <div className="card-list">
        {buildings?.map((b) => (
          <Link key={b.id} to={`/buildings/${b.id}`} className="card-link">
            <div className="card">
              <div className="card-title">{b.name}</div>
              {b.address && <div className="card-subtitle">{b.address}</div>}
              {b.client_name && <div className="card-subtitle">Client: {b.client_name}</div>}
              <div className="card-meta-row">
                <span className="badge badge-ok">Every {b.inspection_frequency_months} mo</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <form className="modal-sheet" onClick={(e) => e.stopPropagation()} onSubmit={handleAdd}>
            <h2 style={{ margin: 0 }}>Add building</h2>
            <label>
              Building name
              <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </label>
            <label>
              Address
              <input value={address} onChange={(e) => setAddress(e.target.value)} />
            </label>
            <label>
              Client name
              <input value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </label>
            <label>
              Inspection frequency (months)
              <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                <option value={1}>Monthly</option>
                <option value={3}>Quarterly (default)</option>
                <option value={6}>Every 6 months</option>
                <option value={12}>Annually</option>
              </select>
            </label>
            {error && <div className="form-error">{error}</div>}
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
