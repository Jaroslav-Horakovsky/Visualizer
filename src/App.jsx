import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActionIcon,
  AppShell,
  Badge,
  Box,
  Burger,
  Button,
  Drawer,
  Divider,
  Group,
  NavLink,
  ScrollArea,
  Slider,
  Stack,
  Text,
  Title,
  Tooltip,
  useMantineColorScheme,
} from '@mantine/core'
import {
  IconAdjustmentsAlt,
  IconHeart,
  IconHome,
  IconList,
  IconMicrophone2,
  IconMoonStars,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerTrackNext,
  IconPlayerTrackPrev,
  IconPlaylist,
  IconSettings,
  IconSun,
  IconWaveSine,
  IconChevronLeft,
  IconChevronRight,
  IconSunset,
  IconBolt,
  IconMoon,
  IconArrowsMaximize,
} from '@tabler/icons-react'
import { useDisclosure } from '@mantine/hooks'
import AudioVisualizer from './components/AudioVisualizer.jsx'
import Playlist from './components/Playlist.jsx'
import CollectionsPanel from './components/CollectionsPanel.jsx'
import FavoritesPanel from './components/FavoritesPanel.jsx'
import {
  appendTracksToCollection,
  createCollection,
  deleteCollection,
  ensureFavoritesCollection,
  getCollections,
  hydrateStoredTrack,
  isStorageAvailable,
  removeTrackFromCollection,
  replaceCollectionTracks,
  serializeFiles,
  serializeTrackForStorage,
  FAVORITES_COLLECTION_ID,
} from './utils/mediaCollections.js'
import { downloadCollectionArchive } from './utils/playlistDownload.js'

const librarySections = [
  { label: 'Now Playing', icon: IconHome, value: 'now-playing' },
  { label: 'Playlists', icon: IconPlaylist, value: 'playlists' },
  { label: 'Favourites', icon: IconHeart, value: 'favourites' },
  { label: 'Live Sessions', icon: IconMicrophone2, value: 'live-sessions' },
  { label: 'Discover', icon: IconWaveSine, value: 'discover' },
]

const tonePresets = ['Aurora', 'Neon Grid', 'Deep Sea', 'Sunrise']

const mixPresets = [
  {
    id: 'chillwave',
    title: 'Chillwave',
    icon: IconSunset,
    description: 'Soft synths and wide pads',
    colors: ['#a855f7', '#ec4899', '#22d3ee'],
    background: { inner: '#111633', outer: '#020617' },
    haloColor: 'rgba(168, 85, 247, 0.28)',
    particleColor: 'rgba(244, 244, 255, 0.85)',
    particleDensity: 55,
    energyBoost: 0.8,
    warpStrength: 0.35,
    pulseStrength: 0.4,
    defaultIntensity: 62,
    streakDensity: 110,
    waveHeight: 0.85,
    tunnelDepth: 0.65,
    ringThickness: 0.22,
    flareColor: 'rgba(255, 255, 255, 0.55)',
    gridOpacity: 0.32,
    equalizerContrast: 0.85,
    tunnelGlow: 0.8,
    auroraWeight: 1,
    spectrumWeight: 0.8,
    starburstWeight: 0.65,
    blockWeight: 0.7,
    accentColor: '#f0abfc',
    gridTint: 'rgba(255, 255, 255, 0.4)',
    barCount: 46,
    reflectionStrength: 0.7,
    glowColor: '#f0abfc',
    floorColor: 'rgba(7, 10, 22, 0.92)',
    backgroundGradient: {
      top: '#04050b',
      middle: '#091433',
      bottom: '#05030a',
    },
    starDensity: 65,
  },
  {
    id: 'pulse-drive',
    title: 'Pulse Drive',
    icon: IconBolt,
    description: 'High energy bass stabs',
    colors: ['#f97316', '#fb7185', '#fcd34d'],
    background: { inner: '#1c0f0a', outer: '#030712' },
    haloColor: 'rgba(249, 115, 22, 0.28)',
    particleColor: 'rgba(255, 180, 120, 0.9)',
    particleDensity: 70,
    energyBoost: 1.25,
    warpStrength: 0.55,
    pulseStrength: 0.7,
    defaultIntensity: 82,
    streakDensity: 160,
    waveHeight: 0.55,
    tunnelDepth: 0.9,
    ringThickness: 0.3,
    flareColor: 'rgba(255, 183, 77, 0.65)',
    gridOpacity: 0.45,
    equalizerContrast: 1.1,
    tunnelGlow: 1,
    auroraWeight: 0.65,
    spectrumWeight: 1,
    starburstWeight: 1,
    blockWeight: 0.8,
    accentColor: '#ffd166',
    gridTint: 'rgba(255, 160, 122, 0.45)',
    barCount: 54,
    reflectionStrength: 0.82,
    glowColor: '#ffb347',
    floorColor: 'rgba(26, 8, 4, 0.94)',
    backgroundGradient: {
      top: '#070200',
      middle: '#1c0c05',
      bottom: '#030102',
    },
    starDensity: 90,
  },
  {
    id: 'lunar-echoes',
    title: 'Lunar Echoes',
    icon: IconMoon,
    description: 'Sparse ambience and delay',
    colors: ['#38bdf8', '#22d3ee', '#a5f3fc'],
    background: { inner: '#03181f', outer: '#010a17' },
    haloColor: 'rgba(56, 189, 248, 0.26)',
    particleColor: 'rgba(148, 197, 255, 0.85)',
    particleDensity: 40,
    energyBoost: 0.65,
    warpStrength: 0.25,
    pulseStrength: 0.25,
    defaultIntensity: 48,
    streakDensity: 90,
    waveHeight: 0.65,
    tunnelDepth: 0.55,
    ringThickness: 0.18,
    flareColor: 'rgba(96, 193, 255, 0.45)',
    gridOpacity: 0.28,
    equalizerContrast: 0.7,
    tunnelGlow: 0.6,
    auroraWeight: 1.1,
    spectrumWeight: 0.75,
    starburstWeight: 0.55,
    blockWeight: 0.55,
    accentColor: '#8be9fd',
    gridTint: 'rgba(112, 193, 255, 0.35)',
    barCount: 40,
    reflectionStrength: 0.58,
    glowColor: '#8dd7ff',
    floorColor: 'rgba(3, 10, 18, 0.9)',
    backgroundGradient: {
      top: '#010812',
      middle: '#021427',
      bottom: '#000307',
    },
    starDensity: 50,
  },
]

