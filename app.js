// app.js - JavaScript for LegitLah Products Page

// DOM Elements
const searchInput = document.getElementById('search');
const categoryFilter = document.getElementById('category-filter');
const productsGrid = document.getElementById('products-grid');
const addModal = document.getElementById('add-modal');
const addForm = document.getElementById('add-form');
const addListingBtn = document.getElementById('add-listing-btn');
const closeModal = document.querySelector('.close');
const connectWalletBtn = document.getElementById('connect-wallet');
const heroConnectWalletBtn = document.getElementById('hero-connect-wallet');
const navLinks = document.querySelectorAll('.nav-links a');
const imageFileInput = document.getElementById('imageFile');
const imagePreview = document.getElementById('image-preview');

// Sample initial products (for demo)
let products = JSON.parse(localStorage.getItem('products')) || [
    {
        id: 1,
        title: 'iPhone 13 Pro',
        price: 999,
        category: 'Electronics',
        imageUrl: 'https://via.placeholder.com/300x200?text=iPhone+13+Pro',
        postedBy: '@techguy',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 1 week ago
    },
    {
        id: 2,
        title: 'Nike Air Max',
        price: 150,
        category: 'Fashion',
        imageUrl: 'https://via.placeholder.com/300x200?text=Nike+Air+Max',
        postedBy: '@fashionista',
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000) // 8 hours ago
    },
    {
        id: 3,
        title: 'Vintage Guitar',
        price: 300,
        category: 'Miscellaneous',
        imageUrl: 'https://via.placeholder.com/300x200?text=Vintage+Guitar',
        postedBy: '@musiclover',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
    }
];

// Save products to localStorage
function saveProducts() {
    localStorage.setItem('products', JSON.stringify(products));
}

// Time ago helper function
function timeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
}

// Render products
function renderProducts(filteredProducts = products) {
    productsGrid.innerHTML = '';
    filteredProducts.forEach(product => {
        const imageSrc = product.imageData || product.imageUrl;
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${imageSrc}" alt="${product.title}" class="product-image">
            <div class="product-info">
                <div class="product-title">${product.title}</div>
                <div class="product-price">$${product.price}</div>
                <div class="product-meta">
                    <span>${product.postedBy}</span>
                    <span>${timeAgo(new Date(product.createdAt))}</span>
                </div>
            </div>
        `;
        productsGrid.appendChild(card);
    });
}

// Filter products
function filterProducts() {
    const searchTerm = searchInput.value.toLowerCase();
    const category = categoryFilter.value;

    let filtered = products.filter(product =>
        product.title.toLowerCase().includes(searchTerm)
    );

    if (category) {
        filtered = filtered.filter(product => product.category === category);
    }

    renderProducts(filtered);
}

// Add new product
function addProduct(event) {
    event.preventDefault();

    const file = imageFileInput.files[0];
    if (!file) {
        alert('Please select an image file.');
        return;
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        alert('Please select a valid image file (PNG, JPG, JPEG, or WebP).');
        return;
    }

    // Validate file size (2MB limit)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
        alert('File size must be less than 2MB.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const imageData = e.target.result;

        const newProduct = {
            id: Date.now(),
            title: document.getElementById('title').value,
            price: parseFloat(document.getElementById('price').value),
            category: document.getElementById('category').value,
            imageData: imageData,
            postedBy: document.getElementById('postedBy').value,
            createdAt: new Date()
        };

        products.unshift(newProduct); // Add to beginning for "trending"
        saveProducts();
        renderProducts();
        addModal.style.display = 'none';
        addForm.reset();
        imagePreview.style.display = 'none'; // Clear preview
    };
    reader.readAsDataURL(file);
}

// Event Listeners
searchInput.addEventListener('input', filterProducts);
categoryFilter.addEventListener('change', filterProducts);

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const category = e.target.dataset.category;
        categoryFilter.value = category;
        filterProducts();
    });
});

addListingBtn.addEventListener('click', () => {
    addModal.style.display = 'block';
});

closeModal.addEventListener('click', () => {
    addModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === addModal) {
        addModal.style.display = 'none';
    }
});

addForm.addEventListener('submit', addProduct);

// Handle image file selection and preview
imageFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        // Basic validation on change
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            alert('Please select a valid image file (PNG, JPG, JPEG, or WebP).');
            imageFileInput.value = '';
            imagePreview.style.display = 'none';
            return;
        }

        const maxSize = 2 * 1024 * 1024; // 2MB
        if (file.size > maxSize) {
            alert('File size must be less than 2MB.');
            imageFileInput.value = '';
            imagePreview.style.display = 'none';
            return;
        }

        // Show preview
        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else {
        imagePreview.style.display = 'none';
    }
});

// Connect Wallet (placeholder)
connectWalletBtn.addEventListener('click', () => {
    alert('Connect Wallet functionality would be implemented here.');
});

heroConnectWalletBtn.addEventListener('click', () => {
    alert('Connect Wallet functionality would be implemented here.');
});

// Initial render
renderProducts();