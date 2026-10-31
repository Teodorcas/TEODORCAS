import { supabase } from './supabase'
import { afterWrite } from './cache'

export async function fetchDrugs() {
  const { data, error } = await supabase
    .from('drugs')
    .select('*')
    .order('name')

  if (error) throw new Error('Failed to load drugs.')
  return data
}

export async function searchDrugs(query) {
  const { data, error } = await supabase
    .from('drugs')
    .select('*')
    .ilike('name', `%${query}%`)
    .order('name')
    .limit(20)

  if (error) throw new Error('Failed to search drugs.')
  return data
}

export async function getDrugById(id) {
  const { data, error } = await supabase
    .from('drugs')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error('Failed to load drug.')
  return data
}

export async function checkDrugName(name) {
  const { data, error } = await supabase
    .from('drugs')
    .select('id')
    .ilike('name', name)
    .maybeSingle()

  if (error) throw new Error('Failed to check drug name.')
  return data
}

function drugPayload(drug) {
  return {
    name: drug.name,
    pack_type: drug.packType,
    sachets_per_carton: drug.sachetsPerCarton,
    price_per_sachet: drug.pricePerSachet,
    price_per_carton: drug.pricePerCarton,
    stock_cartons: drug.stockCartons,
    stock_sachets: drug.stockSachets,
    restock_threshold: drug.restockThreshold,
    icon: drug.icon,
    updated_at: new Date().toISOString(),
  }
}

export async function addDrug(drug) {
  const { data, error } = await supabase
    .from('drugs')
    .insert([drugPayload(drug)])
    .select()
    .single()

  if (error) {
    if (error.code === '23505') throw new Error('A drug with this name already exists.')
    throw new Error('Failed to save drug.')
  }

  await afterWrite('drugs')
  return data
}

export async function updateDrug(id, drug) {
  const { error } = await supabase
    .from('drugs')
    .update(drugPayload(drug))
    .eq('id', id)

  if (error) {
    if (error.code === '23505') throw new Error('A drug with this name already exists.')
    throw new Error('Failed to update drug.')
  }

  await afterWrite('drugs')
}

export async function updateDrugStock(id, stockCartons, stockSachets) {
  const { error } = await supabase
    .from('drugs')
    .update({
      stock_cartons: stockCartons,
      stock_sachets: stockSachets,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw new Error('Failed to update stock.')
  await afterWrite('drugs')
}

export async function deleteDrug(id) {
  const { error } = await supabase
    .from('drugs')
    .delete()
    .eq('id', id)

  if (error) throw new Error('Failed to delete drug.')
  await afterWrite('drugs')
}
