export const FAVORITES_COLLECTION_ID = 'favorites'

const generateId = (prefix) => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

// API Helper
const api = {
  async get(endpoint) {
    const res = await fetch(`/api${endpoint}`)
    if (!res.ok) throw new Error(`API Error: ${res.statusText}`)
    return res.json()
  },
  async post(endpoint, data) {
    const res = await fetch(`/api${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(`API Error: ${res.statusText}`)
    return res.json()
  },
  async delete(endpoint) {
    const res = await fetch(`/api${endpoint}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`API Error: ${res.statusText}`)
    return res.json()
  },
  async upload(file) {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) throw new Error(`Upload Error: ${res.statusText}`)
    return res.json()
  }
}

export const getCollections = async () => {
  try {
    return await api.get('/collections')
  } catch (error) {
    console.warn('Collections storage unavailable:', error)
    return []
  }
}

const getCollection = async (id) => {
  const collections = await getCollections()
  return collections.find(c => c.id === id)
}

const putCollection = async (collection) => {
  return await api.post('/collections', collection)
}

export const ensureFavoritesCollection = async () => {
  try {
    const existing = await getCollection(FAVORITES_COLLECTION_ID)
    if (existing) return existing
    const collection = {
      id: FAVORITES_COLLECTION_ID,
      name: 'Favorites',
      createdAt: Date.now(),
      tracks: [],
    }
    await putCollection(collection)
    return collection
  } catch (error) {
    console.warn('Failed to ensure favorites collection:', error)
    return null
  }
}

export const createCollection = async (name) => {
  const collection = {
    id: generateId('col'),
    name,
    createdAt: Date.now(),
    tracks: [],
  }
  await putCollection(collection)
  return collection
}

export const deleteCollection = async (id) => {
  if (id === FAVORITES_COLLECTION_ID) {
    throw new Error('Favorites collection cannot be deleted')
  }
  return await api.delete(`/collections/${id}`)
}

export const appendTracksToCollection = async (collectionId, tracks) => {
  const collection = await getCollection(collectionId)
  if (!collection) throw new Error('Collection not found')
  const nextCollection = {
    ...collection,
    updatedAt: Date.now(),
    tracks: [...collection.tracks, ...tracks],
  }
  await putCollection(nextCollection)
  return nextCollection
}

export const replaceCollectionTracks = async (collectionId, tracks) => {
  const collection = await getCollection(collectionId)
  if (!collection) throw new Error('Collection not found')
  const nextCollection = {
    ...collection,
    updatedAt: Date.now(),
    tracks,
  }
  await putCollection(nextCollection)
  return nextCollection
}

export const removeTrackFromCollection = async (collectionId, trackId) => {
  const collection = await getCollection(collectionId)
  if (!collection) throw new Error('Collection not found')
  const nextCollection = {
    ...collection,
    updatedAt: Date.now(),
    tracks: collection.tracks.filter((track) => track.id !== trackId),
  }
  await putCollection(nextCollection)
  return nextCollection
}

export const serializeFiles = async (files) => {
  const items = Array.from(files || [])
  const uploadedTracks = await Promise.all(items.map(async (file) => {
    try {
      const uploadResult = await api.upload(file)
      return {
        id: generateId('track'),
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        addedAt: Date.now(),
        path: uploadResult.path, // Store the path returned by server
        originalName: uploadResult.originalName
      }
    } catch (e) {
      console.error('Failed to upload file:', file.name, e)
      return null
    }
  }))
  return uploadedTracks.filter(t => t !== null)
}

export const serializeTrackForStorage = async (track) => {
  // If it already has a path (was loaded from server), reuse it
  if (track.path) {
    return {
      id: track.sourceTrackId || generateId('track'),
      name: track.name,
      size: track.size,
      type: track.type,
      lastModified: track.lastModified || Date.now(),
      addedAt: Date.now(),
      path: track.path,
      originalName: track.name
    }
  }

  // Otherwise, we need to upload the blob/file
  const blob = track.blob || track.data || null
  let fileToUpload = blob

  if (!fileToUpload && track.url) {
    const response = await fetch(track.url)
    fileToUpload = await response.blob()
  }

  if (!fileToUpload) {
    throw new Error('No data to upload for track')
  }

  // Create a File object if it's just a Blob, to have a name
  if (!(fileToUpload instanceof File)) {
    fileToUpload = new File([fileToUpload], track.name || 'unknown.mp3', { type: fileToUpload.type })
  }

  const uploadResult = await api.upload(fileToUpload)

  return {
    id: track.sourceTrackId || generateId('track'),
    name: track.name,
    size: uploadResult.size,
    type: uploadResult.mimetype,
    lastModified: track.lastModified || Date.now(),
    addedAt: Date.now(),
    path: uploadResult.path,
    originalName: uploadResult.originalName
  }
}

export const hydrateStoredTrack = (storedTrack, collectionId) => {
  // storedTrack.path should be like "/api/uploads/filename.mp3"
  // We can use this directly as the URL
  return {
    id: generateId('playlist-track'),
    name: storedTrack.name,
    url: storedTrack.path, // Use the server URL directly
    size: storedTrack.size,
    lastModified: storedTrack.lastModified,
    type: storedTrack.type,
    blob: null, // We don't have the blob locally yet, browser fetches it via URL
    sourceCollectionId: collectionId,
    sourceTrackId: storedTrack.id,
    favoriteId: collectionId === FAVORITES_COLLECTION_ID ? storedTrack.id : undefined,
    path: storedTrack.path // Keep the path for re-serialization if needed
  }
}

export const isStorageAvailable = () => true // Always available via API
