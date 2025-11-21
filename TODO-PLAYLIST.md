# Visualizer - TODO Playlist Funkčnost

**Datum poslední aktualizace:** 2025-10-16
**Status:** 🟡 Částečně hotovo - potřebuje dokončení

---

## ✅ CO JE HOTOVÉ (Relace 2025-10-16)

### 1. Playlist State Management (src/App.jsx:68-211)
- ✅ `playlist` - pole skladeb s ID, názvem, URL, velikostí
- ✅ `currentTrackIndex` - index aktuální skladby
- ✅ `handlePlayTrackByIndex(index)` - přehrát skladbu podle indexu
- ✅ `handleSelectTrack(file)` - přidat jednu skladbu a přehrát ji
- ✅ `handleAddTracks(files)` - přidat více skladeb najednou (připraveno)
- ✅ `handleNextTrack()` - přehrát další skladbu
- ✅ `handlePrevTrack()` - přehrát předchozí skladbu
- ✅ `handleRemoveTrack(index)` - odstranit skladbu z playlistu
- ✅ `handleReorderPlaylist(startIndex, endIndex)` - změnit pořadí (pro drag & drop)

### 2. Previous/Next Track Tlačítka (src/App.jsx:423-449)
- ✅ Tlačítka jsou aktivní/neaktivní podle pozice v playlistu
- ✅ `hasPrevTrack` a `hasNextTrack` computed values
- ✅ Automatické přehrání při přepnutí skladby

### 3. Auto-play Další Skladby (src/App.jsx:219-224)
- ✅ Když skladba skončí (`handleEnded`), automaticky zavolá `handleNextTrack()`
- ✅ Pokud existuje další skladba, přehraje se automaticky

### 4. Footer UI Vylepšení (src/App.jsx:407-414)
- ✅ "Queue (X)" - zobrazuje počet skladeb v playlistu
- ✅ "X / Y • Připraveno k vizualizaci" - pozice aktuální skladby

---

## ❌ CO NEFUNGUJE / CHYBÍ

### 🔴 KRITICKÉ - Audio player se po refaktoru nepřehrává (2025-10-17)

**Lokace:** `src/App.jsx:82-350`, `src/components/FavoritesPanel.jsx:1-104`

**Symptomy (reprodukováno v aktuální relaci):**
1. Spusť `npm run dev`, načti aplikaci.
2. Přidej libovolnou skladbu přes tlačítko „Nahrát hudbu“ nebo načti uloženou složku z Playlists/Favourites.
3. Klikni na skladbu v playlistu nebo stiskni ikonku Play ve Favourites.
4. Ve spodním ovladači se tlačítko změní na Pause, ale:
   - časovač se nehýbe,
   - nekreslí se waveform podle audia,
   - z reproduktorů nic nezní.

**Pravděpodobná příčina:**
- Po přidání perzistentních kolekcí jsme odstranili `setTrack` state a derive-ujeme „track“ jen z `playlist[currentTrackIndex]`.
- Audio `<audio>` element se spoléhá na `useEffect([track])`, který už nemusí dostat nový referenční objekt (např. při načtení ze složky nebo po restartu) → `audioEl.src` se nenastaví a `readyState` zůstane 0.
- Výsledek: `audioRef.current.play()` se sice spustí (UI přepne na Pause), ale nic se nenačte ani nehraje.

**Co je potřeba:**
- Vrátit explicitní `track` stav nebo zavést spolehlivý derivát (např. sledovat `playlist[currentTrackIndex]?.url` v efektu a vždy přenastavit `audio.src`).
- Doplnit diagnostické logy (konzole) a ověřit readyState, zda `audioEl.load()` dostává správné URL.
- Zajistit, aby toggle favoritů nevyvolal reload audio (původní bug).

### 🔴 KRITICKÉ - Hlavní problém identifikovaný browsermcp testem:

#### **Problém: Playlists sekce nemá UI**
**Lokace:** `src/App.jsx:465-476`

