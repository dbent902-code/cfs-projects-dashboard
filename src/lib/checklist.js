// Standard quarterly fire door checklist items.
// Based on the checks specified by the user (domain expert) rather than
// derived independently - order matters for the printed report.
export const CHECKLIST_ITEMS = [
  { key: 'leaf_condition', label: 'Door leaf condition' },
  { key: 'seals_intumescent', label: 'Seals / intumescent strips' },
  { key: 'hinges', label: 'Hinges' },
  { key: 'self_closer', label: 'Self-closer function' },
  { key: 'gaps', label: 'Gaps (approx 3-4mm)' },
  { key: 'signage', label: 'Signage' },
  { key: 'glazing', label: 'Glazing' },
  { key: 'frame_condition', label: 'Frame condition' },
]

export const RESULT_OPTIONS = ['pass', 'fail', 'na']
