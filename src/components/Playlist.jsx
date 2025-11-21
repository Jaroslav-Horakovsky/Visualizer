import { ActionIcon, Box, Button, FileButton, Group, ScrollArea, Stack, Text, Title } from '@mantine/core'
import { IconHeart, IconMusic, IconPlayerPlay, IconPlayerPause, IconTrash, IconUpload } from '@tabler/icons-react'

function Playlist({
  playlist,
  currentTrackIndex,
  onPlayTrack,
  onRemoveTrack,
  onAddTracks,
  onToggleFavorite,
}) {
  const formatFileSize = (bytes) => {
    if (!bytes) return ''
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex += 1
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  return (
    <Box h="100%" p="md">
      <Group justify="space-between" mb="md">
        <Title order={2}>Playlist</Title>
        <FileButton onChange={onAddTracks} accept="audio/*,.mpeg" multiple>
          {(props) => (
            <Button {...props} leftSection={<IconUpload size={18} />}>
              Add Files
            </Button>
          )}
        </FileButton>
      </Group>

      {playlist.length === 0 ? (
        <Stack align="center" justify="center" h="60%" gap="md">
          <IconMusic size={64} opacity={0.3} />
          <Text c="dimmed">Playlist je prázdný</Text>
          <Text size="sm" c="dimmed">Klikni na "Add Files" pro přidání skladeb</Text>
        </Stack>
      ) : (
        <ScrollArea h="calc(100% - 80px)">
          <Stack gap="xs">
            {playlist.map((track, index) => (
              <Box
                key={track.id}
                p="sm"
                style={{
                  border: '1px solid var(--mantine-color-default-border)',
                  borderRadius: 'var(--mantine-radius-md)',
                  backgroundColor: index === currentTrackIndex
                    ? 'var(--mantine-color-blue-light)'
                    : 'transparent',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  console.log('Track clicked in Playlist.jsx, index:', index)
                  onPlayTrack(index)
                }}
              >
                <Group justify="space-between">
                  <Group gap="sm" style={{ flex: 1 }}>
                    {index === currentTrackIndex ? (
                      <IconPlayerPlay size={20} />
                    ) : (
                      <IconMusic size={20} opacity={0.5} />
                    )}
                    <Box style={{ flex: 1 }}>
                      <Text fw={index === currentTrackIndex ? 600 : 400}>
                        {track.name}
                      </Text>
                      {track.size && (
                        <Text size="xs" c="dimmed">
                          {formatFileSize(track.size)}
                        </Text>
                      )}
                    </Box>
                  </Group>
                  <ActionIcon
                    variant={track.favoriteId ? 'filled' : 'subtle'}
                    color="pink"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleFavorite?.(track)
                    }}
                  >
                    <IconHeart size={18} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemoveTrack(index)
                    }}
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                </Group>
              </Box>
            ))}
          </Stack>
        </ScrollArea>
      )}
    </Box>
  )
}

export default Playlist
