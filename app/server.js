const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// PostgreSQL Connection Pool Configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password123',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'myapp',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// ============================================
// Database Initialization
// ============================================

async function initDB() {
  const client = await pool.connect();
  try {
    console.log('Initializing database...');
    
    // Create items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create index for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_items_created_at 
      ON items(created_at DESC);
    `);
    
    console.log('✓ Database initialized successfully');
  } catch (error) {
    console.error('✗ Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// ============================================
// REST API Routes
// ============================================

// 1. HOME ENDPOINT - Serve the main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 2. HEALTH CHECK ENDPOINT
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
});

// 3. API: GET ALL ITEMS
app.get('/api/items', async (req, res) => {
  try {
    const query = `
      SELECT id, title, description, status, created_at, updated_at 
      FROM items 
      WHERE status = 'active'
      ORDER BY created_at DESC
      LIMIT 100
    `;
    const result = await pool.query(query);
    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch items',
      message: error.message
    });
  }
});

// 4. API: CREATE NEW ITEM
app.post('/api/items', async (req, res) => {
  const { title, description } = req.body;
  
  // Validation
  if (!title || title.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Title is required'
    });
  }
  
  try {
    const query = `
      INSERT INTO items (title, description, status) 
      VALUES ($1, $2, $3) 
      RETURNING id, title, description, status, created_at
    `;
    const result = await pool.query(query, [
      title.trim(),
      description ? description.trim() : null,
      'active'
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Item created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create item',
      message: error.message
    });
  }
});

// 5. API: GET SINGLE ITEM
app.get('/api/items/:id', async (req, res) => {
  const { id } = req.params;
  
  if (!Number.isInteger(parseInt(id))) {
    return res.status(400).json({
      success: false,
      error: 'Invalid item ID'
    });
  }
  
  try {
    const result = await pool.query(
      'SELECT * FROM items WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch item',
      message: error.message
    });
  }
});

// 6. API: UPDATE ITEM
app.put('/api/items/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, status } = req.body;
  
  if (!Number.isInteger(parseInt(id))) {
    return res.status(400).json({
      success: false,
      error: 'Invalid item ID'
    });
  }
  
  try {
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;
    
    if (title !== undefined) {
      updateFields.push(`title = $${paramCount++}`);
      updateValues.push(title);
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      updateValues.push(description);
    }
    if (status !== undefined) {
      updateFields.push(`status = $${paramCount++}`);
      updateValues.push(status);
    }
    
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id);
    
    if (updateFields.length === 1) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }
    
    const query = `
      UPDATE items 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, updateValues);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Item updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update item',
      message: error.message
    });
  }
});

// 7. API: DELETE ITEM
app.delete('/api/items/:id', async (req, res) => {
  const { id } = req.params;
  
  if (!Number.isInteger(parseInt(id))) {
    return res.status(400).json({
      success: false,
      error: 'Invalid item ID'
    });
  }
  
  try {
    // Soft delete: mark as inactive instead of removing
    const result = await pool.query(
      'UPDATE items SET status = $1 WHERE id = $2 RETURNING *',
      ['deleted', id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Item deleted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete item',
      message: error.message
    });
  }
});

// 8. API: GET STATISTICS
app.get('/api/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_items,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_items,
        COUNT(CASE WHEN status = 'deleted' THEN 1 END) as deleted_items
      FROM items
    `);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

// ============================================
// Error Handling
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ============================================
// Server Startup
// ============================================

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

async function startServer() {
  try {
    // Initialize database first
    await initDB();
    
    // Start listening
    app.listen(PORT, HOST, () => {
      console.log(`
╔════════════════════════════════════════════════════════╗
║   Docker Web Application Started (GUI Version)         ║
╠════════════════════════════════════════════════════════╣
║ Port: ${PORT}                                              ║
║ Host: ${HOST}                                          ║
║ Environment: ${process.env.NODE_ENV || 'development'}                          ║
║ URL: http://localhost:${PORT}                              ║
║ Status: Ready                                          ║
╚════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

// Start the application
startServer();