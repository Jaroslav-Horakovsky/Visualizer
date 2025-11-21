import express from 'express'
import multer from 'multer'
import cors from 'cors'
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3002

// Middleware
app.use(cors())
app.use(express.json({ limit: '50mb' }))

// Storage paths
const STORAGE_DIR = path.join(__dirname, 'storage')
const UPLOADS_DIR = path.join(STORAGE_DIR, 'uploads')
const COLLECTIONS_FILE = path.join(STORAGE_DIR, 'collections.json')

// Ensure storage exists
fs.ensureDirSync(UPLOADS_DIR)
if (!fs.existsSync(COLLECTIONS_FILE)) {
    fs.writeJsonSync(COLLECTIONS_FILE, [])
}

// Multer config for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR)
    },
    filename: function (req, file, cb) {
        // Preserve original extension, add timestamp for uniqueness
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        const ext = path.extname(file.originalname)
        cb(null, file.fieldname + '-' + uniqueSuffix + ext)
    }
})

const upload = multer({ storage: storage })

// Routes

// Get all collections
app.get('/api/collections', async (req, res) => {
    try {
        const collections = await fs.readJson(COLLECTIONS_FILE)
        res.json(collections)
    } catch (error) {
        console.error('Error reading collections:', error)
        res.status(500).json({ error: 'Failed to read collections' })
    }
})

// Create or Update a collection (simplified for now, just saves the whole list or single item?)
// The frontend logic currently expects to "put" a collection.
// We'll implement a route to save a single collection.
app.post('/api/collections', async (req, res) => {
    try {
        const newCollection = req.body
        const collections = await fs.readJson(COLLECTIONS_FILE)

        const index = collections.findIndex(c => c.id === newCollection.id)
        if (index >= 0) {
            collections[index] = newCollection
        } else {
            collections.push(newCollection)
        }

        await fs.writeJson(COLLECTIONS_FILE, collections, { spaces: 2 })
        res.json(newCollection)
    } catch (error) {
        console.error('Error saving collection:', error)
        res.status(500).json({ error: 'Failed to save collection' })
    }
})

// Delete a collection
app.delete('/api/collections/:id', async (req, res) => {
    try {
        const { id } = req.params
        let collections = await fs.readJson(COLLECTIONS_FILE)
        collections = collections.filter(c => c.id !== id)
        await fs.writeJson(COLLECTIONS_FILE, collections, { spaces: 2 })
        res.json({ success: true })
    } catch (error) {
        console.error('Error deleting collection:', error)
        res.status(500).json({ error: 'Failed to delete collection' })
    }
})

// Upload file
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' })
    }

    // Return the path relative to the server or a URL
    // We'll return the filename, and the frontend can construct the URL
    res.json({
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: `/api/uploads/${req.file.filename}`
    })
})

// Serve uploaded files
app.get('/api/uploads/:filename', (req, res) => {
    const { filename } = req.params
    const filePath = path.join(UPLOADS_DIR, filename)

    if (fs.existsSync(filePath)) {
        res.sendFile(filePath)
    } else {
        res.status(404).json({ error: 'File not found' })
    }
})

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
})
