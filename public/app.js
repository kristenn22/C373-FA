// app.js - Client-side JavaScript for LegitLah Products Page

// DOM Elements
const searchInput = document.getElementById('search');
const categoryFilter = document.getElementById('category-filter');
const connectWalletBtn = document.getElementById('connect-wallet');
const heroConnectWalletBtn = document.getElementById('hero-connect-wallet');

// Function to update URL with query params
function updateFilters() {
    const category = categoryFilter.value;
    const q = searchInput.value.trim();

    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (q) params.set('q', q);

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.location.href = newUrl;
}

// Event Listeners
searchInput.addEventListener('input', () => {
    // Debounce search to avoid too many redirects
    clearTimeout(searchInput.debounceTimer);
    searchInput.debounceTimer = setTimeout(updateFilters, 500);
});

categoryFilter.addEventListener('change', updateFilters);

// Connect Wallet (placeholder)
connectWalletBtn.addEventListener('click', () => {
    alert('Connect Wallet functionality would be implemented here.');
});

heroConnectWalletBtn.addEventListener('click', () => {
    alert('Connect Wallet functionality would be implemented here.');
});