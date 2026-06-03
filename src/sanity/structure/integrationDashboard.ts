import type {StructureBuilder} from 'sanity/structure'

import {IntegrationDashboard} from '@/sanity/components/IntegrationDashboard'

export function integrationDashboardList(S: StructureBuilder) {
  return S.component()
    .id('integration-dashboard')
    .title('Integration Dashboard')
    .component(IntegrationDashboard)
}
