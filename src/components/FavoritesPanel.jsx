import {
  ActionIcon,
  Box,
  Button,
  Group,
  ScrollArea,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import {
  IconHeart,
  IconPlayerPlay,
  IconTrash,
} from '@tabler/icons-react'

function FavoritesPanel({
  favorites,
  storageEnabled,
  onPlayTrack,
  onLoadAll,
  onRemoveTrack,
}) {
  if (!storageEnabled) {
    return (
      <Box p="xl">
        <Title order={2}>Favourites</Title>
        <Text c="dimmed">Trvalé úložiště není dostupné, nelze ukládat oblíbené skladby.</Text>
      </Box>
    )
  }

  return (
    <Box p="xl" h="100%">
      <Group justify="space-between" mb="lg">
        <Group gap="sm">
          <IconHeart size={26} />
          <div>
            <Title order={2}>Oblíbené skladby</Title>
            <Text size="sm" c="dimmed">
              {favorites.length} uložených stop
            </Text>
          </div>
        </Group>
        <Button disabled={favorites.length === 0} onClick={onLoadAll}>Načíst všechny</Button>
      </Group>

      {favorites.length === 0 ? (
        <Stack align="center" justify="center" gap="sm" mih={240}>
          <IconHeart size={62} opacity={0.25} />
          <Text c="dimmed">Zatím sis nic neuložil. Přidej hvězdičku u skladby v playlistu.</Text>
        </Stack>
      ) : (
        <ScrollArea h="calc(100% - 80px)">
          <Stack gap="sm">
            {favorites.map((track) => (
              <Box
                key={track.id}
                p="md"
                style={{
                  border: '1px solid var(--mantine-color-default-border)',
                  borderRadius: 12,
                  cursor: 'pointer',
                }}
                onClick={() => onPlayTrack(track)}
              >
                <Group justify="space-between">
                  <div>
                    <Text fw={600}>{track.name}</Text>
                    <Text size="xs" c="dimmed">
                      {track.size ? `${(track.size / (1024 * 1024)).toFixed(2)} MB` : 'Velikost neznámá'}
                    </Text>
                  </div>
                  <Group gap="xs">
                    <ActionIcon
                      variant="light"
                      color="blue"
                      onClick={(event) => {
                        event.stopPropagation()
                        onPlayTrack(track)
                      }}
                    >
                      <IconPlayerPlay size={18} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={(event) => {
                        event.stopPropagation()
                        onRemoveTrack(track.id)
                      }}
                    >
                      <IconTrash size={18} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Box>
            ))}
          </Stack>
        </ScrollArea>
      )}
    </Box>
  )
}

export default FavoritesPanel
