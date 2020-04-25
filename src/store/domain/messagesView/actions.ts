import { defineActions } from 'direct-vuex'
import store, { moduleActionContext } from '@/store'
import { messagesView } from './index'
import { ChannelId, MessageId, StampId, ClipFolderId } from '@/types/entity-ids'
import { ChannelViewState, Message } from '@traptitech/traq'
import { render } from '@/lib/markdown'
import apis from '@/lib/apis'
import { changeViewState } from '@/lib/websocket'
import { embeddingExtractor } from '@/lib/embeddingExtractor'

export const messagesViewActionContext = (context: any) =>
  moduleActionContext(context, messagesView)

export const actions = defineActions({
  resetViewState(context) {
    const { commit } = messagesViewActionContext(context)
    commit.unsetLoadedMessageOldestDate()
    commit.unsetLoadedMessageLatestDate()
    commit.setMessageIds([])
    commit.setRenderedContent({})
    commit.setCurrentViewer([])
    commit.setSubscribers([])
  },
  async changeCurrentChannel(
    context,
    payload: { channelId: ChannelId; entryMessageId?: MessageId }
  ) {
    const { state, commit, dispatch, rootState } = messagesViewActionContext(
      context
    )
    if (state.currentChannelId === payload.channelId) return

    commit.unsetCurrentClipFolderId()

    changeViewState(payload.channelId, ChannelViewState.Monitoring)
    commit.setCurrentChannelId(payload.channelId)
    dispatch.resetViewState()

    if (payload.entryMessageId) {
      commit.setIsReachedEnd(false)
      commit.setIsReachedLatest(false)
      commit.setEntryMessageId(payload.entryMessageId)
      commit.setLastLoadingDirection('around')
      await dispatch.fetchAndRenderChannelMessageAroundEntryMessage(
        payload.entryMessageId
      )
      commit.setIsInitialLoad(true)
    } else {
      commit.setIsReachedEnd(false)
      commit.setIsReachedLatest(true)
      commit.unsetEntryMessageId()
      commit.setLastLoadingDirection('latest')
      await dispatch.fetchAndRenderChannelFormerMessages()
      commit.setIsInitialLoad(true)
    }
    dispatch.fetchPinnedMessages()
    dispatch.fetchTopic()
    if (!rootState.entities.channels[payload.channelId]?.force) {
      dispatch.fetchSubscribers()
    }
  },

  /** クリップフォルダに移行 */
  async changeCurrentClipFolder(context, clipFolderId: ClipFolderId) {
    const { commit, dispatch } = messagesViewActionContext(context)
    commit.unsetCurrentChannelId()
    changeViewState(null)
    dispatch.resetViewState()
    commit.setCurrentClipFolderId(clipFolderId)
  },

  /** 読み込まれているメッセージより前のメッセージを取得し、HTMLにレンダリングする */
  async fetchAndRenderChannelFormerMessages(context) {
    const { state, commit, dispatch } = messagesViewActionContext(context)
    const messageIds = await dispatch.fetchChannelFormerMessages()
    await Promise.all(
      messageIds.map(messageId => dispatch.renderMessageContent(messageId))
    )
    commit.setMessageIds([
      ...new Set([...messageIds.reverse(), ...state.messageIds])
    ])
  },

  /** 読み込まれているメッセージより後のメッセージを取得し、HTMLにレンダリングする */
  async fetchAndRenderChannelLatterMessages(context) {
    const { state, commit, dispatch } = messagesViewActionContext(context)
    const messageIds = await dispatch.fetchChannelLatterMessages()
    await Promise.all(
      messageIds.map(messageId => dispatch.renderMessageContent(messageId))
    )
    commit.setMessageIds([...new Set([...state.messageIds, ...messageIds])])
  },

  /** エントリーメッセージ周辺のメッセージを取得し、HTMLにレンダリングする */
  async fetchAndRenderChannelMessageAroundEntryMessage(
    context,
    entryMessageId: string
  ) {
    const {
      commit,
      dispatch,
      rootState,
      rootDispatch
    } = messagesViewActionContext(context)
    const entryMessage =
      rootState.entities.messages[entryMessageId] ??
      (await rootDispatch.entities.fetchMessage(entryMessageId))

    if (!entryMessage) {
      return
    }

    const date = new Date(entryMessage.createdAt)
    commit.setLoadedMessageLatestDate(date)
    commit.setLoadedMessageOldestDate(date)

    const [formerMessageIds, latterMessageIds] = await Promise.all([
      dispatch.fetchChannelFormerMessages(),
      dispatch.fetchChannelLatterMessages()
    ])
    const messageIds = [
      ...new Set([
        ...formerMessageIds.reverse(),
        entryMessageId,
        ...latterMessageIds
      ])
    ]
    await Promise.all(
      messageIds.map(messageId => dispatch.renderMessageContent(messageId))
    )
    commit.setMessageIds(messageIds)
  },

  /** 読み込まれているメッセージより前のメッセージを取得し、idを返す */
  async fetchChannelFormerMessages(context): Promise<ChannelId[]> {
    const { state, commit, rootDispatch } = messagesViewActionContext(context)
    if (state.isReachedEnd || !state.currentChannelId) return []
    const {
      messages,
      hasMore
    } = await rootDispatch.entities.fetchMessagesByChannelId({
      channelId: state.currentChannelId,
      limit: state.fetchLimit,
      order: 'desc',
      until: state.loadedMessageOldestDate
    })

    if (!hasMore) {
      commit.setIsReachedEnd(true)
    }

    const oldestMessage = messages[messages.length - 1]
    const oldestMessageDate = new Date(oldestMessage.createdAt)
    if (
      !state.loadedMessageOldestDate ||
      oldestMessageDate < state.loadedMessageOldestDate
    ) {
      commit.setLoadedMessageOldestDate(oldestMessageDate)
    }

    return messages.map(message => message.id)
  },

  /** 読み込まれているメッセージより後のメッセージを取得し、idを返す */
  async fetchChannelLatterMessages(context): Promise<ChannelId[]> {
    const { state, commit, rootDispatch } = messagesViewActionContext(context)
    if (state.isReachedLatest || !state.currentChannelId) return []
    const {
      messages,
      hasMore
    } = await rootDispatch.entities.fetchMessagesByChannelId({
      channelId: state.currentChannelId,
      limit: state.fetchLimit,
      order: 'asc',
      since: state.loadedMessageLatestDate
    })

    if (!hasMore) {
      commit.setIsReachedLatest(true)
    }

    const latestMessage = messages[messages.length - 1]
    const latestMessageDate = new Date(latestMessage.createdAt)
    if (
      !state.loadedMessageLatestDate ||
      latestMessageDate > state.loadedMessageLatestDate
    ) {
      commit.setLoadedMessageLatestDate(latestMessageDate)
    }

    return messages.map(message => message.id)
  },

  async fetchPinnedMessages(context) {
    const { state, commit } = messagesViewActionContext(context)
    if (!state.currentChannelId) throw 'no channel id'
    const res = await apis.getChannelPins(state.currentChannelId)
    commit.setPinnedMessages(res.data)
  },
  async fetchTopic(context) {
    const { state, commit } = messagesViewActionContext(context)
    if (!state.currentChannelId) throw 'no channel id'
    const res = await apis.getChannelTopic(state.currentChannelId)
    commit.setTopic(res.data.topic)
  },
  async fetchSubscribers(context) {
    const { state, commit } = messagesViewActionContext(context)
    if (!state.currentChannelId) throw 'no channel id'
    const res = await apis.getChannelSubscribers(state.currentChannelId)
    commit.setSubscribers(res.data)
  },
  async fetchChannelLatestMessage(context) {
    const { state, commit, dispatch, rootDispatch } = messagesViewActionContext(
      context
    )
    if (!state.currentChannelId) throw 'no channel id'
    const { messages } = await rootDispatch.entities.fetchMessagesByChannelId({
      channelId: state.currentChannelId,
      limit: 1,
      offset: 0
    })
    if (messages.length !== 1) return
    commit.setLoadedMessageLatestDate(new Date(messages[0].createdAt))
    const messageId = messages[0].id
    await dispatch.renderMessageContent(messageId)
    commit.setMessageIds([...state.messageIds, messageId])
  },
  async renderMessageContent(context, messageId: string) {
    const { commit, rootState, rootDispatch } = messagesViewActionContext(
      context
    )
    const content = rootState.entities.messages[messageId]?.content ?? ''

    const extracted = embeddingExtractor(content)

    await Promise.all(
      extracted.embeddings.map(async e => {
        try {
          if (e.type === 'file') {
            await rootDispatch.entities.fetchFileMetaByFileId(e.id)
          }
          if (e.type === 'message') {
            const message = await rootDispatch.entities.fetchMessage(e.id)

            // テキスト部分のみレンダリング
            const extracted = embeddingExtractor(message.content)
            const renderedContent = render(extracted.text)
            commit.addRenderedContent({
              messageId: message.id,
              renderedContent
            })
          }
        } catch (e) {
          // TODO: エラー処理、無効な埋め込みの扱いを考える必要あり
        }
      })
    )

    const renderedContent = render(extracted.text)
    commit.addRenderedContent({ messageId, renderedContent })
    commit.addEmbedding({
      messageId,
      embeddings: extracted.embeddings
    })
  },
  async addAndRenderMessage(context, payload: { message: Message }) {
    const { commit, dispatch } = messagesViewActionContext(context)
    await dispatch.renderMessageContent(payload.message.id)
    commit.setLoadedMessageLatestDate(new Date(payload.message.createdAt))
    commit.addMessageId(payload.message.id)
    store.commit.domain.me.deleteUnreadChannel(payload.message.channelId)
  },
  async updateAndRenderMessageId(context, payload: { message: Message }) {
    const { commit, dispatch } = messagesViewActionContext(context)
    await dispatch.renderMessageContent(payload.message.id)
    commit.setLoadedMessageLatestDate(new Date(payload.message.updatedAt))
    commit.updateMessageId(payload.message.id)
    store.commit.domain.me.deleteUnreadChannel(payload.message.channelId)
  },
  async addStamp(_, payload: { messageId: MessageId; stampId: StampId }) {
    apis.addMessageStamp(payload.messageId, payload.stampId)
    store.commit.domain.me.upsertLocalStampHistory({
      stampId: payload.stampId,
      datetime: new Date()
    })
  },
  removeStamp(_, payload: { messageId: MessageId; stampId: StampId }) {
    apis.removeMessageStamp(payload.messageId, payload.stampId)
  },
  addPinned(_, payload: { messageId: MessageId }) {
    apis.createPin(payload.messageId)
  },
  removePinned(_, payload: { messageId: MessageId }) {
    apis.removePin(payload.messageId)
  }
})
