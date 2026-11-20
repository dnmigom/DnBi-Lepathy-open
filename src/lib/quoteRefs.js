// 인용 기록: refs/quotes.json
//   { items: { [인용된 글/댓글 key]: [ { date, memberId, postId, from, text, createdAt } ] } }
// 어떤 글이 누구에게 몇 번 인용됐는지, 어디서 인용됐는지를 빠르게 알기 위한 파일이에요.
// 파일이 아직 없으면(처음 한 번) 지금까지의 모든 글을 훑어서 만들어요.
import { enqueue, updateJsonFile } from './jsonStore.js'
import { loadAllPosts } from './allPosts.js'
import { targetKey } from './userState.js'

const PATH = 'refs/quotes.json'

const refId = (r) => `${r.date}:${r.memberId}:${r.postId}`

export async function loadQuoteRefs(client) {
  const res = await client.getJson(PATH, { fresh: true })
  return res ? (res.json?.items || {}) : null
}

/** 처음 한 번: 모든 글을 훑어서 인용 기록을 만들어 저장 */
export async function buildQuoteRefs(client) {
  const posts = await loadAllPosts(client)
  const items = {}
  for (const p of posts) {
    for (const q of p.json.quotes || []) {
      const key = q.key || targetKey(q)
      ;(items[key] ||= []).push({
        date: p.date, memberId: p.memberId, postId: p.postId, from: p.memberId,
        text: (p.json.content || '').slice(0, 100), createdAt: p.json.createdAt || null,
      })
    }
  }
  await enqueue('refs:quotes', () => updateJsonFile(client, PATH, (cur) => (
    cur.items ? undefined : { items } // 그 사이 누가 먼저 만들었으면 그대로 둬요
  ), { fallback: () => ({}), message: '인용 기록 만들기' }))
  return items
}

/** 새 글이 인용한 것들을 기록 / 글이 지워지거나 인용이 빠지면 기록에서 지우기 */
export function changeQuoteRefs(client, { add = [], remove = [], ref }) {
  if (!add.length && !remove.length) return Promise.resolve(null)
  const id = refId(ref)
  return enqueue('refs:quotes', () => updateJsonFile(client, PATH, (cur) => {
    const items = { ...(cur.items || {}) }
    for (const key of remove) {
      items[key] = (items[key] || []).filter((r) => refId(r) !== id)
      if (!items[key].length) delete items[key]
    }
    for (const key of add) {
      const list = (items[key] || []).filter((r) => refId(r) !== id)
      items[key] = [...list, ref]
    }
    return { items }
  }, { fallback: () => ({ items: {} }), message: '인용 기록' })).then((saved) => saved?.items || null)
}
