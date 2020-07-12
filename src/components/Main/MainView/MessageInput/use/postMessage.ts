import { TextState } from './textInput'
import { ChannelId } from '@/types/entity-ids'
import store from '@/store'
import apis, { buildFilePathForPost } from '@/lib/apis'
import { Attachment } from '@/store/ui/fileInput/state'
import { replace as embedInternalLink } from '@/lib/internalLinkEmbedder'
import useChannelPath from '@/use/channelPath'
import { computed, ref } from '@vue/composition-api'

/**
 * @param progress アップロード進行状況 0～1
 */
type ProgressCallback = (progress: number) => void

const uploadAttachments = async (
  attachments: Attachment[],
  channelId: ChannelId,
  onProgress: ProgressCallback
) => {
  const responses = []
  for (const [i, attachment] of attachments.entries()) {
    responses.push(
      await apis.postFile(attachment.file, channelId, {
        /**
         * https://github.com/axios/axios#request-config
         */
        onUploadProgress(e: ProgressEvent) {
          onProgress((i + e.loaded / e.total) / attachments.length)
        }
      })
    )
  }
  return responses.map(res => buildFilePathForPost(res.data.id))
}

const usePostMessage = (
  textState: TextState,
  props: { channelId: ChannelId }
) => {
  const { channelPathToId, channelIdToShortPathString } = useChannelPath()

  const isForce = computed(
    () => store.state.entities.channels[props.channelId]?.force
  )
  const confirmString = computed(() =>
    isForce
      ? `#${channelIdToShortPathString(
          props.channelId
        )}に投稿されたメッセージは全員に通知されます。メッセージを投稿しますか？`
      : ''
  )

  const isPosting = ref(false)
  const progress = ref(0)

  const postMessage = async () => {
    if (isPosting.value) return
    if (textState.isEmpty && store.getters.ui.fileInput.isEmpty) return

    if (isForce.value && !confirm(confirmString.value)) {
      // 強制通知チャンネルでconfirmをキャンセルしたときは何もしない
      return
    }

    const embededText = embedInternalLink(textState.text, {
      getUser: store.getters.entities.userByName,
      getGroup: store.getters.entities.userGroupByName,
      getChannel: path => {
        try {
          const id = channelPathToId(
            path.split('/'),
            store.state.domain.channelTree.channelTree
          )
          return { id }
        } catch {
          return undefined
        }
      }
    })

    try {
      isPosting.value = true

      const fileUrls = await uploadAttachments(
        store.state.ui.fileInput.attachments,
        props.channelId,
        p => {
          progress.value = p
        }
      )
      const embededdUrls = fileUrls.join('\n')

      await apis.postMessage(props.channelId, {
        content:
          embededText + (embededText && embededdUrls ? '\n' : '') + embededdUrls
      })

      textState.text = ''
      store.commit.ui.fileInput.clearAttachments()
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('メッセージ送信に失敗しました', e)

      store.commit.ui.toast.addToast({
        type: 'error',
        text: 'メッセージ送信に失敗しました'
      })
    } finally {
      isPosting.value = false
      progress.value = 0
    }
  }
  return { postMessage, isPosting, progress }
}

export default usePostMessage
