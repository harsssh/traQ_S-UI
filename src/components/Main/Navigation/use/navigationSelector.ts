import { NavigationItemType } from '@/components/Main/Navigation/use/navigation'
import { SetupContext } from '@vue/composition-api'

export const navigationChangeEvent = 'navigation-change'

const useNavigationSelectorItem = (context: SetupContext) => {
  const onNavigationItemClick = (type: NavigationItemType) => {
    context.emit(navigationChangeEvent, type)
  }
  return {
    onNavigationItemClick
  }
}

export default useNavigationSelectorItem