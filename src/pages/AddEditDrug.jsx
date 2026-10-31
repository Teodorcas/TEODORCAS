import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
import { InputField } from '../components/ui/InputField'
import { PrimaryButton, DangerButton } from '../components/ui/Button'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { DrugIconPicker } from '../components/drug/DrugIconPicker'
import { PackTypeSelector } from '../components/drug/PackTypeSelector'
import { useToast } from '../context/ToastContext'
import { formatCurrency } from '../utils/formatters'
import { DEFAULT_DRUG_ICON } from '../utils/drugIcons'
import {
  getDrugById,
  addDrug,
  updateDrug,
  deleteDrug,
  checkDrugName,
} from '../api/drugs'

const EMPTY_FORM = {
  name: '',
  icon: DEFAULT_DRUG_ICON,
  packType: '',
  sachetsPerCarton: '',
  pricePerSachet: '',
  stockCartons: '',
  stockSachets: '',
  restockThreshold: '',
}

const EMPTY_ERRORS = {
  name: '',
  icon: '',
  packType: '',
  sachetsPerCarton: '',
  pricePerSachet: '',
  stockCartons: '',
  stockSachets: '',
  restockThreshold: '',
}

function round2(value) {
  return Math.round(value * 100) / 100
}

function isNonNegInt(value) {
  if (value === '') return true
  return /^\d+$/.test(String(value))
}

/**
 * Sachets carry decimals — a dose sale takes a fraction of a sachet, so the
 * shelf can hold "9.8". Two decimal places is all we ever need.
 */
function isNonNegDecimal(value) {
  if (value === '') return true
  return /^\d+(\.\d{1,2})?$/.test(String(value))
}

