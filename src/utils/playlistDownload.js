import JSZip from 'jszip'

const sanitizeSegment = (value, fallback) => {
  if (!value || typeof value !== 'string') return fallback
  const trimmed = value.trim().replace(/[/\\?%*:|"<>]/g, '-')
  return trimmed || fallback
}

const guessExtension = (name, type) => {
  if (name && name.includes('.')) {
    const [, ext = ''] = name.match(/\.([^.]+)$/) || []
    if (ext) return ext.toLowerCase()
  }
  if (!type) return 'bin'
  const lookup = {
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/flac': 'flac',
    'audio/x-flac': 'flac',
    'audio/aac': 'aac',
    'audio/mp4': 'm4a',
    'video/mpeg': 'mpeg',
  }
  return lookup[type] || type.split('/').pop() || 'bin'
}

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  requestAnimationFrame(() => {
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  })
}

export const downloadCollectionArchive = async (collectionName, storedTracks = []) => {
  if (!storedTracks.length) return
  const safeCollectionName = sanitizeSegment(collectionName, 'playlist')
  const zip = new JSZip()
  const folder = zip.folder(safeCollectionName)

  storedTracks.forEach((track, index) => {
    const baseName = sanitizeSegment(track.name?.replace(/\.[^.]+$/, ''), `track-${index + 1}`)
    const extension = guessExtension(track.name, track.type)
    const fileName = `${baseName}.${extension}`
    folder.file(fileName, track.data)
  })

  folder.file(
    'playlist.json',
    JSON.stringify(
      {
        name: collectionName || 'Playlist',
        generatedAt: new Date().toISOString(),
        trackCount: storedTracks.length,
        tracks: storedTracks.map((track, index) => ({
          index: index + 1,
          name: track.name,
          size: track.size,
          type: track.type,
          lastModified: track.lastModified,
        })),
      },
      null,
      2,
    ),
  )

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  const archiveName = `${safeCollectionName}.zip`
  triggerDownload(zipBlob, archiveName)
}