```jsx
<AppShell.Main>
  <Box h="100%" style={{ position: 'relative' }}>
    <AudioVisualizer
      audioRef={audioRef}
      track={track}
      intensity={intensity}
      isPlaying={isPlaying}
      onSelectTrack={handleSelectTrack}
    />
  </Box>
</AppShell.Main>
```

**Problém:**
- Kód VŽDY renderuje pouze `<AudioVisualizer />`
- Když uživatel klikne na "Playlists" v navigaci:
  - ✅ Badge v headeru se změní na "PLAYLISTS"
  - ✅ Tlačítko "Playlists" se označí jako aktivní
  - ❌ Ale obsah zůstává stejný (AudioVisualizer)
  - ❌ Chybí conditional rendering podle `activeSection`

**Co se stalo při testu:**
1. Aplikace se načetla správně
2. Kliknul jsem na "Playlists" v levém menu
3. Badge se změnil z "NOW PLAYING" na "PLAYLISTS"
4. Ale hlavní obsah zůstal stejný - stále jen AudioVisualizer s "Přidej skladbu"
5. Console logy byly čisté (žádné chyby)

---

## 🎯 CO JE POTŘEBA UDĚLAT

### 1. 🔴 PRIORITA 1: Vytvořit Playlist komponentu

**Soubor:** `src/components/Playlist.jsx`

**Props:**
```jsx
{
  playlist: Array,           // pole skladeb
  currentTrackIndex: number, // index aktuální skladby
  onPlayTrack: (index) => void,
  onRemoveTrack: (index) => void,
  onReorderPlaylist: (startIndex, endIndex) => void,
  onAddTracks: (files) => void
}
```

**UI Features:**
- ✅ Seznam všech skladeb v playlistu
- ✅ Zvýraznění aktuálně hrající skladby
- ✅ Kliknutí na skladbu ji přehraje
- ✅ Tlačítko X pro odstranění skladby
- ✅ Tlačítko "Add Files" s multiple file selection
- ✅ FileButton s `multiple={true}` pro výběr více souborů
- ✅ Zobrazení: název, velikost, duration (pokud dostupné)
- ⏳ Drag & drop UI pro změnu pořadí (později)

**Návrh UI komponenty:**
```jsx
import { ActionIcon, Box, FileButton, Group, ScrollArea, Stack, Text, Title } from '@mantine/core'
import { IconMusic, IconPlayerPlay, IconPlayerPause, IconTrash, IconUpload } from '@tabler/icons-react'

function Playlist({ playlist, currentTrackIndex, onPlayTrack, onRemoveTrack, onAddTracks }) {
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
        <FileButton onChange={onAddTracks} accept="audio/*" multiple>
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
                onClick={() => onPlayTrack(index)}
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
```

---

### 2. 🔴 PRIORITA 2: Implementovat Conditional Rendering v App.jsx

**Lokace:** `src/App.jsx:465-476` (nahradit současný kód)

**Nový kód:**
```jsx
<AppShell.Main>
  <Box h="100%" style={{ position: 'relative' }}>
    {activeSection === 'now-playing' && (
      <AudioVisualizer
        audioRef={audioRef}
        track={track}
        intensity={intensity}
        isPlaying={isPlaying}
        onSelectTrack={handleSelectTrack}
      />
    )}

    {activeSection === 'playlists' && (
      <Playlist
        playlist={playlist}
        currentTrackIndex={currentTrackIndex}
        onPlayTrack={handlePlayTrackByIndex}
        onRemoveTrack={handleRemoveTrack}
        onReorderPlaylist={handleReorderPlaylist}
        onAddTracks={handleAddTracks}
      />
    )}

    {activeSection === 'favourites' && (
      <Box p="xl">
        <Title order={2}>Favourites</Title>
        <Text c="dimmed">Coming soon...</Text>
      </Box>
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
```

**Přidat import:**
```jsx
import Playlist from './components/Playlist.jsx'
```

---

### 3. 🟡 PRIORITA 3: Implementovat Queue Modal/Drawer

**Soubor:** Použít Mantine `<Drawer />` nebo `<Modal />`

**Lokace:** `src/App.jsx:407` - tlačítko "Queue (X)"

