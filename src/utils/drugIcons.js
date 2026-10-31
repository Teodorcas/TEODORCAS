import {
  Pill,
  Tablet,
  PillBottle,
  Droplets,
  Droplet,
  SprayCan,
  Syringe,
  FlaskConical,
  HeartPulse,
  Stethoscope,
  Beaker,
  Microscope,
} from 'lucide-react'

// The pharmacy's visual vocabulary — one icon per drug, stored by name.
export const DRUG_ICONS = [
  { name: 'Pill', label: 'Pill' },
  { name: 'Tablet', label: 'Tablet' },
  { name: 'PillBottle', label: 'Bottle' },
  { name: 'Droplets', label: 'Drops' },
  { name: 'Droplet', label: 'Liquid' },
  { name: 'SprayCan', label: 'Spray' },
  { name: 'Syringe', label: 'Injection' },
  { name: 'FlaskConical', label: 'Lab' },
  { name: 'HeartPulse', label: 'Care' },
  { name: 'Stethoscope', label: 'Clinical' },
  { name: 'Microscope', label: 'Test' },
  { name: 'Beaker', label: 'Solution' },
]

const REGISTRY = {
  Pill,
  Tablet,
  PillBottle,
  Droplets,
  Droplet,
  SprayCan,
  Syringe,
  FlaskConical,
  HeartPulse,
  Stethoscope,
  Microscope,
  Beaker,
}

export const DEFAULT_DRUG_ICON = 'Pill'

export function getDrugIcon(name) {
  return REGISTRY[name] || Pill
}
