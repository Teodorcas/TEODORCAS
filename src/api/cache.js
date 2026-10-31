import { supabase } from './supabase'

// ─── TEODORCAS mirror cache ───────────────────────────────────────────────
// Every read from Supabase is mirrored in localStorage for the session.
//
//   login      -> one full fetch of everything, written to the mirror
//   reads      -> painted instantly from the mirror, zero DB requests
//   writes     -> go to the DB first; on success the affected collections
//                 are refetched and written straight back to the mirror
//
// There is deliberately NO background polling. The database is only ever
// contacted when the app asks on purpose: a first read, a refresh after a
// successful write, or the warm-up that follows login.
// ──────────────────────────────────────────────────────────────────────────

const PREFIX = 'teo:v1:'
const MAX_BYTES = 2_000_000

const registry = new Map() // name -> { deps, fetcher }
const listeners = new Map() // name -> Set<fn>
const inflight = new Map() // name -> Promise

// ─── localStorage entry helpers ───────────────────────────────────────────

export function readEntry(name) {
  try {
    const raw = localStorage.getItem(PREFIX + name)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && parsed.data !== undefined ? parsed : null
  } catch {
    return null
  }
}

function writeEntry(name, data, deps) {
  try {
    localStorage.setItem(PREFIX + name, JSON.stringify({ data, deps, at: Date.now() }))
    prune()
  } catch {}
}

function dropEntry(name) {
  try {
    localStorage.removeItem(PREFIX + name)
  } catch {}
}

function allNames() {
  const names = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(PREFIX)) names.push(key.slice(PREFIX.length))
    }
  } catch {}
  return names
}

// localStorage is capped (~5MB) — evict oldest entries past the budget.
function prune() {
  try {
    const items = []
    let total = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith(PREFIX)) continue
      const raw = localStorage.getItem(key) || ''
      const size = key.length + raw.length
      total += size
      let at = 0
      try {
        at = JSON.parse(raw).at || 0
      } catch {}
      items.push({ key, at, size })
    }
    if (total <= MAX_BYTES) return
    items.sort((a, b) => a.at - b.at)
    for (const item of items) {
      if (total <= MAX_BYTES) break
      localStorage.removeItem(item.key)
      total -= item.size
    }
  } catch {}
}

// ─── subscription plumbing ────────────────────────────────────────────────

export function subscribe(name, fn) {
  if (!listeners.has(name)) listeners.set(name, new Set())
  listeners.get(name).add(fn)
  return () => listeners.get(name)?.delete(fn)
}

function notify(name) {
  listeners.get(name)?.forEach(fn => {
    try {
      fn()
    } catch {}
  })
}

// ─── core read ────────────────────────────────────────────────────────────

// Always hits the DB and rewrites the mirror. Falls back to the mirror if
// the request fails, so an offline blip never blanks a visible screen.
async function refresh(name, deps, fetcher) {
  try {
    const data = await fetcher()
    writeEntry(name, data, deps)
    return data
  } catch (err) {
    const entry = readEntry(name)
    if (entry) return entry.data
    throw err
  }
}

export function getCollection(name, deps, fetcher) {
  registry.set(name, { deps, fetcher })
  if (inflight.has(name)) return inflight.get(name)

  // Mirrored -> instant, not a single request.
  const entry = readEntry(name)
  if (entry) return Promise.resolve(entry.data)

  // Cold -> this is the one fetch that fills the mirror.
  const promise = refresh(name, deps, fetcher).finally(() => inflight.delete(name))
  inflight.set(name, promise)
  return promise
}

// ─── session warm-up ──────────────────────────────────────────────────────

/**
 * Drops the given collections and refetches them all in parallel, so a
 * whole session starts with a warm, current mirror. Requests are deduped
 * against anything a mounted page is already fetching.
 */
export async function refreshAll(collections) {
  collections.forEach(c => dropEntry(c.name))
  await Promise.allSettled(
    collections.map(c => getCollection(c.name, c.deps, c.fetcher))
  )
}

// ─── write-side update ────────────────────────────────────────────────────

/**
 * Call after an insert/update/delete has SUCCEEDED on the database.
 * Drops every mirror entry that depends on one of the given tables, then
 * notifies the pages currently showing one so they refetch — which writes
 * the fresh rows back into the mirror.
 */
export async function afterWrite(...tables) {
  const hit = deps => (deps || []).some(t => tables.includes(t))

  // Entries not currently on screen: just drop, next read fetches fresh.
  for (const name of allNames()) {
    const entry = readEntry(name)
    if (entry && hit(entry.deps)) dropEntry(name)
  }

  // Collections on screen: drop + notify so they update right now.
  for (const [name, reg] of registry) {
    if (!hit(reg.deps)) continue
    dropEntry(name)
    notify(name)
  }
}

export function clearCache() {
  for (const name of allNames()) dropEntry(name)
}
