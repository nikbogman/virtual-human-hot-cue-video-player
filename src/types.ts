export interface HotCue {
  id: string // also the IndexedDB key for this clip's file
  key: string
  startTime: number // offset within the clip
  title: string // short name, e.g. "Introduction"
  label: string // longer text, e.g. the first lines of what's said
  fileName: string
}
