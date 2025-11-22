import { useCallback, useEffect, useMemo, useRef, forwardRef, useImperativeHandle } from 'react'
import {
  Badge,
  Box,
  Button,
  FileButton,
  Stack,
  Text,
} from '@mantine/core'
import { IconUpload } from '@tabler/icons-react'

const supportsAudioContext = typeof window !== 'undefined' &&
  (window.AudioContext || window.webkitAudioContext)

const fallbackAnimationColors = ['#7c3aed', '#ec4899', '#06b6d4', '#facc15']
const audioGraphCache = new WeakMap()

const hexToRgb = (hex) => {
  if (typeof hex !== 'string') return null
  let normalized = hex.replace('#', '')
  if (normalized.length === 3) {
    normalized = normalized.split('').map((char) => char + char).join('')
  }
  if (normalized.length !== 6) return null
  const value = Number.parseInt(normalized, 16)
  if (Number.isNaN(value)) return null
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  }
}

const mixColors = (colorA, colorB, t) => {
  const rgbA = hexToRgb(colorA)
  const rgbB = hexToRgb(colorB)
  if (!rgbA || !rgbB) return colorA || colorB || '#ffffff'
  const clampT = Math.min(Math.max(t, 0), 1)
  const r = Math.round(rgbA.r + (rgbB.r - rgbA.r) * clampT)
  const g = Math.round(rgbA.g + (rgbB.g - rgbA.g) * clampT)
  const b = Math.round(rgbA.b + (rgbB.b - rgbA.b) * clampT)
  return `rgb(${r}, ${g}, ${b})`
}

const getPaletteColor = (palette, t) => {
  if (!palette || palette.length === 0) return '#ffffff'
  if (palette.length === 1) return palette[0]
  const clampT = Math.min(Math.max(t, 0), 1)
  const scaled = clampT * (palette.length - 1)
  const index = Math.floor(scaled)
  const nextIndex = Math.min(index + 1, palette.length - 1)
  const localT = scaled - index
  return mixColors(palette[index], palette[nextIndex], localT)
}



function formatFileSize(bytes) {
  if (!bytes) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  return `${size.toFixed(size < 10 && unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`
}

