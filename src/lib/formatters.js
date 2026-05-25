export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export const MOVEMENT_LABELS = {
  RECEIPT:              'Receipt',
  TRANSFER_OUT:         'Transfer Out',
  TRANSFER_IN:          'Transfer In',
  ADJUSTMENT_INCREASE:  'Adjustment +',
  ADJUSTMENT_DECREASE:  'Adjustment −',
};

export const MOVEMENT_TONES = {
  RECEIPT:              'brand',
  TRANSFER_OUT:         'amber',
  TRANSFER_IN:          'brand',
  ADJUSTMENT_INCREASE:  'neutral',
  ADJUSTMENT_DECREASE:  'red',
};

export const STATUS_LABELS = {
  NEW_MODIFIED: 'New / Modified',
  RETAINED:     'Retained',
};

export const DISPUTE_REASON_LABELS = {
  INCOMPLETE:  'Incomplete count',
  DAMAGED:     'Damaged on arrival',
  WRONG_TOOL:  'Wrong tool sent',
  OTHER:       'Other',
};

export const ACK_LABELS = {
  PENDING_ACK: 'Pending',
  ACCEPTED:    'Accepted',
  DISPUTED:    'Disputed',
};

export const ACK_TONES = {
  PENDING_ACK: 'amber',
  ACCEPTED:    'brand',
  DISPUTED:    'red',
};