const formatTime = (value) => {
  if (!value || Number.isNaN(value)) return '0:00'
  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const revokeTrackUrl = (track) => {
  if (track?.url) {
    URL.revokeObjectURL(track.url)
  }
}

function App() {
  const { colorScheme, setColorScheme } = useMantineColorScheme()
  const [navbarOpened, { toggle: toggleNavbar, close: closeNavbar }] = useDisclosure(true)
  const [asideOpened, { toggle: toggleAside }] = useDisclosure(true)
  const [queueOpened, { toggle: toggleQueue, close: closeQueue }] = useDisclosure(false)
  const [activeSection, setActiveSection] = useState('now-playing')
  const [intensity, setIntensity] = useState(70)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playlist, setPlaylist] = useState([])
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1)
  const [collections, setCollections] = useState([])
  const [volume, setVolume] = useState(0.8)
  const [track, setTrack] = useState(null)
  const [mixPresetId, setMixPresetId] = useState(mixPresets[0].id)

  const audioRef = useRef(null)
  const playlistRef = useRef([])
  const lastTrackUrlRef = useRef(null)
  const autoPlayPendingRef = useRef(false)
  const previousVolumeRef = useRef(0.8)
  const visualizerRef = useRef(null)

  const storageEnabled = isStorageAvailable()

  useEffect(() => {
    if (currentTrackIndex < 0 || currentTrackIndex >= playlist.length) {
      setTrack(null)
      return
    }
    setTrack(playlist[currentTrackIndex])
  }, [currentTrackIndex, playlist])

  const toggleColorScheme = () => {
    setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')
  }

  const refreshCollections = useCallback(async () => {
    if (!storageEnabled) return
    await ensureFavoritesCollection()
    const stored = await getCollections()
    setCollections(stored)
  }, [storageEnabled])

  useEffect(() => {
    refreshCollections()
  }, [refreshCollections])

  const favoritesCollection = useMemo(
    () => collections.find((collection) => collection.id === FAVORITES_COLLECTION_ID),
    [collections],
  )

  const customCollections = useMemo(
    () => collections.filter((collection) => collection.id !== FAVORITES_COLLECTION_ID),
    [collections],
  )

  const unloadCurrentAudio = useCallback(() => {
    const audioEl = audioRef.current
    if (!audioEl) return
    audioEl.pause()
    audioEl.currentTime = 0
    audioEl.removeAttribute('src')
  }, [])

  const attemptAutoPlay = useCallback(() => {
    const audioEl = audioRef.current
    if (!audioEl) return
    let attempts = 0
    const maxAttempts = 10

    const tryPlay = async () => {
      if (!audioRef.current) return
      if (attempts >= maxAttempts) return
      attempts += 1
      if (audioEl.readyState >= 2) {
        try {
          await audioEl.play()
        } catch (error) {
          console.error('Auto-play failed:', error)
        }
      } else {
        setTimeout(tryPlay, 120)
      }
    }

    setTimeout(tryPlay, 80)
  }, [])

  const replacePlaylistWithTracks = useCallback((nextTracks, options = {}) => {
    unloadCurrentAudio()
    playlistRef.current.forEach(revokeTrackUrl)
    setPlaylist(nextTracks)
    playlistRef.current = nextTracks
    if (nextTracks.length > 0) {
      setCurrentTrackIndex(0)
    } else {
      setCurrentTrackIndex(-1)
    }
    autoPlayPendingRef.current = Boolean(options.autoPlay && nextTracks.length)
  }, [unloadCurrentAudio])

  const createTrackFromFile = useCallback((file) => ({
    id: `${file.name}-${file.lastModified}-${Date.now()}`,
    name: file.name,
    url: URL.createObjectURL(file),
    size: file.size,
    lastModified: file.lastModified,
    type: file.type,
    blob: file,
  }), [])

  const updateFavoriteState = useCallback((trackId, favoriteId) => {
    setPlaylist((prev) => prev.map((item) => (item.id === trackId ? { ...item, favoriteId } : item)))
  }, [])

  const clearFavoriteByStoredId = useCallback((favoriteStorageId) => {
    if (!favoriteStorageId) return
    setPlaylist((prev) => prev.map((item) => (
      item.favoriteId === favoriteStorageId ? { ...item, favoriteId: undefined } : item
    )))
  }, [])

  const handlePlayTrackByIndex = useCallback((index) => {
    if (index < 0 || index >= playlist.length) return
    setCurrentTrackIndex(index)
  }, [playlist.length])

  const handlePlayTrackFromPlaylist = useCallback((index) => {
    if (index < 0 || index >= playlist.length) return
    setCurrentTrackIndex(index)
    attemptAutoPlay()
  }, [attemptAutoPlay, playlist.length])

  const handleSelectTrack = (file) => {
    if (!file) return
    const nextTrack = createTrackFromFile(file)
    const insertIndex = playlist.length
    setPlaylist((prev) => [...prev, nextTrack])
    setCurrentTrackIndex(insertIndex)
  }

  const handleAddTracks = useCallback((files) => {
    if (!files || files.length === 0) return
    const newTracks = Array.from(files).map((file) => createTrackFromFile(file))
    const startIndex = playlist.length
    setPlaylist((prev) => [...prev, ...newTracks])
    if (currentTrackIndex === -1 && newTracks.length > 0) {
      setCurrentTrackIndex(startIndex)
    }
  }, [createTrackFromFile, currentTrackIndex, playlist.length])

  const handleNextTrack = useCallback((options = {}) => {
    const shouldAutoPlay = options.autoPlay ?? isPlaying
    const nextIndex = currentTrackIndex + 1
    if (nextIndex < playlist.length) {
      handlePlayTrackByIndex(nextIndex)
      if (shouldAutoPlay) {
        attemptAutoPlay()
      }
    }
  }, [attemptAutoPlay, currentTrackIndex, playlist.length, handlePlayTrackByIndex, isPlaying])

  const handlePrevTrack = useCallback((options = {}) => {
    const shouldAutoPlay = options.autoPlay ?? isPlaying
    const prevIndex = currentTrackIndex - 1
    if (prevIndex >= 0) {
      handlePlayTrackByIndex(prevIndex)
      if (shouldAutoPlay) {
        attemptAutoPlay()
      }
    }
  }, [attemptAutoPlay, currentTrackIndex, handlePlayTrackByIndex, isPlaying])

  const handleRemoveTrack = useCallback((indexToRemove) => {
    setPlaylist((prev) => {
      const newPlaylist = prev.filter((_, index) => index !== indexToRemove)
      const removedTrack = prev[indexToRemove]
      if (removedTrack) revokeTrackUrl(removedTrack)

      if (indexToRemove === currentTrackIndex) {
        if (indexToRemove < newPlaylist.length) {
          setCurrentTrackIndex(indexToRemove)
        } else if (newPlaylist.length > 0) {
          setCurrentTrackIndex(newPlaylist.length - 1)
        } else {
          setCurrentTrackIndex(-1)
        }
      } else if (indexToRemove < currentTrackIndex) {
        setCurrentTrackIndex((prevIndex) => prevIndex - 1)
      }

      return newPlaylist
    })
  }, [currentTrackIndex])

  const handleReorderPlaylist = useCallback((startIndex, endIndex) => {
    setPlaylist((prev) => {
      const result = Array.from(prev)
      const [removed] = result.splice(startIndex, 1)
      result.splice(endIndex, 0, removed)

      if (startIndex === currentTrackIndex) {
        setCurrentTrackIndex(endIndex)
      } else if (startIndex < currentTrackIndex && endIndex >= currentTrackIndex) {
        setCurrentTrackIndex((prevIndex) => prevIndex - 1)
      } else if (startIndex > currentTrackIndex && endIndex <= currentTrackIndex) {
        setCurrentTrackIndex((prevIndex) => prevIndex + 1)
      }

      return result
    })
  }, [currentTrackIndex])

  useEffect(() => {
    const audioEl = audioRef.current
    if (!audioEl) return undefined

    const handleLoadedMetadata = () => setDuration(audioEl.duration || 0)
    const handleTimeUpdate = () => setCurrentTime(audioEl.currentTime || 0)
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
      handleNextTrack({ autoPlay: true })
    }
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    audioEl.addEventListener('loadedmetadata', handleLoadedMetadata)
    audioEl.addEventListener('timeupdate', handleTimeUpdate)
    audioEl.addEventListener('ended', handleEnded)
    audioEl.addEventListener('play', handlePlay)
    audioEl.addEventListener('pause', handlePause)

    return () => {
      audioEl.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audioEl.removeEventListener('timeupdate', handleTimeUpdate)
      audioEl.removeEventListener('ended', handleEnded)
      audioEl.removeEventListener('play', handlePlay)
      audioEl.removeEventListener('pause', handlePause)
    }
  }, [handleNextTrack])

  useEffect(() => {
    const audioEl = audioRef.current
    if (!audioEl) return

    if (track?.url) {
      if (track.url !== lastTrackUrlRef.current) {
        lastTrackUrlRef.current = track.url
        setCurrentTime(0)
        setDuration(0)
        audioEl.src = track.url
        audioEl.load()
      }
      if (autoPlayPendingRef.current) {
        attemptAutoPlay()
        autoPlayPendingRef.current = false
      }
    } else {
      if (lastTrackUrlRef.current) {
        lastTrackUrlRef.current = null
      }
      autoPlayPendingRef.current = false
      setCurrentTime(0)
      setDuration(0)
      audioEl.removeAttribute('src')
      setIsPlaying(false)
    }
  }, [attemptAutoPlay, track])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  useEffect(() => {
    playlistRef.current = playlist
  }, [playlist])

  useEffect(() => () => {
    playlistRef.current.forEach(revokeTrackUrl)
  }, [])

  const handlePlayToggle = useCallback(() => {
    const audioEl = audioRef.current
    if (!audioEl || !track) return

    if (audioEl.paused) {
      audioEl.play().catch(() => { })
    } else {
      audioEl.pause()
    }
  }, [track])

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target
      if (target && typeof target.closest === 'function') {
        const interactive = target.closest('input, textarea, select, button, [contenteditable="true"]')
        if (interactive) return
      }

      if (event.code === 'Space' || event.key === ' ') {
        if (!track) return
        event.preventDefault()
        handlePlayToggle()
        return
      }

      if (event.code === 'ArrowUp') {
        event.preventDefault()
        setVolume((v) => Math.min(v + 0.05, 1))
        return
      }

      if (event.code === 'ArrowDown') {
        event.preventDefault()
        setVolume((v) => Math.max(v - 0.05, 0))
        return
      }

      if (event.code === 'ArrowRight') {
        event.preventDefault()
        if (audioRef.current && audioRef.current.duration) {
          const step = audioRef.current.duration * 0.05
          const newTime = Math.min(audioRef.current.currentTime + step, audioRef.current.duration)
          audioRef.current.currentTime = newTime
          setCurrentTime(newTime)
        }
        return
      }

      if (event.code === 'ArrowLeft') {
        event.preventDefault()
        if (audioRef.current && audioRef.current.duration) {
          const step = audioRef.current.duration * 0.05
          const newTime = Math.max(audioRef.current.currentTime - step, 0)
          audioRef.current.currentTime = newTime
          setCurrentTime(newTime)
        }
        return
      }

      if (event.key === 'm' || event.key === 'M') {
        event.preventDefault()
        setVolume((currentVolume) => {
          if (currentVolume > 0) {
            previousVolumeRef.current = currentVolume
            return 0
          } else {
            return previousVolumeRef.current || 0.5
          }
        })
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlePlayToggle, track])

  const handleSeek = (value) => {
    if (!audioRef.current || !track) return
    audioRef.current.currentTime = value
    setCurrentTime(value)
  }

  const handleApplyMixPreset = (presetId) => {
    setMixPresetId(presetId)
    const preset = mixPresets.find((item) => item.id === presetId)
    if (preset && typeof preset.defaultIntensity === 'number') {
      setIntensity(preset.defaultIntensity)
    }
  }

  const formattedCurrentTime = useMemo(() => formatTime(currentTime), [currentTime])
  const formattedDuration = useMemo(() => formatTime(duration), [duration])
  const activeMixPreset = useMemo(
    () => mixPresets.find((preset) => preset.id === mixPresetId) || mixPresets[0],
    [mixPresetId],
  )

  const hasPrevTrack = currentTrackIndex > 0
  const hasNextTrack = currentTrackIndex < playlist.length - 1

  const handleCreateCollection = useCallback(async (name) => {
    if (!storageEnabled) return
    await createCollection(name)
    await refreshCollections()
  }, [refreshCollections, storageEnabled])

  const handleDeleteCollection = useCallback(async (collectionId) => {
    if (!storageEnabled) return
    await deleteCollection(collectionId)
    await refreshCollections()
  }, [refreshCollections, storageEnabled])

  const handleAddTracksToCollection = useCallback(async (collectionId, files) => {
    if (!storageEnabled || !files || files.length === 0) return
    const storedTracks = await serializeFiles(files)
    await appendTracksToCollection(collectionId, storedTracks)
    await refreshCollections()
  }, [refreshCollections, storageEnabled])

  const handleSavePlaylistToCollection = useCallback(async (collectionId) => {
    if (!storageEnabled || playlist.length === 0) return
    const storedTracks = await Promise.all(playlist.map((item) => serializeTrackForStorage(item)))
    await replaceCollectionTracks(collectionId, storedTracks)
    setCollections((prev) => prev.map((collection) => (
      collection.id === collectionId ? { ...collection, tracks: storedTracks } : collection
    )))
    const targetCollection = collections.find((item) => item.id === collectionId)
    await downloadCollectionArchive(targetCollection?.name || 'Playlist', storedTracks)
    await refreshCollections()
  }, [collections, playlist, refreshCollections, storageEnabled])

  const handleLoadCollection = useCallback((collectionId, options = {}) => {
    if (!storageEnabled) return
    const collection = collections.find((item) => item.id === collectionId)
    if (!collection) return
    const hydrated = collection.tracks.map((storedTrack) => hydrateStoredTrack(storedTrack, collectionId))
    replacePlaylistWithTracks(hydrated, options)
  }, [collections, replacePlaylistWithTracks, storageEnabled])

  const handleLoadFavoritesToPlaylist = useCallback(() => {
    if (!favoritesCollection) return
    const hydrated = favoritesCollection.tracks.map((trackItem) => hydrateStoredTrack(trackItem, FAVORITES_COLLECTION_ID))
    replacePlaylistWithTracks(hydrated, { autoPlay: true })
  }, [favoritesCollection, replacePlaylistWithTracks])

  const handlePlayFavoriteTrack = useCallback((storedTrack) => {
    const hydrated = hydrateStoredTrack(storedTrack, FAVORITES_COLLECTION_ID)
    replacePlaylistWithTracks([hydrated], { autoPlay: true })
  }, [replacePlaylistWithTracks])

  const handleRemoveFavoriteTrack = useCallback(async (storedTrackId) => {
    if (!storageEnabled) return
    await removeTrackFromCollection(FAVORITES_COLLECTION_ID, storedTrackId)
    clearFavoriteByStoredId(storedTrackId)
    await refreshCollections()
  }, [clearFavoriteByStoredId, refreshCollections, storageEnabled])

  const handleToggleFavorite = useCallback(async (targetTrack) => {
    if (!storageEnabled) return
    if (targetTrack.favoriteId) {
      await removeTrackFromCollection(FAVORITES_COLLECTION_ID, targetTrack.favoriteId)
      updateFavoriteState(targetTrack.id, undefined)
    } else {
      const storedTrack = await serializeTrackForStorage(targetTrack)
      await appendTracksToCollection(FAVORITES_COLLECTION_ID, [storedTrack])
      updateFavoriteState(targetTrack.id, storedTrack.id)
    }
    await refreshCollections()
  }, [refreshCollections, storageEnabled, updateFavoriteState])

  const mainViewportHeight = 'calc(100dvh - var(--app-shell-header-offset, 0px) - var(--app-shell-footer-height, 0px))'

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{
        width: 260,
        breakpoint: 'md',
        collapsed: { mobile: !navbarOpened, desktop: !navbarOpened },
      }}
      aside={{
        width: 280,
        breakpoint: 'md',
        collapsed: { mobile: !asideOpened, desktop: !asideOpened },
      }}
      footer={{ height: { base: 180, sm: 150, md: 120 } }}
      padding="lg"
      styles={{
        main: {
          paddingBottom: 'calc(var(--app-shell-padding, 0px) / 12)',
        },
        navbar: {
          borderRight: '1px solid var(--mantine-color-default-border)',
        },
        aside: {
          borderLeft: '1px solid var(--mantine-color-default-border)',
        },
      }}
    >
      {!navbarOpened && (
        <ActionIcon
          variant="filled"
          color="blue"
          size="lg"
          onClick={toggleNavbar}
          aria-label="Expand library"
          style={{
            position: 'fixed',
            left: '12px',
            top: '80px',
            zIndex: 500,
          }}
        >
          <IconChevronRight size={18} />
        </ActionIcon>
      )}
      {!asideOpened && (
        <ActionIcon
          variant="filled"
          color="blue"
          size="lg"
          onClick={toggleAside}
          aria-label="Expand session tools"
          style={{
            position: 'fixed',
            right: '12px',
            top: '80px',
            zIndex: 500,
          }}
        >
          <IconChevronLeft size={18} />
        </ActionIcon>
      )}
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm" align="center">
            <Burger
              opened={navbarOpened}
              onClick={toggleNavbar}
              hiddenFrom="md"
              size="sm"
              aria-label="Toggle navigation"
            />
            <Burger
              opened={asideOpened}
              onClick={toggleAside}
              hiddenFrom="md"
              size="sm"
              aria-label="Toggle session tools"
            />
            <IconWaveSine size={28} />
            <Box>
              <Text
                fw={700}
                fz="28px"
                variant="gradient"
                gradient={{ from: 'violet', to: 'cyan', deg: 120 }}
              >
                Sound of Jarul
              </Text>
            </Box>
          </Group>
          <Group>
            <Tooltip label="Go to Visualizer">
              <ActionIcon
                variant={activeSection === 'now-playing' ? 'filled' : 'light'}
                size="lg"
                color="violet"
                onClick={() => setActiveSection('now-playing')}
              >
                <IconWaveSine size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Maximize Visualizer">
              <ActionIcon
                variant="light"
                size="lg"
                onClick={() => visualizerRef.current?.toggleFullscreen()}
                disabled={activeSection !== 'now-playing'}
              >
                <IconArrowsMaximize size={18} />
              </ActionIcon>
            </Tooltip>
            <ActionIcon variant="light" size="lg" onClick={toggleColorScheme}>
              {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoonStars size={18} />}
            </ActionIcon>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AppShell.Section>
          <Group justify="space-between" align="center">
            <Title order={6} c="dimmed" tt="uppercase">Library</Title>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={toggleNavbar}
              aria-label={navbarOpened ? 'Collapse library' : 'Expand library'}
            >
              {navbarOpened ? <IconChevronLeft size={16} /> : <IconChevronRight size={16} />}
            </ActionIcon>
          </Group>
        </AppShell.Section>
        <AppShell.Section component={ScrollArea} grow mt="md">
          <Stack gap="xs">
            {librarySections.map((section) => (
              <NavLink
                key={section.value}
                label={section.label}
                active={activeSection === section.value}
                onClick={() => {
                  setActiveSection(section.value)
                  closeNavbar()
                }}
                leftSection={<section.icon size={18} />}
                variant="light"
              />
            ))}
          </Stack>
        </AppShell.Section>
        <AppShell.Section pt="md">
          <Divider label="Curated tones" labelPosition="center" />
          <Stack gap="xs" mt="md">
            {tonePresets.map((preset) => (
              <Badge key={preset} variant="outline" radius="sm">
                {preset}
              </Badge>
            ))}
          </Stack>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Aside p="md">
        <AppShell.Section>
          <Group justify="space-between" align="center">
            <Text fw={600}>Session tools</Text>
            <Group gap="xs">
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={toggleAside}
                aria-label={asideOpened ? 'Collapse session tools' : 'Expand session tools'}
              >
                {asideOpened ? <IconChevronRight size={16} /> : <IconChevronLeft size={16} />}
              </ActionIcon>
              <ActionIcon variant="light" aria-label="Settings">
                <IconSettings size={18} />
              </ActionIcon>
            </Group>
          </Group>
        </AppShell.Section>
        <AppShell.Section mt="md">
          <Group justify="space-between" align="center" mb="xs">
            <Text size="sm" fw={500}>
              Visual intensity
            </Text>
            <Text size="xs" c="dimmed">{intensity}%</Text>
          </Group>
          <Slider
            value={intensity}
            onChange={setIntensity}
            min={0}
            max={100}
            step={1}
            marks={[{ value: 25 }, { value: 50 }, { value: 75 }]}
          />
        </AppShell.Section>
        <AppShell.Section grow component={ScrollArea} mt="md">
          <Stack gap="md">
            {mixPresets.map((preset) => {
              const isActive = preset.id === mixPresetId
              const primaryColor = preset.colors[0]
              const secondaryColor = preset.colors[1]

              return (
                <Box
                  key={preset.id}
                  p="md"
                  radius="md"
                  role="button"
                  tabIndex={0}
                  aria-pressed={isActive}
                  onClick={() => handleApplyMixPreset(preset.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      handleApplyMixPreset(preset.id)
                    }
                  }}
                  style={{
                    border: `1px solid ${isActive ? primaryColor : 'var(--mantine-color-default-border)'}`,
                    background: isActive
                      ? `linear-gradient(135deg, ${primaryColor}15, ${secondaryColor}10)`
                      : 'var(--mantine-color-body)',
                    boxShadow: isActive ? `0 8px 30px ${primaryColor}25` : 'none',
                    cursor: 'pointer',
                    transition: 'all 200ms ease',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {isActive && (
                    <Box
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        bottom: 0,
                        width: 4,
                        background: `linear-gradient(to bottom, ${primaryColor}, ${secondaryColor})`,
                      }}
                    />
                  )}
                  <Group justify="space-between" align="flex-start" pl={isActive ? 'xs' : 0}>
                    <Box style={{ flex: 1 }}>
                      <Group gap="xs" mb={4}>
                        <preset.icon size={18} color={isActive ? primaryColor : 'var(--mantine-color-dimmed)'} />
                        <Text fw={600} c={isActive ? 'white' : 'dimmed'}>{preset.title}</Text>
                      </Group>
                      <Text size="xs" c="dimmed" lineClamp={2}>
                        {preset.description}
                      </Text>
                    </Box>
                    {isActive && (
                      <Badge
                        size="sm"
                        variant="gradient"
                        gradient={{ from: primaryColor, to: secondaryColor, deg: 135 }}
                      >
                        Active
                      </Badge>
                    )}
                  </Group>
                </Box>
              )
            })}
          </Stack>
        </AppShell.Section>
      </AppShell.Aside>

      <AppShell.Footer>
        <Stack h="100%" justify="center" gap="xs" px="lg" py="sm">
          <Group justify="space-between" align="center">
            <Group>
              <Button
                leftSection={<IconList size={18} />}
                variant={queueOpened ? 'filled' : 'subtle'}
                onClick={toggleQueue}
              >
                Queue ({playlist.length})
              </Button>
              <Divider orientation="vertical" />
              <Stack gap={0}>
                <Text fw={600}>{track ? track.name : 'Žádná skladba nehraje'}</Text>
                <Text size="xs" c="dimmed">
                  {track ? `${currentTrackIndex + 1} / ${playlist.length} • Připraveno k vizualizaci` : 'Nahrát skladbu pro vizualizaci'}
                </Text>
              </Stack>
            </Group>
            <Group gap="xs" align="center">
              <Text size="xs" c="dimmed">
                {formattedCurrentTime} / {formattedDuration}
              </Text>
              <Group>
                <ActionIcon
                  size={38}
                  radius="xl"
                  variant="subtle"
                  disabled={!hasPrevTrack}
                  onClick={handlePrevTrack}
                >
                  <IconPlayerTrackPrev size={18} />
                </ActionIcon>
                <ActionIcon
                  size={54}
                  radius="xl"
                  variant="filled"
                  onClick={handlePlayToggle}
                  disabled={!track}
                >
                  {isPlaying ? <IconPlayerPause size={26} /> : <IconPlayerPlay size={26} />}
                </ActionIcon>
                <ActionIcon
                  size={38}
                  radius="xl"
                  variant="subtle"
                  disabled={!hasNextTrack}
                  onClick={handleNextTrack}
                >
                  <IconPlayerTrackNext size={18} />
                </ActionIcon>
              </Group>
            </Group>
          </Group>
          <Slider
            value={duration ? Math.min(currentTime, duration) : 0}
            onChange={handleSeek}
            min={0}
            max={duration || 1}
            step={0.1}
            disabled={!track}
            label={(value) => formatTime(value)}
          />
          <Group gap="sm" align="center" w="100%" wrap="wrap">
            <Text size="xs" c="dimmed">Volume</Text>
            <Box style={{ flex: 1, minWidth: 180, maxWidth: 320 }}>
              <Slider
                value={volume}
                onChange={setVolume}
                min={0}
                max={1}
                step={0.01}
              />
            </Box>
            <Text size="xs" c="dimmed">{Math.round(volume * 100)}%</Text>
          </Group>
        </Stack>
      </AppShell.Footer>

      <AppShell.Main style={{ minHeight: mainViewportHeight, height: mainViewportHeight }}>
        <Box h="100%" style={{ position: 'relative' }}>
          {activeSection === 'now-playing' && (
            <AudioVisualizer
              ref={visualizerRef}
              audioRef={audioRef}
              track={track}
              intensity={intensity}
              isPlaying={isPlaying}
              onSelectTrack={handleSelectTrack}
              visualStyle={activeMixPreset}
            />
          )}

          {activeSection === 'playlists' && (
            <ScrollArea h="100%">
              <Box p="xl">
                <Playlist
                  playlist={playlist}
                  currentTrackIndex={currentTrackIndex}
                  onPlayTrack={handlePlayTrackFromPlaylist}
                  onRemoveTrack={handleRemoveTrack}
                  onReorderPlaylist={handleReorderPlaylist}
                  onAddTracks={handleAddTracks}
                  onToggleFavorite={handleToggleFavorite}
                />
                <CollectionsPanel
                  collections={customCollections}
                  onCreateCollection={handleCreateCollection}
                  onLoadCollection={handleLoadCollection}
                  onAddTracks={handleAddTracksToCollection}
                  onSavePlaylistToCollection={handleSavePlaylistToCollection}
                  onDeleteCollection={handleDeleteCollection}
                  storageEnabled={storageEnabled}
                  canPersistPlaylist={playlist.length > 0}
                />
              </Box>
            </ScrollArea>
          )}

          {activeSection === 'favourites' && (
            <FavoritesPanel
              favorites={favoritesCollection?.tracks || []}
              storageEnabled={storageEnabled}
              onLoadAll={handleLoadFavoritesToPlaylist}
              onPlayTrack={handlePlayFavoriteTrack}
              onRemoveTrack={handleRemoveFavoriteTrack}
            />
          )}

          {activeSection === 'live-sessions' && (
            <Box p="xl">
              <Title order={2}>Live Sessions</Title>
              <Text c="dimmed">Coming soon...</Text>
            </Box>
          )}

          {activeSection === 'discover' && (
            <Box p="xl">
              <Title order={2}>Discover</Title>
              <Text c="dimmed">Coming soon...</Text>
            </Box>
          )}
        </Box>
      </AppShell.Main>
      <Drawer
        opened={queueOpened}
        onClose={closeQueue}
        position="right"
        title="Queue"
        padding="md"
        size="md"
        overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
      >
        <Playlist
          playlist={playlist}
          currentTrackIndex={currentTrackIndex}
          onPlayTrack={handlePlayTrackFromPlaylist}
          onRemoveTrack={handleRemoveTrack}
          onReorderPlaylist={handleReorderPlaylist}
          onAddTracks={handleAddTracks}
          onToggleFavorite={handleToggleFavorite}
        />
      </Drawer>
      <audio ref={audioRef} hidden preload="auto" />
    </AppShell>
  )
}

export default App
