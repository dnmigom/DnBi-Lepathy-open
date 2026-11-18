import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

const imageCache = new Map()

// lazy: true면 화면에 보일 때가 되어서야 불러와요 (갤러리처럼 사진이 많은 곳용)
export default function RemoteImage({ path, className, alt, lazy = false }) {
  const auth = useAuth()
  const [src, setSrc] = useState(imageCache.get(path) || null)
  const [error, setError] = useState(false)
  const [visible, setVisible] = useState(!lazy)
  const holderRef = useRef(null)

  useEffect(() => {
    if (visible || !holderRef.current) return undefined
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return undefined }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setVisible(true); io.disconnect() }
    }, { rootMargin: '300px' })
    io.observe(holderRef.current)
    return () => io.disconnect()
  }, [visible])

  useEffect(() => {
    setSrc(imageCache.get(path) || null)
    setError(false)
    if (!path || imageCache.has(path) || !visible) return
    let cancelled = false
    auth.client
      .getBase64File(path)
      .then((base64) => {
        if (cancelled || !base64) return
        const mime = guessMime(path)
        const dataUrl = `data:${mime};base64,${base64}`
        imageCache.set(path, dataUrl)
        setSrc(dataUrl)
      })
      .catch(() => !cancelled && setError(true))
    return () => { cancelled = true }
  }, [path, visible])

  if (!path) return null
  if (error) return <p className="comment-image-error">이미지를 불러오지 못했어요.</p>
  if (!src) return <div ref={holderRef} className={`${className || ''} skeleton`} />
  return <img className={className} src={src} alt={alt || '첨부 이미지'} loading="lazy" />
}

function guessMime(path) {
  if (path.endsWith('.gif')) return 'image/gif'
  if (path.endsWith('.png')) return 'image/png'
  return 'image/jpeg'
}
