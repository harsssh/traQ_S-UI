import store from '@/store'
import { UserId, UserGroupId } from '@/types/entity-ids'
import { changeChannelByPath } from './router/channel'

interface ExtendedWindow extends Window {
  /**
   * ユーザーモーダルを開く
   * レンダリングされたmarkdown本文に埋め込まれるリンク(`@user`)のクリック時に呼び出される
   * @param userId ユーザーID
   */
  openUserModal(userId: string): void

  /**
   * グループモーダルを開く
   * レンダリングされたmarkdown本文に埋め込まれるリンク(`@group`)のクリック時に呼び出される
   * @param userGroupId ユーザーグループID
   */
  openGroupModal(userGroupId: string): void

  /**
   * チャンネルを切り替える
   * レンダリングされたmarkdown本文に埋め込まれるリンク(`#channel`)のクリック時に呼び出される
   * @param channelPath チャンネルのパス(`#`は含まない、`/`区切り)
   */
  changeChannel(channelPath: string): void
}
declare const window: ExtendedWindow

const checkUserExistence = async (userId: UserId) => {
  if (userId in store.state.entities.users) return true
  try {
    await store.dispatch.entities.fetchUser(userId)
    return true
  } catch {
    return false
  }
}

const checkGroupExistence = (userGroupId: UserGroupId) => {
  return userGroupId in store.state.entities.userGroups
}

export const setupGlobalFuncs = () => {
  window.openUserModal = async (userId: UserId) => {
    if (!(await checkUserExistence(userId))) return

    const user = store.state.entities.users[userId]
    if (user?.bot && user.name.startsWith('Webhook#')) return

    store.dispatch.ui.modal.pushModal({
      type: 'user',
      id: userId
    })
  }

  window.openGroupModal = (userGroupId: UserGroupId) => {
    if (!checkGroupExistence(userGroupId)) return
    store.dispatch.ui.modal.pushModal({
      type: 'group',
      id: userGroupId
    })
  }

  window.changeChannel = (channelPath: string) => {
    changeChannelByPath(channelPath)
  }
}
