import { useState } from 'react'
import {
  ActionIcon,
  Box,
  Button,
  FileButton,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import {
  IconDeviceFloppy,
  IconFolder,
  IconFolderPlus,
  IconPlayerPlay,
  IconTrash,
  IconUpload,
} from '@tabler/icons-react'

function CollectionsPanel({
  collections,
  onCreateCollection,
  onLoadCollection,
  onAddTracks,
  onSavePlaylistToCollection,
  onDeleteCollection,
  storageEnabled,
  canPersistPlaylist,
}) {
  const [folderName, setFolderName] = useState('')

  const handleCreate = () => {
    if (!folderName.trim()) return
    onCreateCollection(folderName.trim())
    setFolderName('')
  }

  return (
    <Box mt="xl">
      <Group justify="space-between" mb="sm">
        <Title order={3}>Uložené složky</Title>
        <Group gap="xs">
          <TextInput
            placeholder="Název složky"
            value={folderName}
            onChange={(event) => setFolderName(event.currentTarget.value)}
            w={240}
            disabled={!storageEnabled}
          />
          <Button
            leftSection={<IconFolderPlus size={16} />}
            onClick={handleCreate}
            disabled={!storageEnabled || !folderName.trim()}
          >
            Vytvořit
          </Button>
        </Group>
      </Group>

      {!storageEnabled ? (
        <Text size="sm" c="dimmed">
          Úložiště není v tomto prohlížeči dostupné. Zapni IndexedDB pro ukládání složek.
        </Text>
      ) : collections.length === 0 ? (
        <Box ta="center" c="dimmed" py="xl">
          <Text>Složky zatím nemáš. Vytvoř novou a přidej do ní skladby.</Text>
        </Box>
      ) : (
        <Stack gap="sm">
          {collections.map((collection) => (
            <Box
              key={collection.id}
              p="md"
              style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 12 }}
            >
              <Group justify="space-between" align="flex-start">
                <Group gap="sm">
                  <IconFolder size={22} />
                  <Box>
                    <Text fw={600}>{collection.name}</Text>
                    <Text size="xs" c="dimmed">
                      {collection.tracks?.length || 0} skladeb
                    </Text>
                  </Box>
                </Group>
                <Group gap="xs" wrap="nowrap">
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<IconPlayerPlay size={14} />}
                    onClick={() => onLoadCollection(collection.id, { autoPlay: true })}
                  >
                    Načíst
                  </Button>
                  <FileButton onChange={(files) => onAddTracks(collection.id, files)} accept="audio/*,.mpeg" multiple>
                    {(props) => (
                      <Button
                        {...props}
                        size="xs"
                        variant="subtle"
                        leftSection={<IconUpload size={14} />}
                      >
                        Přidat hudbu
                      </Button>
                    )}
                  </FileButton>
                  <Button
                    size="xs"
                    variant="outline"
                    leftSection={<IconDeviceFloppy size={14} />}
                    disabled={!canPersistPlaylist}
                    onClick={() => onSavePlaylistToCollection(collection.id)}
                  >
                    Uložit playlist
                  </Button>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={() => onDeleteCollection(collection.id)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Group>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  )
}

export default CollectionsPanel
