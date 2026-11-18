import { listPosts, loadIndex } from './dataModel.js'

const CONCURRENCY = 6 // 동시에 불러올 날짜 수

/** 여러 날짜의 글을 한꺼번에 불러와요. onChunk로 받은 만큼씩 바로바로 넘겨줘요. */
export async function loadPostsForDates(client, dates, { memberId = null, onChunk, onProgress, isCancelled } = {}) {
  let cursor = 0
  let done = 0
  const all = []
  const worker = async () => {
    while (cursor < dates.length) {
      if (isCancelled?.()) return
      const date = dates[cursor++]
      try {
        const list = (await listPosts(client, date, memberId)).map((p) => ({ ...p, date }))
        all.push(...list)
        if (!isCancelled?.()) onChunk?.(list)
      } catch (_) { /* 한 날짜가 실패해도 나머지는 계속 */ }
      done += 1
      if (!isCancelled?.()) onProgress?.(done, dates.length)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  return all
}

/** 모든 날짜의 글 (최신 날짜부터) */
export async function loadAllPosts(client, opts = {}) {
  const { json: index } = await loadIndex(client)
  const dates = Object.keys(index).sort((a, b) => (a < b ? 1 : -1))
  opts.onProgress?.(0, dates.length)
  return loadPostsForDates(client, dates, opts)
}