**Změnit:**
```jsx
<Button
  leftSection={<IconList size={18} />}
  variant="subtle"
  onClick={() => setQueueDrawerOpen(true)}  // Přidat state a handler
>
  Queue ({playlist.length})
</Button>
```

**Přidat state:**
```jsx
const [queueDrawerOpen, setQueueDrawerOpen] = useState(false)
```

**Přidat Drawer komponenty:**
```jsx
<Drawer
  opened={queueDrawerOpen}
  onClose={() => setQueueDrawerOpen(false)}
  title="Queue"
  position="right"
  size="md"
>
  {/* Použít stejný obsah jako Playlist komponenta */}
  <Playlist
    playlist={playlist}
    currentTrackIndex={currentTrackIndex}
    onPlayTrack={handlePlayTrackByIndex}
    onRemoveTrack={handleRemoveTrack}
    onReorderPlaylist={handleReorderPlaylist}
    onAddTracks={handleAddTracks}
  />
</Drawer>
```

---

### 4. 🟢 PRIORITA 4: Blob URL Chyby

**Chyby v console:**
```
Failed to load resource: net::ERR_FILE_NOT_FOUND
blob:http://localhost:5173/ac68037a-622a-41b9-bd78-07e7ada1c489:1
```

**Analýza:**
- Tyto chyby se objevují, když se pokusíme načíst blob URL, které už bylo revokováno
- Pravděpodobně se děje při přepínání skladeb nebo při odstranění skladby

**Možné příčiny:**
1. Příliš brzké volání `URL.revokeObjectURL()`
2. Pokus o přístup k blob URL po jeho revokaci
3. React re-render způsobí pokus o načtení již revokovaného URL

**Řešení:**
```jsx
// V handleSelectTrack a handlePlayTrackByIndex
// NEvolat hned URL.revokeObjectURL pro previous track
// Nechat čištění na useEffect cleanup

// Přidat ref pro tracking aktivních blob URLs
const activeBlobUrls = useRef(new Set())

// Při vytváření nového tracku
const url = URL.createObjectURL(file)
activeBlobUrls.current.add(url)

// Cleanup při unmount kompo nenty
useEffect(() => {
  return () => {
    activeBlobUrls.current.forEach(url => {
      try {
        URL.revokeObjectURL(url)
      } catch (e) {
        // Ignore errors
      }
    })
    activeBlobUrls.current.clear()
  }
}, [])
```

**Alternativně:**
- Zkontrolovat, jestli audio element už načetl soubor před revokací
- Použít `audioEl.addEventListener('canplaythrough', ...)` před revokací

---

### 5. 🟢 PRIORITA 5: Drag & Drop UI pro změnu pořadí

**Knihovna:** `@dnd-kit/core` a `@dnd-kit/sortable`

**Instalace:**
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Implementace v Playlist.jsx:**
```jsx
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Sortable Item komponenta
function SortableTrackItem({ track, index, isPlaying, onPlay, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: track.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <Box ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {/* Track UI */}
    </Box>
  )
}

// V Playlist komponentě
function Playlist({ playlist, onReorderPlaylist, ... }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (active.id !== over.id) {
      const oldIndex = playlist.findIndex(t => t.id === active.id)
      const newIndex = playlist.findIndex(t => t.id === over.id)
      onReorderPlaylist(oldIndex, newIndex)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={playlist.map(t => t.id)}
        strategy={verticalListSortingStrategy}
      >
        {playlist.map((track, index) => (
          <SortableTrackItem
            key={track.id}
            track={track}
            index={index}
            isPlaying={index === currentTrackIndex}
            onPlay={() => onPlayTrack(index)}
            onRemove={() => onRemoveTrack(index)}
          />
        ))}
      </SortableContext>
    </DndContext>
  )
}
```

---

## 📝 TESTING CHECKLIST

Po implementaci otestovat:

