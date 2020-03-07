import { defineMutations } from 'direct-vuex'
import { S, LayoutType, ViewInformation } from './state'

export const mutations = defineMutations<S>()({
  setLayout(state: S, layout: LayoutType) {
    state.layout = layout
  },
  setPrimaryView(state: S, view: ViewInformation) {
    state.primaryView = view
  },
  setSecondaryView(state: S, view: ViewInformation) {
    state.primaryView = view
  }
})
