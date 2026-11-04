// Built-in consultation layouts. They contain headings and prompts only, never
// findings or conclusions, so the doctor fills in every clinical detail. Each
// hospital's doctors can save their own versions too.

export type NoteTemplate = {
  id: string
  name: string
  symptoms: string
  findings: string
  notes: string
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'general',
    name: 'General review',
    symptoms: '',
    findings: 'History:\n\nExamination:\n\nInvestigations:\n',
    notes: 'Plan:\n\nAdvice given:\n',
  },
  {
    id: 'fever',
    name: 'Fever / suspected malaria',
    symptoms: 'fever',
    findings:
      'Duration and pattern of fever:\n\nAssociated symptoms:\n\nTravel or exposure:\n\nExamination (temperature, hydration, chest, throat, spleen, neck):\n\nTests requested:\n',
    notes: 'Plan:\n\nWarning signs explained:\n\nReview if not improving:\n',
  },
  {
    id: 'respiratory',
    name: 'Cough / respiratory infection',
    symptoms: 'cough',
    findings:
      'Duration of cough or breathlessness:\n\nFever:\n\nContacts or exposure:\n\nExamination (respiratory rate, chest, throat, ears):\n\nSpO₂ (see vitals):\n',
    notes: 'Plan:\n\nWarning signs explained:\n\nReview:\n',
  },
  {
    id: 'hypertension',
    name: 'Hypertension follow-up',
    symptoms: '',
    findings:
      'Symptoms since last visit:\n\nTakes medication as prescribed:\n\nBlood pressure today (see vitals):\n\nExamination (heart, swelling, eyes):\n\nSide effects:\n',
    notes: 'Medication changes:\n\nLifestyle advice:\n\nNext review:\n',
  },
  {
    id: 'diabetes',
    name: 'Diabetes follow-up',
    symptoms: '',
    findings:
      'Symptoms since last visit (thirst, passing urine, weight change):\n\nTakes treatment and follows diet:\n\nHome glucose readings:\n\nExamination (feet, eyes, injection sites):\n\nLatest HbA1c or glucose result:\n',
    notes: 'Treatment changes:\n\nAdvice given:\n\nNext review:\n',
  },
  {
    id: 'antenatal',
    name: 'Antenatal visit',
    symptoms: '',
    findings:
      'Gestational age or LMP:\n\nFetal movements:\n\nSymptoms (headache, swelling, bleeding, pain):\n\nBlood pressure and weight (see vitals):\n\nFundal height and fetal heart:\n\nUrine and blood tests:\n',
    notes: 'Plan:\n\nAdvice given:\n\nNext visit:\n',
  },
  {
    id: 'child',
    name: 'Child review',
    symptoms: '',
    findings:
      'Parent or guardian concerns:\n\nFeeding and fluid intake:\n\nImmunisation status:\n\nGrowth (weight, height; see vitals):\n\nExamination:\n',
    notes: 'Plan:\n\nAdvice given:\n\nReview:\n',
  },
  {
    id: 'wound',
    name: 'Wound or injury',
    symptoms: '',
    findings:
      'How and when it happened:\n\nWound description (site, size, depth, contamination):\n\nNerve and blood supply check:\n\nTetanus status:\n\nImaging requested:\n',
    notes: 'Treatment given:\n\nAdvice given:\n\nReview:\n',
  },
]