### Playlists sekce:
- [ ] Kliknutím na "Playlists" v navigaci se zobrazí Playlist komponenta
- [ ] Prázdný playlist zobrazuje správný empty state
- [ ] Tlačítko "Add Files" otevře file picker s multiple selection
- [ ] Vybrané soubory se přidají do playlistu
- [ ] Každá skladba v seznamu se zobrazuje správně (název, velikost)
- [ ] Aktuálně hrající skladba je zvýrazněná
- [ ] Kliknutí na skladbu ji přehraje
- [ ] Tlačítko X odstraní skladbu z playlistu
- [ ] Při odstranění aktuální skladby se přehraje další/předchozí

### Queue drawer:
- [ ] Kliknutím na "Queue (X)" se otevře drawer zprava
- [ ] Drawer zobrazuje stejný obsah jako Playlists sekce
- [ ] Zavření draweru nechá playlist nedotčený
- [ ] Změny v draweru se projeví v playlistu

### Now Playing sekce:
- [ ] Kliknutím na "Now Playing" se zobrazí AudioVisualizer
- [ ] FileButton v AudioVisualizeru stále funguje
- [ ] Přidání skladby přes AudioVisualizer ji přidá do playlistu

### Blob URL:
- [ ] Console neobsahuje "ERR_FILE_NOT_FOUND" chyby
- [ ] Přepínání mezi skladbami nevolá blob URL errors
- [ ] Odstranění skladby nevolá blob URL errors

### Drag & Drop (pokud implementováno):
- [ ] Uchopení skladby zobrazí drag indicator
- [ ] Přetažení skladby změní její pozici
- [ ] Current track index se správně přepočítá po přetažení
- [ ] Přehrávající se skladba zůstane správná po přetažení

---

## 🐛 ZNÁMÉ PROBLÉMY

### 1. Blob URL chyby při rychlém přepínání skladeb
- **Status:** Neopraveno
- **Popis:** Při rychlém klikání Previous/Next se objevují ERR_FILE_NOT_FOUND chyby
- **Řešení:** Implementovat řešení z PRIORITA 4

### 2. Multiple file selection není implementováno
- **Status:** State management připraven, chybí UI
- **Řešení:** Přidat FileButton s `multiple={true}` v Playlist komponentě

### 3. Drag & drop není implementováno
- **Status:** Handler `handleReorderPlaylist` je připraven, chybí UI
- **Řešení:** Implementovat @dnd-kit v Playlist komponentě

---

## 💡 DOPORUČENÍ PRO DALŠÍ RELACI

### Pořadí implementace:
1. **START HERE:** Vytvořit `src/components/Playlist.jsx` podle návrhu výše
2. Přidat conditional rendering v App.jsx
3. Otestovat Playlists sekci v prohlížeči
4. Pokud funguje, implementovat Queue drawer
5. Opravit blob URL chyby
6. Nakonec přidat drag & drop (není kritické)

### Tipy:
- Začít s minimálním UI pro Playlist komponentu
- Otestovat po každé změně v prohlížeči
- Používat browsermcp-enhanced pro automatické testování
- Console logy sledovat během testování
- Nepokoušet se udělat vše najednou - postupné kroky!

---

## 📊 PROGRESS

**Celkem:** 5 hlavních úkolů
**Hotovo:** 3/5 (60%)
**Zbývá:** 2/5 (40%)

- ✅ Playlist state management
- ✅ Previous/Next track buttons
- ✅ Auto-play další skladby
- 🔴 Playlist komponenta + conditional rendering
- 🔴 Queue drawer
- 🟡 Blob URL fixes
- 🟡 Drag & drop UI

---

## 🎯 CÍL PRO DALŠÍ RELACI

**Minimální funkční playlist:**
1. Vytvořit Playlist komponentu
2. Implementovat conditional rendering
3. Otestovat přepínání mezi "Now Playing" a "Playlists"
4. Ověřit že multiple file selection funguje

**Bonus pokud bude čas:**
5. Queue drawer
6. Opravit blob URL chyby

---

**Poslední test:** 2025-10-16 10:47 UTC
**Test nástroj:** browsermcp-enhanced
**Console stav:** Čistý (jen popup detector logy)
**UI stav:** Playlists tlačítko mění badge, ale obsah zůstává stejný
