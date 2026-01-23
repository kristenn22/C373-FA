const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const { categories, topCategories } = require('./config/categories');

const app = express();
const PORT = 3001;

// Database setup
const db = new sqlite3.Database('./products.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        // Create table if not exists
        db.run(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            price REAL NOT NULL,
            category TEXT NOT NULL,
            imageUrl TEXT NOT NULL,
            postedBy TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    }
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: timestamp + random + extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files (jpg, jpeg, png, webp) are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB limit
    }
});

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
    const category = req.query.category || '';
    const q = req.query.q || '';

    let query = 'SELECT * FROM products WHERE 1=1';
    let params = [];

    if (category && category !== 'All') {
        query += ' AND category = ?';
        params.push(category);
    }

    if (q) {
        query += ' AND title LIKE ?';
        params.push(`%${q}%`);
    }

    query += ' ORDER BY createdAt DESC';

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Database error');
        }
        res.render('index', { products: rows, topCategories, categories, selectedCategory: category, searchQuery: q });
    });
});

app.get('/add', (req, res) => {
    res.render('add', { error: null, categories });
});

app.post('/add', upload.single('image'), (req, res) => {
    const { title, price, category, postedBy } = req.body;

    // Validation
    if (!req.file) {
        return res.render('add', { error: 'Please upload an image.' });
    }
    if (!categories.includes(category)) {
        return res.render('add', { error: 'Please select a valid category.', categories });
    }
    const imageUrl = '/uploads/' + req.file.filename;

    // Insert into database
    db.run(`INSERT INTO products (title, price, category, imageUrl, postedBy) VALUES (?, ?, ?, ?, ?)`,
        [title, parseFloat(price), category, imageUrl, postedBy],
        function(err) {
            if (err) {
                console.error(err.message);
                return res.status(500).send('Database error');
            }
            res.redirect('/');
        });
});

// Chat Route
app.get('/chat/:seller', (req, res) => {
    const sellerUsername = req.params.seller;
    const productId = req.query.productId;
    const buyerUsername = '@buyer'; // Placeholder

    if (!productId) {
        return res.status(400).send('Product ID required');
    }

    // Get product title for header
    db.get('SELECT title FROM products WHERE id = ?', [productId], (err, product) => {
        if (err || !product) {
            return res.status(404).send('Product not found');
        }
        res.render('chat', { sellerUsername, productId, productTitle: product.title, buyerUsername });
    });
});

// Product Details Route
app.get('/product/:id', (req, res) => {
    const productId = req.params.id;
    const success = req.query.success === 'true';
    db.get('SELECT * FROM products WHERE id = ?', [productId], (err, product) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Database error');
        }
        if (!product) {
            return res.status(404).render('404', { message: 'Product not found' });
        }
        res.render('productDetails', { product, categories, success });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});