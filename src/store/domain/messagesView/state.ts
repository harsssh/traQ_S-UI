import { MessageId, ChannelId, UserId, ClipFolderId } from '@/types/entity-ids'
import { Pin, ChannelViewer } from '@traptitech/traq'
import { EmbeddingOrUrl } from '@traptitech/traq-markdown-it'

export type LoadingDirection = 'former' | 'latter' | 'around' | 'latest'

export interface S {
  // FIXME: 分離

  /** 現在のチャンネルID、日時ベースのフェッチを行う */
  currentChannelId?: ChannelId

  /** 現在のクリップフォルダID、オフセットベースのフェッチを行う */
  currentClipFolderId?: ClipFolderId

  /** 現在表示対象になっている全てのメッセージID */
  messageIds: MessageId[]

  pinnedMessages: Pin[]

  /**
   * WebSocketの`MESSAGE_CREATED`イベントに対応する必要があるか
   *
   * `isReachedLatest`と同期する必要がある
   */
  shouldRetriveMessageCreateEvent: boolean

  renderedContentMap: Record<MessageId, string>

  embeddingsMap: Record<MessageId, EmbeddingOrUrl[] | undefined>

  currentViewers: ChannelViewer[]

  topic: string

  subscribers: UserId[]

  bots: UserId[]

  /** 現在編集中のメッセージID */
  editingMessageId?: MessageId

  /** 現在のチャンネルの未読メッセージの数 */
  unreadSince: string | undefined
}

export const state: S = {
  currentChannelId: undefined,
  currentClipFolderId: undefined,
  messageIds: [],
  pinnedMessages: [],
  renderedContentMap: {},
  embeddingsMap: {},
  shouldRetriveMessageCreateEvent: false,
  currentViewers: [],
  topic: '',
  subscribers: [],
  bots: [],
  editingMessageId: undefined,
  unreadSince: undefined
}
