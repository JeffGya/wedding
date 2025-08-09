/**
 * @openapi
 * components:
 *   schemas:
 *     Image:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         filename:
 *           type: string
 *         url:
 *           type: string
 *         alt_text:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *   parameters:
 *     imageId:
 *       in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: integer
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../helpers/logger');

/**
 * Sanitize filenames by replacing unsafe characters with underscores
 * Keeps letters, numbers, dots, hyphens, and underscores.
 */
const sanitizeFilename = name => name.replace(/[^a-z0-9._-]/gi, '_');

const router = express.Router();

const getDbConnection = require('../db/connection');
const db = getDbConnection();
let dbGet, dbAll, dbRun;
if (process.env.DB_TYPE === 'mysql') {
  dbGet = async (sql, params) => {
    const [rows] = await db.query(sql, params);
    return rows[0];
  };
  dbAll = async (sql, params) => {
    const [rows] = await db.query(sql, params);
    return rows;
  };
  dbRun = async (sql, params) => {
    const [result] = await db.query(sql, params);
    return result;
  };
} else {
  const sqlite3 = require('sqlite3').verbose();
  const { promisify } = require('util');
  dbGet = promisify(db.get.bind(db));
  dbAll = promisify(db.all.bind(db));
  dbRun = (sql, params) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) return reject(err);
        resolve(this); // `this` is the Statement, providing `lastID`
      });
    });
  };
}

// Ensure uploads directory exists
const uploadsDir = process.env.UPLOADS_PATH || path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const safeName = sanitizeFilename(base);
    cb(null, `${safeName}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (['.jpg', '.png', '.gif', '.webm'].includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only .jpg, .png, .gif, and .webm files are allowed'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 }, // 4 MB
  fileFilter
});

/**
 * @openapi
 * /api/admin/images:
 *   get:
 *     summary: Retrieve all images
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       '200':
 *         description: List of images
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Image'
 *   post:
 *     summary: Upload a new image
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               alt_text:
 *                 type: string
 *     responses:
 *       '201':
 *         description: Image uploaded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Image'
 */
// POST /api/admin/images → upload new image
router.post('/', upload.single('image'), async (req, res, next) => {
  try {
    const { filename } = req.file;
    const alt_text = req.body.alt_text || null;
    const url = `${req.protocol}://${req.get('host')}/uploads/${filename}`;

    // Insert into database
    const result = await dbRun(
      'INSERT INTO images (filename, url, alt_text) VALUES (?, ?, ?)',
      [filename, url, alt_text]
    );
    const id = result.insertId || result.lastID;

    // Retrieve the complete record
    const image = await dbGet(
      'SELECT id, filename, url, alt_text, created_at, updated_at FROM images WHERE id = ?',
      [id]
    );

    // Respond with full image metadata
    return res.status(201).json(image);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/images → list all images
router.get('/', async (req, res, next) => {
  try {
    const images = await dbAll(
      'SELECT id, filename, url, alt_text, created_at, updated_at FROM images ORDER BY created_at DESC'
    );
    res.json(images);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/admin/images/{id}:
 *   put:
 *     summary: Update image metadata (alt text or filename)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/imageId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               alt_text:
 *                 type: string
 *               filename:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Updated image object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Image'
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { alt_text: newAlt, filename: newFilename } = req.body;
    // Fetch existing record
    const image = await dbGet('SELECT * FROM images WHERE id = ?', [id]);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    let filename = image.filename;
    // Rename file if new filename provided
    if (newFilename && newFilename !== filename) {
      const oldPath = path.join(uploadsDir, filename);
      const ext = path.extname(filename);
      const updatedName = newFilename.endsWith(ext) ? newFilename : newFilename + ext;
      const newPath = path.join(uploadsDir, updatedName);
      await fs.promises.rename(oldPath, newPath);
      filename = updatedName;
    }
    // Build new URL and alt text
    const url = `${req.protocol}://${req.get('host')}/uploads/${filename}`;
    const alt_text = newAlt !== undefined ? newAlt : image.alt_text;
    // Update database
    await dbRun(
      'UPDATE images SET filename = ?, url = ?, alt_text = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [filename, url, alt_text, id]
    );
    res.json({ id, filename, url, alt_text });
  } catch (err) {
    next(err);
  }
});
/**
 * @openapi
 * /api/admin/images/{id}:
 *   delete:
 *     summary: Delete an image
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/imageId'
 *     responses:
 *       '204':
 *         description: Image deleted successfully
 */
// DELETE /api/admin/images/:id → delete image
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const image = await dbGet('SELECT * FROM images WHERE id = ?', [id]);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Delete file from disk using promises
    const filePath = path.join(uploadsDir, image.filename);
    try {
      await fs.promises.unlink(filePath);
      logger.info(`File deleted successfully: ${filePath}`);
    } catch (fsErr) {
      logger.error('Error deleting file:', fsErr);
      // Continue with database deletion even if file deletion fails
      // (file might not exist or already be deleted)
    }

    // Delete record from database
    await dbRun('DELETE FROM images WHERE id = ?', [id]);
    logger.info(`Image record deleted from database: ${id}`);
    
    res.status(204).end();
  } catch (err) {
    logger.error('Error in image deletion:', err);
    next(err);
  }
});

module.exports = router;