export const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Unpaid', color: '#92400E', bg: '#FEF3C7' },
  PARTIAL: { label: 'Part paid', color: '#1E40AF', bg: '#DBEAFE' },
  PAID: { label: 'Paid', color: '#0B6B4D', bg: '#E6FAF4' },
  OVERDUE: { label: 'Overdue', color: '#991B1B', bg: '#FEE2E2' },
  CANCELLED: { label: 'Cancelled', color: '#6B7280', bg: '#F3F4F6' },
}

export const METHOD_LABEL: Record<string, string> = { CASH: 'Cash', TRANSFER: 'Bank transfer', CARD: 'Card', POS: 'POS' }
export const TYPE_LABEL: Record<string, string> = {
  CONSULTATION: 'Consultation', LAB: 'Laboratory', PHARMACY: 'Pharmacy', PROCEDURE: 'Procedure', RADIOLOGY: 'Radiology', ADMISSION: 'Admission',
}
