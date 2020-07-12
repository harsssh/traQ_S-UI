import { computed, reactive } from '@vue/composition-api'
import store from '@/store'
import { isImage, isNonPreviewable, isVideo, isAudio } from '@/lib/util/file'
import { isDefined } from '@/lib/util/array'

const useFileMetaList = (props: { fileIds: string[] }) => {
  const fileMetaData = computed(() =>
    props.fileIds
      .map(id => store.state.entities.fileMetaData[id])
      .filter(isDefined)
  )
  const state = reactive({
    images: computed(() =>
      fileMetaData.value.filter(
        meta => !isNonPreviewable(meta) && isImage(meta.mime)
      )
    ),
    videos: computed(() =>
      fileMetaData.value.filter(meta => isVideo(meta.mime))
    ),
    audios: computed(() =>
      fileMetaData.value.filter(meta => isAudio(meta.mime))
    ),
    files: computed(() =>
      fileMetaData.value.filter(meta => isNonPreviewable(meta))
    )
  })
  return { fileMetaDataState: state }
}

export default useFileMetaList
