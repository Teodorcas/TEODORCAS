import { fetchConfig } from './auth'
import { fetchDrugs } from './drugs'
import { getSales, rangeKey } from './sales'
import { fetchDebtors, fetchDebtorEntries } from './debtors'
import { refreshAll } from './cache'

/**
 * Everything the app can ask for, fetched once in parallel right after
 * login so the whole session starts with a warm, current mirror.
 *
 * The sales key uses rangeKey so it matches the Dashboard's own cache key
 * exactly — otherwise "today" would be fetched twice under two names.
 */
export function warmUp() {
  return refreshAll([
    { name: 'config', deps: ['config'], fetcher: fetchConfig },
    { name: 'drugs', deps: ['drugs'], fetcher: fetchDrugs },
    {
      name: rangeKey('sales', 'today'),
      deps: ['sales'],
      fetcher: () => getSales('today'),
    },
    { name: 'debtors', deps: ['debtors'], fetcher: fetchDebtors },
    { name: 'debtor_entries', deps: ['debtor_entries'], fetcher: fetchDebtorEntries },
  ])
}
