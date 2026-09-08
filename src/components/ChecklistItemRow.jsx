import { Camera } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function ChecklistItemRow({ item, label, companyId, disabled, onResultChange, onNotesChange }) {
  const [notes, setNotes] = useState(item.notes ?? '')
  const [photos, setPhotos] = useState([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    loadPhotos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id])

  async function loadPhotos() {
    const { data } = await supabase.from('photos').select('*').eq('inspection_item_id', item.id).order('created_at')
    if (!data) return
    const withUrls = await Promise.all(
      data.map(async (p) => {
        const { data: signed } = await supabase.storage
          .from('inspection-photos')
          .createSignedUrl(p.storage_path, 3600)
        return { ...p, url: signed?.signedUrl }
      })
    )
    setPhotos(withUrls)
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !companyId) return
    setUploading(true)
    const path = `${companyId}/${item.id}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('inspection-photos').upload(path, file)
    if (!uploadError) {
      await supabase.from('photos').insert({ inspection_item_id: item.id, storage_path: path })
      await loadPhotos()
    }
    setUploading(false)
  }

  async function handleDeletePhoto(photo) {
    await supabase.storage.from('inspection-photos').remove([photo.storage_path])
    await supabase.from('photos').delete().eq('id', photo.id)
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
  }

  return (
    <div className="checklist-item">
      <div className="checklist-item-label">{label}</div>
      <div className="result-toggle">
        {['pass', 'fail', 'na'].map((r) => (
          <button
            key={r}
            type="button"
            disabled={disabled}
            className={item.result === r ? `selected ${r}` : ''}
            onClick={() => onResultChange(r)}
          >
            {r}
          </button>
        ))}
      </div>
      <textarea
        placeholder="Notes (optional)"
        value={notes}
        disabled={disabled}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => onNotesChange(notes)}
      />
      <div className="photo-row">
        {photos.map((p) => (
          <div key={p.id} className="photo-thumb">
            {p.url && <img src={p.url} alt="Inspection evidence" />}
            {!disabled && <button onClick={() => handleDeletePhoto(p)}>&times;</button>}
          </div>
        ))}
        {!disabled && (
          <label className="photo-add-label">
            {uploading ? '...' : <Camera size={20} />}
            <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} disabled={uploading} />
          </label>
        )}
      </div>
    </div>
  )
}