const AudioVisualizer = forwardRef(({ audioRef, track, intensity, isPlaying, onSelectTrack, visualStyle }, ref) => {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const dataArrayRef = useRef(null)
  const sourceRef = useRef(null)

  const beatPulseRef = useRef(0)
  const beatCooldownRef = useRef(0)
  const barHeightsRef = useRef([])
  const particlesRef = useRef([])
  const isPlayingRef = useRef(false)

  useImperativeHandle(ref, () => ({
    toggleFullscreen: () => {
      if (!containerRef.current) return
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch((err) => {
          console.error(`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`)
        })
      } else {
        document.exitFullscreen()
      }
    }
  }))

  const resumeAudioContext = useCallback(() => {
    const audioContext = audioContextRef.current
    if (!audioContext) return false
    if (audioContext.state === 'running') {
      return true
    }
    audioContext.resume().catch(() => { })
    return audioContext.state === 'running'
  }, [])

  const trackBadge = useMemo(() => {
    if (!track) return null
    return `${track.name}${track.size ? ` • ${formatFileSize(track.size)}` : ''}`
  }, [track])

  const resolvedStyle = useMemo(() => {
    const baseStyle = {
      colors: fallbackAnimationColors,
      backgroundGradient: {
        top: '#050312',
        middle: '#080d1f',
        bottom: '#020109',

      },
      accentColor: '#e0f2fe',
      glowColor: '#fef9ff',
      floorColor: 'rgba(3, 4, 12, 0.94)',
      barCount: 64, // Increased for smoother look
      barSegments: 0, // 0 means continuous bar
      barSpacing: 2,
      mirror: true,
      shape: 'rounded', // rounded, sharp, cylindrical
      smoothingTimeConstant: 0.85,
      starDensity: 0,
    }
    if (!visualStyle) return baseStyle
    return {
      ...baseStyle,
      ...visualStyle,
      background: {
        ...baseStyle.background,
        ...(visualStyle.background || {}),
      },
      colors: visualStyle.colors && visualStyle.colors.length > 0 ? visualStyle.colors : baseStyle.colors,
    }
  }, [visualStyle])

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  useEffect(() => {
    if (!supportsAudioContext) {
      return
    }

    const audioEl = audioRef.current
    if (!audioEl) return

    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    let graph = audioGraphCache.get(audioEl)

    if (!graph) {
      const audioContext = new AudioContextClass()
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 4096 // Higher resolution
      analyser.smoothingTimeConstant = visualStyle?.smoothingTimeConstant || 0.85

      try {
        const source = audioContext.createMediaElementSource(audioEl)
        source.connect(analyser)
        analyser.connect(audioContext.destination)
        graph = { audioContext, analyser, source }
        audioGraphCache.set(audioEl, graph)
      } catch (error) {
        console.warn('Audio visualizer could not attach analyser source:', error)
        return
      }
    }

    audioContextRef.current = graph.audioContext
    analyserRef.current = graph.analyser
    sourceRef.current = graph.source

    if (analyserRef.current) {
      analyserRef.current.smoothingTimeConstant = resolvedStyle.smoothingTimeConstant || 0.85
    }

    if (!dataArrayRef.current || dataArrayRef.current.length !== analyserRef.current.frequencyBinCount) {
      dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount)
    }

    const resumeOnPlay = () => {
      resumeAudioContext()
    }

    audioEl.addEventListener('play', resumeOnPlay)
    return () => {
      audioEl.removeEventListener('play', resumeOnPlay)
    }
  }, [audioRef, resumeAudioContext])

  useEffect(() => {
    if (!supportsAudioContext) return undefined

    const handleUserGesture = () => {
      if (resumeAudioContext()) {
        window.removeEventListener('pointerdown', handleUserGesture)
        window.removeEventListener('touchstart', handleUserGesture)
        window.removeEventListener('keydown', handleUserGesture)
      }
    }

    window.addEventListener('pointerdown', handleUserGesture)
    window.addEventListener('touchstart', handleUserGesture)
    window.addEventListener('keydown', handleUserGesture)

    return () => {
      window.removeEventListener('pointerdown', handleUserGesture)
      window.removeEventListener('touchstart', handleUserGesture)
      window.removeEventListener('keydown', handleUserGesture)
    }
  }, [resumeAudioContext])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d', { alpha: false }) // Optimize for no transparency on canvas itself if possible
    if (!ctx) return

    const resize = () => {
      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr
        if (typeof ctx.resetTransform === 'function') {
          ctx.resetTransform()
        } else {
          ctx.setTransform(1, 0, 0, 1, 0, 0)
        }
        ctx.scale(dpr, dpr)
      }
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(container)

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')

    if (!canvas || !ctx) return

    const palette = resolvedStyle.colors
    const style = resolvedStyle

    const ensureBarArray = () => {
      const targetLength = style.barCount || 64
      if (barHeightsRef.current.length !== targetLength) {
        barHeightsRef.current = new Array(targetLength).fill(0)
      }
      return barHeightsRef.current
    }

    const sampleFrequencies = () => {
      const samples = []
      const targetSamples = style.barCount || 64
      const analyser = analyserRef.current
      const frequencyData = dataArrayRef.current
      const audioContext = audioContextRef.current

      if (isPlayingRef.current && audioContext?.state === 'suspended') {
        audioContext.resume().catch(() => { })
      }

      if (analyser && frequencyData) {
        analyser.getByteFrequencyData(frequencyData)

        // Logarithmic sampling for better bass resolution
        for (let i = 0; i < targetSamples; i++) {
          // Map linear index to logarithmic frequency scale
          // Start from index 1 to avoid DC offset

          // Calculate frequency for this bin
          // Using a power curve to distribute bins
          const index = Math.floor(Math.pow(i / targetSamples, 1.5) * (frequencyData.length * 0.4)); // Use lower 40% of spectrum mostly

          const safeIndex = Math.min(Math.max(0, index), frequencyData.length - 1);
          const value = frequencyData[safeIndex] / 255;
          samples.push(value);
        }
        return samples;
      }

      // Idle animation
      const time = performance.now() * 0.001
      for (let i = 0; i < targetSamples; i += 1) {
        const t = i / targetSamples
        const val = Math.max(0, Math.sin(time * 2 + t * Math.PI * 2) * 0.3 + Math.cos(time * 1.5 - t * Math.PI) * 0.2)
        samples.push(val * 0.5)
      }
      return samples
    }

    const updateParticles = (width, height, beatPulse) => {
      const density = style.particleDensity || 50
      if (particlesRef.current.length < density && beatPulse > 0.1) {
        particlesRef.current.push({
          x: Math.random() * width,
          y: height,
          vx: (Math.random() - 0.5) * 2,
          vy: -Math.random() * 5 - 2,
          life: 1.0,
          color: style.particleColor || getPaletteColor(palette, Math.random())
        })
      }

      particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        p.vy += 0.05; // Gravity
      })

      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
    }

    const renderParticles = () => {
      particlesRef.current.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
      })
      ctx.globalAlpha = 1.0;
    }

    const render = () => {
      const dpr = window.devicePixelRatio || 1
      const width = canvas.width / dpr
      const height = canvas.height / dpr
      const centerX = width / 2
      const centerY = height / 2

      const intensityFactor = Math.max(0.08, intensity / 100)

      const freqSamples = sampleFrequencies()
      const bars = ensureBarArray()

      // Calculate energy for beat detection
      const averageEnergy = freqSamples.reduce((a, b) => a + b, 0) / freqSamples.length

      if (averageEnergy > 0.4 && beatCooldownRef.current <= 0) {
        beatPulseRef.current = 1.0
        beatCooldownRef.current = 20
      } else {
        beatCooldownRef.current--
        beatPulseRef.current *= 0.9
      }

      const beatPulse = beatPulseRef.current

      // Smooth bars
      for (let i = 0; i < bars.length; i++) {
        const target = freqSamples[i] * (1 + beatPulse * 0.2)
        bars[i] += (target - bars[i]) * 0.2
      }

      // Clear background
      const bgGradient = ctx.createLinearGradient(0, 0, 0, height)
      bgGradient.addColorStop(0, style.backgroundGradient.top)
      bgGradient.addColorStop(0.5, style.backgroundGradient.middle)
      bgGradient.addColorStop(1, style.backgroundGradient.bottom)
      ctx.fillStyle = bgGradient
      ctx.fillRect(0, 0, width, height)

      // Draw Particles
      updateParticles(width, height, beatPulse)
      renderParticles()

      // Draw Visualizer (Mirrored)
      const barWidth = (width / bars.length) * 0.8
      const maxBarHeight = height * 0.4

      ctx.shadowBlur = 15 + beatPulse * 10

      bars.forEach((bar, i) => {
        const color = getPaletteColor(palette, i / bars.length)
        ctx.fillStyle = color
        ctx.shadowColor = color

        const h = bar * maxBarHeight * (0.5 + intensityFactor)
        const spacing = style.barSpacing ?? 2
        const totalBarWidth = barWidth + spacing

        // Draw bars
        const drawBar = (x, y, width, height) => {
          if (style.barSegments > 0) {
            const segmentHeight = height / style.barSegments
            const gap = 1
            for (let s = 0; s < style.barSegments; s++) {
              const sy = y + s * segmentHeight
              const sh = segmentHeight - gap
              if (sh > 0) {
                ctx.fillRect(x, sy, width, sh)
              }
            }
          } else {
            if (style.shape === 'sharp') {
              ctx.fillRect(x, y, width, height)
            } else if (style.shape === 'cylindrical') {
              const gradient = ctx.createLinearGradient(x, y, x + width, y)
              gradient.addColorStop(0, color)
              gradient.addColorStop(0.5, '#ffffff')
              gradient.addColorStop(1, color)
              ctx.fillStyle = gradient
              ctx.fillRect(x, y, width, height)
              ctx.fillStyle = color // Reset
            } else {
              // Rounded default
              ctx.beginPath()
              if (ctx.roundRect) {
                ctx.roundRect(x, y, width, height, 4)
              } else {
                ctx.rect(x, y, width, height)
              }
              ctx.fill()
            }
          }
        }

        if (style.mirror) {
          // Left side
          const x1 = centerX - (i * totalBarWidth) - barWidth
          const y1 = centerY - h / 2
          drawBar(x1, y1, barWidth, h)

          // Right side
          const x2 = centerX + (i * totalBarWidth)
          const y2 = centerY - h / 2
          drawBar(x2, y2, barWidth, h)

          // Reflection
          if (style.reflectionStrength > 0) {
            ctx.globalAlpha = 0.2 * style.reflectionStrength
            if (style.shape === 'sharp') {
              ctx.fillRect(x1, y1 + h + 4, barWidth, h * 0.5)
              ctx.fillRect(x2, y2 + h + 4, barWidth, h * 0.5)
            } else {
              ctx.beginPath()
              if (ctx.roundRect) {
                ctx.roundRect(x1, y1 + h + 4, barWidth, h * 0.5, 4)
                ctx.roundRect(x2, y2 + h + 4, barWidth, h * 0.5, 4)
              } else {
                ctx.rect(x1, y1 + h + 4, barWidth, h * 0.5)
                ctx.rect(x2, y2 + h + 4, barWidth, h * 0.5)
              }
              ctx.fill()
            }
            ctx.globalAlpha = 1.0
          }
        } else {
          // No mirror - draw from left to right or centered single
          // Let's do centered single row for non-mirrored for now, or full width
          // Actually, for "Lunar Echoes" maybe just centered bars without mirroring looks good?
          // Or just one sequence from left to right.
          // Let's stick to centered but single sequence if not mirrored?
          // Or maybe spread them out?
          // For now, let's implement centered single sequence
          const totalWidth = bars.length * totalBarWidth
          const startX = centerX - totalWidth / 2
          const x = startX + i * totalBarWidth
          const y = centerY - h / 2
          drawBar(x, y, barWidth, h)

          // Reflection
          if (style.reflectionStrength > 0) {
            ctx.globalAlpha = 0.2 * style.reflectionStrength
            if (style.shape === 'sharp') {
              ctx.fillRect(x, y + h + 4, barWidth, h * 0.5)
            } else {
              ctx.beginPath()
              ctx.roundRect(x, y + h + 4, barWidth, h * 0.5, 4)
              ctx.fill()
            }
            ctx.globalAlpha = 1.0
          }
        }
      })

      ctx.shadowBlur = 0

      animationRef.current = requestAnimationFrame(render)
    }

    animationRef.current = requestAnimationFrame(render)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [intensity, resolvedStyle])

  return (
    <Box
      component="section"
      h="100%"
      mih={420}
      radius="lg"
      p="md"
      style={{ display: 'flex', flexDirection: 'column', gap: 'md' }}
    >
      <Box
        ref={containerRef}
        pos="relative"
        style={{
          border: '1px solid var(--mantine-color-default-border)',
          overflow: 'hidden',
          background: 'rgba(6, 11, 25, 0.92)',
          flex: 1,
          borderRadius: 'var(--mantine-radius-lg)',
          boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)'
        }}
      >
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      </Box>

      <Stack align="center" justify="center" gap="xs" px="md">
        <Badge size="lg" variant="light" color="blue">
          {isPlaying ? 'Visualising in real time' : track ? 'Ready to play' : 'Awaiting audio'}
        </Badge>
        <Text size="xl" fw={700} ta="center">
          {track ? track.name : 'Přidej skladbu a sleduj hudbu v barvách'}
        </Text>
        {track && track.size ? (
          <Text size="xs" c="dimmed">
            {trackBadge}
          </Text>
        ) : null}
        <FileButton onChange={onSelectTrack} accept="audio/*,.mpeg">
          {(props) => (
            <Button
              {...props}
              size={track ? 'sm' : 'md'}
              variant={track ? 'light' : 'gradient'}
              gradient={track ? undefined : { from: 'cyan', to: 'orange' }}
              leftSection={<IconUpload size={16} />}
            >
              {track ? 'Změnit skladbu' : 'Nahrát hudbu'}
            </Button>
          )}
        </FileButton>
        {track ? (
          <Text size="sm" c="dimmed" ta="center">
            {isPlaying ? 'Hudba maluje vlny a světla' : 'Klikni na Play pro spuštění vizualizace'}
          </Text>
        ) : (
          <Text size="sm" c="dimmed" ta="center">
            Podporujeme všechny běžné formáty, stačí jediný klik.
          </Text>
        )}
      </Stack>
    </Box>
  )
})

export default AudioVisualizer
