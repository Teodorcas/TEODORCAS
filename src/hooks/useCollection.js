import { useState, useEffect, useRef, useCallback } from 'react'
import { getCollection, readEntry, subscribe, afterWrite } from '../api/cache'

/**
 * Reads a cached collection.
 *
 * - Mirrored data paints synchronously on first render (instant after login).
 * - A cold key is the one fetch that fills the mirror.
 * - A write that touches this collection (afterWrite) refetches it.
 *
 * @param {string} name      cache key, e.g. 'drugs' or rangeKey('sales', 'today')
 * @param {string[]} deps    DB tables this collection depends on
 * @param {() => Promise} fetcher
 */
export function useCollection(name, deps, fetcher) {
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  const depsRef = useRef(deps)
  depsRef.current = deps

  const [state, setState] = useState(() => {
    const entry = readEntry(name)
    return {
      data: entry ? entry.data : null,
      loading: !entry,
      error: null,
    }
  })

  const load = useCallback(() => {
    return getCollection(name, depsRef.current, fetcherRef.current)
      .then(data => setState({ data, loading: false, error: null }))
      .catch(err => {
        setState(prev => ({
          data: prev.data,
          loading: false,
          error: prev.data ? null : err.message,
        }))
      })
  }, [name])

  useEffect(() => {
    let alive = true
    // Switching to an uncached period must show the skeleton, not the
    // previous period's list.
    const entry = readEntry(name)
    setState(
      entry
        ? { data: entry.data, loading: false, error: null }
        : { data: null, loading: true, error: null }
    )
    load()
    const unsubscribe = subscribe(name, () => {
      if (alive) load()
    })
    return () => {
      alive = false
      unsubscribe()
    }
  }, [name, load])

  const refresh = useCallback(() => {
    setState(prev => ({ ...prev, loading: true }))
    return load()
  }, [load])

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    refresh,
    invalidate: afterWrite,
  }
}