export default function AddEditDrug() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState(EMPTY_ERRORS)
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(isEdit)
  const [deleteModal, setDeleteModal] = useState(false)
  const submittingRef = useRef(false)

  const isCarton = form.packType === 'carton'
  const sachetsPerCarton = isCarton ? parseInt(form.sachetsPerCarton) || 0 : 1
  const pricePerSachet = parseFloat(form.pricePerSachet) || 0
  const pricePerCarton = round2(pricePerSachet * (sachetsPerCarton || 1))

  useEffect(() => {
    if (!isEdit) return
    async function load() {
      try {
        const drug = await getDrugById(id)
        setForm({
          name: drug.name,
          icon: drug.icon || DEFAULT_DRUG_ICON,
          packType: drug.pack_type,
          sachetsPerCarton: String(drug.sachets_per_carton),
          pricePerSachet: String(drug.price_per_sachet),
          stockCartons: String(drug.stock_cartons),
          stockSachets: String(drug.stock_sachets),
          restockThreshold: String(drug.restock_threshold),
        })
      } catch {
        showToast('Failed to load drug.', 'error')
        navigate('/drugs')
      } finally {
        setFetchLoading(false)
      }
    }
    load()
  }, [id, isEdit, navigate, showToast])

  function setField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  function validate() {
    const next = { ...EMPTY_ERRORS }
    let valid = true

    if (!form.name.trim()) { next.name = 'Drug name is required.'; valid = false }
    else if (form.name.trim().length < 2) { next.name = 'Name must be at least 2 characters.'; valid = false }
    else if (form.name.trim().length > 60) { next.name = 'Name must be under 60 characters.'; valid = false }

    if (!form.packType) { next.packType = 'Please select how this drug is packed.'; valid = false }

    if (isCarton) {
      if (!form.sachetsPerCarton) { next.sachetsPerCarton = 'Number of sachets in a carton is required.'; valid = false }
      else if (!/^\d+$/.test(String(form.sachetsPerCarton)) || Number(form.sachetsPerCarton) < 1) {
        next.sachetsPerCarton = 'Must be 1 or more.'
        valid = false
      }
    }

    if (!form.pricePerSachet) { next.pricePerSachet = 'Price per sachet is required.'; valid = false }
    else if (!(Number(form.pricePerSachet) > 0)) { next.pricePerSachet = 'Please enter a valid price.'; valid = false }

    if (!isNonNegInt(form.stockCartons)) { next.stockCartons = 'Must be a whole number of 0 or more.'; valid = false }
    if (!isNonNegDecimal(form.stockSachets)) { next.stockSachets = 'Must be 0 or more, with up to 2 decimal places.'; valid = false }

    if (form.restockThreshold === '') { next.restockThreshold = 'Restock alert quantity is required.'; valid = false }
    else if (!/^\d+$/.test(String(form.restockThreshold))) { next.restockThreshold = 'Must be a whole number (0 or more).' ; valid = false }

    setErrors(next)
    return valid
  }

  function buildPayload() {
    const per = isCarton ? parseInt(form.sachetsPerCarton) || 1 : 1
    const price = round2(parseFloat(form.pricePerSachet) || 0)
    return {
      name: form.name.trim(),
      icon: form.icon || DEFAULT_DRUG_ICON,
      packType: form.packType,
      sachetsPerCarton: per,
      pricePerSachet: price,
      pricePerCarton: round2(price * per),
      stockCartons: isCarton ? (parseInt(form.stockCartons) || 0) : 0,
      stockSachets: parseFloat(form.stockSachets) || 0,
      restockThreshold: parseInt(form.restockThreshold) || 0,
    }
  }

  async function handleSave() {
    if (!validate()) return
    if (submittingRef.current) return
    submittingRef.current = true
    setLoading(true)

    try {
      const payload = buildPayload()

      if (isEdit) {
        await updateDrug(id, payload)
      } else {
        const existing = await checkDrugName(payload.name)
        if (existing) {
          showToast('A drug with this name already exists.', 'error')
          return
        }
        await addDrug(payload)
      }

      navigate('/drugs')
      showToast(isEdit ? 'Drug updated successfully.' : 'Drug registered successfully.')
    } catch (err) {
      showToast(err.message || 'Failed to save drug.', 'error')
    } finally {
      setLoading(false)
      submittingRef.current = false
    }
  }

  async function handleDelete() {
    setDeleteModal(false)
    setLoading(true)
    try {
      await deleteDrug(id)
      showToast('Drug deleted.')
      navigate('/drugs')
    } catch (err) {
      showToast(err.message || 'Failed to delete drug.', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      <TopBar
        title={isEdit ? 'Edit Drug' : 'Register Drug'}
        showBack
        onBack={() => navigate('/drugs')}
      />

      <PageWrapper hasBottomNav={false}>
        <div className="flex flex-col gap-5 pt-2">

          <DrugIconPicker
            value={form.icon}
            onChange={val => setField('icon', val)}
            error={errors.icon}
          />

          <InputField
            label="Drug Name"
            placeholder="e.g. Paracetamol 500mg"
            value={form.name}
            onChange={e => setField('name', e.target.value)}
            error={errors.name}
          />

          <PackTypeSelector
            selected={form.packType}
            onChange={val => {
              setForm(prev => ({ ...prev, packType: val, sachetsPerCarton: val === 'sachet' ? '' : prev.sachetsPerCarton }))
              setErrors(prev => ({ ...prev, packType: '', sachetsPerCarton: '' }))
            }}
            error={errors.packType}
          />

          {isCarton && (
            <InputField
              label="Sachets inside one Carton"
              placeholder="e.g. 10"
              type="number"
              value={form.sachetsPerCarton}
              onChange={e => setField('sachetsPerCarton', e.target.value)}
              error={errors.sachetsPerCarton}
              min="1"
              helperText="Enter 1 or more. Use 1 if the carton holds a single sachet."
            />
          )}

          <InputField
            label="Price per Sachet (₦)"
            placeholder="e.g. 150"
            type="number"
            value={form.pricePerSachet}
            onChange={e => setField('pricePerSachet', e.target.value)}
            error={errors.pricePerSachet}
            min="0"
          />

          {isCarton && sachetsPerCarton >= 1 && pricePerSachet > 0 && (
            <div className="flex items-center justify-between bg-brand-bg rounded-btn px-4 py-3">
              <div className="flex flex-col">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Price per Carton</p>
                <p className="text-[11px] text-gray-400">
                  {sachetsPerCarton} × {formatCurrency(pricePerSachet)}
                </p>
              </div>
              <p className="text-base font-black text-accent font-sans">{formatCurrency(pricePerCarton)}</p>
            </div>
          )}

          {/* Opening stock */}
          <div className="flex items-center gap-2 pt-1">
            <div className="flex-1 h-px bg-gray-200" />
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Stock in Store</p>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div className="flex gap-3">
            {isCarton && (
              <div className="flex-1">
                <InputField
                  label="Cartons"
                  placeholder="0"
                  type="number"
                  value={form.stockCartons}
                  onChange={e => setField('stockCartons', e.target.value)}
                  error={errors.stockCartons}
                  min="0"
                />
              </div>
            )}
            <div className="flex-1">
              <InputField
                label="Sachets"
                placeholder="0"
                type="number"
                step="0.01"
                value={form.stockSachets}
                onChange={e => setField('stockSachets', e.target.value)}
                error={errors.stockSachets}
                min="0"
              />
            </div>
          </div>

          <InputField
            label="Restock Alert at (sachets)"
            placeholder="e.g. 50"
            type="number"
            value={form.restockThreshold}
            onChange={e => setField('restockThreshold', e.target.value)}
            error={errors.restockThreshold}
            min="0"
            helperText="You'll be alerted on the Restock page when total sachets reach this number."
          />

          <div className="flex flex-col gap-3 pt-2 pb-4">
            <PrimaryButton
              label={loading ? 'Saving...' : isEdit ? 'Update Drug' : 'Register Drug'}
              onClick={handleSave}
              fullWidth
              loading={loading}
              disabled={loading}
            />
            {isEdit && (
              <DangerButton
                label="Delete Drug"
                onClick={() => setDeleteModal(true)}
                fullWidth
                disabled={loading}
              />
            )}
          </div>
        </div>
      </PageWrapper>

      <ConfirmModal
        isOpen={deleteModal}
        title="Delete Drug"
        message={`Are you sure you want to delete "${form.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal(false)}
        dangerous
      />
    </>
  )
}
