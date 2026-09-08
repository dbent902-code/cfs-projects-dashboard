// Shared helpers for computing inspection due dates / overdue status.

export function addMonths(date, months) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

export function nextDueDate(lastInspectionDate, frequencyMonths) {
  if (!lastInspectionDate) return null
  return addMonths(lastInspectionDate, frequencyMonths)
}

export function isOverdue(lastInspectionDate, frequencyMonths) {
  if (!lastInspectionDate) return true
  const due = nextDueDate(lastInspectionDate, frequencyMonths)
  return due.getTime() < Date.now()
}

export function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
