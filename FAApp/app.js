const express = require('express');
const {Web3} = require('web3');
const fs = require("fs");
const path = require('path');
const crypto = require('crypto');

// Load contract files
const OrderContract = require('./public/build/OrderContract.json');
const SellerOrderContract = require('./public/build/SellerOrderContract.json');
const UserRegistry = require('./public/build/UserRegistry.json');

const app = express();
//Set up view engine
app.set('view engine', 'ejs');
//This line of code tells Express to serve static files
app.use(express.static('public'))
//enable form processing
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Declare global variables
var GanacheWeb3;
var account = '';
var noOfOrders = 0;
var loading = true;  
var orderContractInfo;
var sellerContractInfo;
var userRegistryInfo;
var userCart = {}; // Store cart items with account as key
var loggedInUsers = {}; // Track logged in users
const adminSessions = new Map();
const userSessions = new Map();

// Check if user is signed in (has account connected)
function isSignedIn() {
    return account && account.trim() !== '' && !loading;
}

function isAdmin() {
    return isSignedIn();
}

function normalizeEmail(value) {
    return value.trim().toLowerCase();
}

function parseCookies(req) {
    const header = req.headers.cookie || '';
    return header.split(';').reduce((acc, pair) => {
        const [key, ...rest] = pair.trim().split('=');
        if (!key) {
            return acc;
        }
        acc[key] = decodeURIComponent(rest.join('='));
        return acc;
    }, {});
}

function getAdminSession(req) {
    const cookies = parseCookies(req);
    const token = cookies.admin_session;
    if (!token) {
        return null;
    }
    return adminSessions.get(token) || null;
}

function getUserSession(req) {
    const cookies = parseCookies(req);
    const token = cookies.user_session;
    if (!token) {
        return null;
    }
    return userSessions.get(token) || null;
}

async function verifyCredentials(email, password) {
    if (!userRegistryInfo) {
        throw new Error('User registry not available');
    }
    const emailHash = Web3.utils.keccak256(normalizeEmail(email));
    const passwordHash = Web3.utils.keccak256(password);
    const result = await userRegistryInfo.methods.verifyCredentials(emailHash, passwordHash).call();
    return { ...result, emailHash };
}

function createAdminSession(emailHash) {
    const token = crypto.randomBytes(32).toString('hex');
    adminSessions.set(token, { emailHash, createdAt: Date.now() });
    return token;
}

function createUserSession(emailHash, role) {
    const token = crypto.randomBytes(32).toString('hex');
    userSessions.set(token, { emailHash, role, createdAt: Date.now() });
    return token;
}



// Initialize blockchain on server startup
async function componentWillMount() {
    try {
        await loadWeb3();
        await loadBlockchainData();
    } catch (error) {
        console.error('Error in componentWillMount:', error);
    } 
}

// Load Web3 connection
async function loadWeb3() {
    //loads the connection to the blockchain (ganache)
    GanacheWeb3 = new Web3("http://127.0.0.1:7545");
    console.log('Web3 connected to Ganache at http://127.0.0.1:7545');
}

// Load blockchain data
async function loadBlockchainData() {
    try {
        loading = true;
        const web3 = GanacheWeb3;
        
        // Load accounts from blockchain
        const accounts = await web3.eth.getAccounts()
        account = accounts[0];
        console.log('Loaded account:', account);
        
        // Get network ID
        const networkId = await web3.eth.net.getId()
        console.log('Network ID:', networkId);
        
        // Read network data for OrderContract
        const orderNetworkData = OrderContract.networks[networkId]
        if (!orderNetworkData) {
            throw new Error('Order contract not deployed to detected network');
        }
        
        // Initialize Order contract
        orderContractInfo = new web3.eth.Contract(OrderContract.abi, orderNetworkData.address)
        console.log('Order contract initialized at:', orderNetworkData.address);
        
        // Initialize Seller contract if available
        const sellerNetworkData = SellerOrderContract.networks[networkId]
        if (sellerNetworkData) {
            sellerContractInfo = new web3.eth.Contract(SellerOrderContract.abi, sellerNetworkData.address)
            console.log('Seller contract initialized at:', sellerNetworkData.address);
        }

        // Initialize UserRegistry contract if available
        const userNetworkData = UserRegistry.networks[networkId];
        if (userNetworkData) {
            userRegistryInfo = new web3.eth.Contract(UserRegistry.abi, userNetworkData.address);
            console.log('User registry initialized at:', userNetworkData.address);
        }
        
        // Get order count from contract
        const cnt = await orderContractInfo.methods.getOrderCount().call();
        noOfOrders = cnt;
        console.log(`Order count from blockchain: ${cnt.toString()}`);
        
        loading = false;
        return {
            account,
            orderContractInfo,
            sellerContractInfo,
            noOfOrders
        };
    } catch (error) {
        console.error('Error loading blockchain data:', error);
        loading = false;
        throw error;
    }
}

// Start server and initialize blockchain
const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await componentWillMount();
});

// Helper function to check if user is logged in
function isUserLoggedIn(userAccount) {
    return loggedInUsers[userAccount] === true;
}

// Helper function to pass common data to all views
function getCommonData(req) {
    const isLoggedIn = Boolean(getUserSession(req) || getAdminSession(req));
    return {
        acct: account,
        loading: loading,
        isLoggedIn: isLoggedIn,
        error: null
    };
}

// Home page
app.get('/', async(req, res) => {   
    try {
        res.render('index', {
            acct: account,
            loading: loading
        });
    } catch (error) {
        console.error('Error in home route:', error);
        res.status(500).send('Server error');
    }
});
// Get started - redirect based on sign-in status
app.get('/get-started', (req, res) => {
    const userSession = getUserSession(req);
    if (!userSession) {
        return res.redirect('/signup');
    }
    if (String(userSession.role) === '3') {
        return res.redirect('/admin');
    }
    if (String(userSession.role) === '2') {
        return res.redirect('/seller');
    }
    return res.redirect('/user-home');
});

// Register page
app.get('/register', (req, res) => {
    try {
        res.render('register', getCommonData(req));
    } catch (error) {
        console.error('Error in register route:', error);
        res.status(500).send('Server error');
    }
});

// Sign up page
app.get('/signup', (req, res) => {
    try {
        res.render('register', getCommonData(req));
    } catch (error) {
        console.error('Error in signup route:', error);
        res.status(500).send('Server error');
    }
});

// Handle sign up submission (email + password only)
app.post('/signup', async (req, res) => {
    try {
        const email = (req.body.email || '').trim();
        const password = req.body.password || '';
        const confirmPassword = req.body.confirmPassword || '';
        const accountType = (req.body.accountType || 'user').trim().toLowerCase();

        if (!email || !password || !confirmPassword) {
            return res.status(400).render('register', {
                ...getCommonData(req),
                error: 'Email and password are required.'
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).render('register', {
                ...getCommonData(req),
                error: 'Passwords do not match.'
            });
        }

        if (!userRegistryInfo) {
            return res.status(500).render('register', {
                ...getCommonData(req),
                error: 'User registry not available.'
            });
        }

        const roleMap = { user: 1, seller: 2 };
        const role = roleMap[accountType];
        if (!role) {
            return res.status(400).render('register', {
                ...getCommonData(req),
                error: 'Please choose a valid account type.'
            });
        }

        const emailHash = Web3.utils.keccak256(normalizeEmail(email));
        const passwordHash = Web3.utils.keccak256(password);

        await userRegistryInfo.methods
            .registerUserByEmailWithRole(emailHash, passwordHash, role)
            .send({ from: account, gas: 300000 });

        return res.redirect('/login');
    } catch (error) {
        console.error('Signup error:', error);
        return res.status(500).render('register', {
            ...getCommonData(req),
            error: error.message || 'Failed to sign up.'
        });
    }
});

// Login Page 
 app.get('/login', async(req, res) => {
    try {
        res.render('login', {
            acct: account,
            loading: false,
            productData: null,
            error: null
        });
    } catch (error) {
        console.error('Error in login route:', error);
        res.status(500).send('Server error');
    }
});

// Handle login form submission (email + password only)
app.post('/login', async (req, res) => {
    try {
        const email = (req.body.email || '').trim();
        const password = req.body.password || '';

        if (!email || !password) {
            return res.status(400).render('login', {
                acct: account,
                loading: false,
                productData: null,
                error: 'Email and password are required.'
            });
        }

        const result = await verifyCredentials(email, password);
        if (!result.isValid) {
            return res.status(401).render('login', {
                acct: account,
                loading: false,
                productData: null,
                error: 'Invalid credentials.'
            });
        }

        const token = createUserSession(result.emailHash, result.role);
        res.setHeader('Set-Cookie', `user_session=${token}; HttpOnly; SameSite=Lax; Path=/`);

        if (String(result.role) === '3') {
            return res.redirect('/admin');
        }
        if (String(result.role) === '2') {
            return res.redirect('/seller');
        }
        return res.redirect('/user-home');
    } catch (error) {
        console.error('Error in login post route:', error);
        return res.status(500).render('login', {
            acct: account,
            loading: false,
            productData: null,
            error: 'Failed to login.'
        });
    }
});

// Admin login page (email + password only)
app.get('/admin-login', (req, res) => {
    res.render('admin-login', {
        error: null
    });
});

// Handle admin login submission
app.post('/admin-login', async (req, res) => {
    try {
        const email = (req.body.email || '').trim();
        const password = req.body.password || '';

        if (!email || !password) {
            return res.status(400).render('admin-login', {
                error: 'Email and password are required.'
            });
        }

        const result = await verifyCredentials(email, password);
        if (!result.isValid || String(result.role) !== '3') {
            return res.status(401).render('admin-login', {
                error: 'Invalid admin credentials.'
            });
        }

        const adminToken = createAdminSession(result.emailHash);
        const userToken = createUserSession(result.emailHash, result.role);
        res.setHeader('Set-Cookie', [
            `admin_session=${adminToken}; HttpOnly; SameSite=Lax; Path=/`,
            `user_session=${userToken}; HttpOnly; SameSite=Lax; Path=/`
        ]);
        return res.redirect('/admin');
    } catch (error) {
        console.error('Admin login error:', error);
        return res.status(500).render('admin-login', {
            error: 'Failed to login. Try again.'
        });
    }
});

// Admin logout
app.get('/admin-logout', (req, res) => {
    const cookies = parseCookies(req);
    if (cookies.admin_session) {
        adminSessions.delete(cookies.admin_session);
    }
    if (cookies.user_session) {
        userSessions.delete(cookies.user_session);
    }
    res.setHeader('Set-Cookie', [
        'admin_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0',
        'user_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'
    ]);
    res.redirect('/admin-login');
});

// User home page (requires login)
app.get('/user-home', (req, res) => {
    const userSession = getUserSession(req);
    if (!userSession && !isSignedIn()) {
        return res.redirect('/login');
    }

    const role = userSession ? userSession.role : '0';
    if (String(role) === '0') {
        return res.status(403).send('Forbidden');
    }

    return res.render('user-home', getCommonData(req));
});

// Admin page (requires admin account)
app.get('/admin', (req, res) => {
    const adminSession = getAdminSession(req);
    const userSession = getUserSession(req);

    if (adminSession || (userSession && String(userSession.role) === '3')) {
        return res.render('admin', getCommonData(req));
    }

    return res.redirect('/admin-login');
});

// Promote user to admin (email + admin session)
app.post('/admin/promote', async (req, res) => {
    const adminSession = getAdminSession(req);
    const userSession = getUserSession(req);
    if (!adminSession && !(userSession && String(userSession.role) === '3')) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const email = (req.body.email || '').trim();
    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }

    if (!userRegistryInfo) {
        return res.status(500).json({ success: false, message: 'User registry not available' });
    }

    try {
        const emailHash = Web3.utils.keccak256(normalizeEmail(email));
        await userRegistryInfo.methods
            .setAdminByEmailHash(emailHash)
            .send({ from: account, gas: 300000 });
        return res.json({ success: true });
    } catch (error) {
        console.error('Admin promote error:', error);
        return res.status(500).json({ success: false, message: error.message || 'Promotion failed' });
    }
});

// Allow seller to confirm delivery
app.post('/admin/allow-seller', async (req, res) => {
    const adminSession = getAdminSession(req);
    const userSession = getUserSession(req);
    if (!adminSession && !(userSession && String(userSession.role) === '3')) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const sellerAddress = (req.body.sellerAddress || '').trim();
    if (!sellerAddress) {
        return res.status(400).json({ success: false, message: 'Seller address is required' });
    }

    if (!orderContractInfo) {
        return res.status(500).json({ success: false, message: 'Order contract not available' });
    }

    try {
        await orderContractInfo.methods
            .setSellerConfirmAllowed(sellerAddress, true)
            .send({ from: account, gas: 200000 });
        return res.json({ success: true });
    } catch (error) {
        console.error('Allow seller error:', error);
        return res.status(500).json({ success: false, message: error.message || 'Failed to allow seller' });
    }
});

// List users for admin dashboard
app.get('/admin/users', async (req, res) => {
    const adminSession = getAdminSession(req);
    const userSession = getUserSession(req);
    if (!adminSession && !(userSession && String(userSession.role) === '3')) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!userRegistryInfo) {
        return res.status(500).json({ success: false, message: 'User registry not available' });
    }

    try {
        const count = await userRegistryInfo.methods.getUserCount().call();
        const total = Number(count);
        const limit = Math.min(total, 200);
        const users = [];
        for (let i = 0; i < limit; i++) {
            const user = await userRegistryInfo.methods.getUserByIndex(i).call();
            users.push({
                emailHash: user.emailHash,
                role: String(user.role),
                wallet: user.wallet
            });
        }

        return res.json({ success: true, users });
    } catch (error) {
        console.error('Admin users error:', error);
        return res.status(500).json({ success: false, message: error.message || 'Failed to load users' });
    }
});


// Handle logout
app.post('/logout', express.json(), async(req, res) => {
    try {
        const cookies = parseCookies(req);
        if (cookies.user_session) {
            userSessions.delete(cookies.user_session);
        }
        if (cookies.admin_session) {
            adminSessions.delete(cookies.admin_session);
        }
        console.log('User logged out');
        
        res.json({
            success: true,
            message: 'Logged out successfully',
            isLoggedIn: false
        });
    } catch (error) {
        console.error('Error in logout route:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Product page
app.get('/products', async(req, res) => {
    try {
        const data = getCommonData(req);
        res.render('productDetails', {
            ...data,
        });
    } catch (error) {
        console.error('Error in products route:', error);
        res.status(500).send('Server error');
    }
});

// Buy page - Order Summary
app.get('/buy', async(req, res) => {
    try {
        const data = getCommonData(req);
        res.render('buy', {
            ...data,
            contractABI: JSON.stringify(OrderContract.abi),
            contractData: JSON.stringify(OrderContract)
        });
    } catch (error) {
        console.error('Error in buy route:', error);
        res.status(500).send('Server error');
    }
});

// Order Tracker
app.get('/ordertrack', async(req, res) => {
    try {
        const orderId = req.query.orderId || '';
        const data = getCommonData(req);
        res.render('ordertrack', {
            ...data,
            orderId: orderId,
            contractABI: JSON.stringify(OrderContract.abi),
            contractData: JSON.stringify(OrderContract)
        });
    } catch (error) {
        console.error('Error in ordertrack route:', error);
        res.status(500).send('Server error');
    }
});

// Order Details (with path parameter)
app.get('/orderdetails/:orderId', async(req, res) => {
    try {
        const data = getCommonData(req);
        res.render('orderdetails', {
            ...data,
            orderId: req.params.orderId,
            contractABI: JSON.stringify(OrderContract.abi),
            contractData: JSON.stringify(OrderContract)
        });
    } catch (error) {
        console.error('Error in orderdetails route:', error);
        res.status(500).send('Server error');
    }
});

// Order Details (with query parameter)
app.get('/orderdetails', async(req, res) => {
    const orderId = req.query.orderId || '';
    const data = getCommonData(req);
    
    try {
        res.render('orderdetails', {
            ...data,
            orderId: orderId,
            contractABI: JSON.stringify(OrderContract.abi),
            contractData: JSON.stringify(OrderContract)
        });
    } catch (error) {
        console.error('Error in orderdetails route:', error);
        res.status(500).send('Server error');
    }
});

app.get('/orderhistory', async(req, res) => {
    const data = getCommonData(req);
    
    try {
        res.render('orderhistory', {
            ...data,
            contractABI: JSON.stringify(OrderContract.abi),
            contractData: JSON.stringify(OrderContract),
            sellerContractABI: JSON.stringify(SellerOrderContract.abi),
            sellerContractData: JSON.stringify(SellerOrderContract)
        });
    } catch (error) {
        console.error('Error in orderhistory route:', error);
        res.status(500).send('Server error');
    }
});

app.get('/buyerorders', async(req, res) => {
    const data = getCommonData(req);
    
    try {
        res.render('buyerorders', {
            ...data,
            contractABI: JSON.stringify(OrderContract.abi),
            contractData: JSON.stringify(OrderContract)
        });
    } catch (error) {
        console.error('Error in buyerorders route:', error);
        res.status(500).send('Server error');
    }
});

app.get('/sellerorders', async(req, res) => {
    const data = getCommonData(req);
    
    try {
        res.render('sellerorders', {
            ...data,
            contractABI: JSON.stringify(OrderContract.abi),
            contractData: JSON.stringify(OrderContract),
            sellerContractABI: JSON.stringify(SellerOrderContract.abi),
            sellerContractData: JSON.stringify(SellerOrderContract)
        });
    } catch (error) {
        console.error('Error in sellerorders route:', error);
        res.status(500).send('Server error');
    }
});

// Seller products page
app.get('/sellerproducts', async(req, res) => {
    const data = getCommonData(req);
    try {
        const sellerContractAddress = sellerContractInfo ? sellerContractInfo.options.address : 'Not deployed';
        res.render('sellerproducts', {
            ...data,
            sellerContractAddress: sellerContractAddress,
            sellerContractABI: JSON.stringify(SellerOrderContract.abi),
            sellerContractData: JSON.stringify(SellerOrderContract)
        });
    } catch (error) {
        console.error('Error in sellerproducts route:', error);
        res.status(500).send('Server error');
    }
});

// Handle MetaMask connection
app.post('/web3ConnectData', express.json(), async (req, res) => {
    try {
        const { contractAddress, acct, orderCnt } = req.body;
        account = acct;
        orderCount = orderCnt;
        loading = false;
        
        console.log('Connected account:', account);
        console.log('Contract address:', contractAddress);
        
        res.json({
            success: true,
            message: 'Connected successfully'
        });
    } catch (error) {
        console.error('Error in web3ConnectData:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Create order
app.post('/createOrder', express.json(), async (req, res) => {
    try {
        const { orderId, txHash } = req.body;
        
        console.log('Order created:', orderId);
        console.log('Transaction hash:', txHash);
        
        res.json({
            success: true,
            orderId: orderId,
            txHash: txHash
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Confirm delivery page
app.get('/confirm', async(req, res) => {
    const orderId = req.query.orderId || '';
    const data = getCommonData(req);
    
    try {
        res.render('confirm', {
            ...data,
            orderId: orderId,
            contractABI: JSON.stringify(OrderContract.abi),
            contractData: JSON.stringify(OrderContract)
        });
    } catch (error) {
        console.error('Error in confirm route:', error);
        res.status(500).send('Server error');
    }
});

// Handle delivery confirmation
app.post('/confirmDelivery', express.json(), async (req, res) => {
    try {
        const { orderId, received, txHash } = req.body;
        
        console.log('Delivery confirmation:', orderId, received);
        console.log('Transaction hash:', txHash);
        
        res.json({
            success: true,
            message: received ? 'Delivery confirmed' : 'Refund requested'
        });
    } catch (error) {
        console.error('Error confirming delivery:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get order data (for AJAX calls)
app.get('/getOrderData', async (req, res) => {
    try {
        const orderId = req.query.orderId;
        
        // This will be populated by blockchain data from frontend
        res.json({
            success: true,
            orderId: orderId
        });
    } catch (error) {
        console.error('Error getting order data:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Add to cart
app.post('/addToCart', express.json(), async (req, res) => {
    try {
        const { productName, price, userAccount } = req.body;
        
        console.log('=== ADD TO CART DEBUG ===');
        console.log('Adding for account:', userAccount);
        console.log('Product:', productName, 'Price:', price);
        
        // Initialize cart for user if not exists
        if (!userCart[userAccount]) {
            userCart[userAccount] = [];
        }
        
        // Add item to cart
        const cartItem = {
            id: Date.now(),
            productName: productName,
            price: parseFloat(price),
            quantity: 1
        };
        userCart[userAccount].push(cartItem);
        
        console.log('Cart after add:', userCart[userAccount]);
        console.log('All cart keys:', Object.keys(userCart));
        console.log('=======================');
        
        res.json({
            success: true,
            message: 'Item added to cart',
            cartCount: userCart[userAccount].length
        });
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// View cart
app.get('/cart', async (req, res) => {
    try {
        const data = getCommonData(req);
        res.render('cart', {
            ...data,
            contractABI: JSON.stringify(OrderContract.abi),
            contractData: JSON.stringify(OrderContract)
        });
    } catch (error) {
        console.error('Error in cart route:', error);
        res.status(500).send('Server error');
    }
});

// Get cart items
app.get('/getCart', express.json(), async (req, res) => {
    try {
        const userAccount = req.query.account;
        const cartItems = userCart[userAccount] || [];
        
        console.log('=== GET CART DEBUG ===');
        console.log('Requested account:', userAccount);
        console.log('All cart keys:', Object.keys(userCart));
        console.log('Cart items for this account:', cartItems);
        console.log('====================');
        
        res.json({
            success: true,
            items: cartItems,
            total: cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        });
    } catch (error) {
        console.error('Error getting cart:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Remove from cart
app.post('/removeFromCart', express.json(), async (req, res) => {
    try {
        const { itemId, userAccount } = req.body;
        
        if (!userCart[userAccount]) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }
        
        // Remove item by id
        userCart[userAccount] = userCart[userAccount].filter(item => item.id !== itemId);
        
        console.log('Item removed from cart. Remaining items:', userCart[userAccount].length);
        
        res.json({
            success: true,
            message: 'Item removed from cart',
            cartCount: userCart[userAccount].length
        });
    } catch (error) {
        console.error('Error removing from cart:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Checkout page
app.get('/checkout', async (req, res) => {
    try {
        const data = getCommonData(req);
        res.render('checkout', {
            ...data,
            contractABI: JSON.stringify(OrderContract.abi),
            contractData: JSON.stringify(OrderContract)
        });
    } catch (error) {
        console.error('Error in checkout route:', error);
        res.status(500).send('Server error');
    }
});

// Process checkout
app.post('/processCheckout', express.json(), async (req, res) => {
    try {
        const { userAccount, name, email, address, cartItems } = req.body;
        
        console.log('Checkout data:', { userAccount, name, email, address, cartItems });
        
        // Store customer info (this would be done in smart contract in production)
        const checkoutData = {
            userAccount,
            name,
            email,
            address,
            items: cartItems,
            timestamp: new Date(),
            total: cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        };
        
        // Clear cart after checkout
        if (userCart[userAccount]) {
            delete userCart[userAccount];
        }
        
        res.json({
            success: true,
            message: 'Checkout completed successfully',
            checkoutData: checkoutData
        });
    } catch (error) {
        console.error('Error processing checkout:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Seller side page
app.get('/seller', async(req, res) => {
    try {
        const userSession = getUserSession(req);
        if (!userSession || String(userSession.role) !== '2') {
            return res.redirect('/login');
        }

        const sellerContractAddress = sellerContractInfo ? sellerContractInfo.options.address : 'Not deployed';
        const data = getCommonData(req);
        res.render('seller', {
            ...data,
            orderId: 0,
            sellerContractAddress: sellerContractAddress,
            orderContractABI: JSON.stringify(OrderContract.abi),
            orderContractData: JSON.stringify(OrderContract),
            sellerContractABI: JSON.stringify(SellerOrderContract.abi),
            sellerContractData: JSON.stringify(SellerOrderContract)
        });
    } catch (error) {
        console.error('Error in seller route:', error);
        res.status(500).send('Server error');
    }
});

// Create seller profile
app.post('/createSellerProfile', express.json(), async (req, res) => {
    try {
        const { sellerName, txHash } = req.body;
        
        console.log('Seller profile created:', sellerName);
        console.log('Transaction hash:', txHash);
        
        res.json({
            success: true,
            message: 'Seller profile created successfully',
            sellerName: sellerName
        });
    } catch (error) {
        console.error('Error creating seller profile:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Accept order
app.post('/acceptOrder', express.json(), async (req, res) => {
    try {
        const { orderId, txHash } = req.body;
        
        console.log('Order accepted:', orderId);
        console.log('Transaction hash:', txHash);
        
        res.json({
            success: true,
            message: 'Order accepted successfully',
            orderId: orderId
        });
    } catch (error) {
        console.error('Error accepting order:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Ship order
app.post('/shipOrder', express.json(), async (req, res) => {
    try {
        const { orderId, trackingNumber, txHash } = req.body;
        
        console.log('Order shipped:', orderId);
        console.log('Tracking number:', trackingNumber);
        console.log('Transaction hash:', txHash);
        
        // Update the tracking number in the smart contract
        if (orderContractInfo && trackingNumber) {
            try {
                const tx = await orderContractInfo.methods.updateTrackingNumber(orderId, trackingNumber)
                    .send({ from: account, gas: 500000 });
                console.log('Tracking number updated in contract:', tx);
            } catch (contractError) {
                console.warn('Could not update tracking number in contract:', contractError.message);
                // Continue anyway, tracking was likely updated on seller contract side
            }
        }
        
        res.json({
            success: true,
            message: 'Order shipped successfully',
            orderId: orderId,
            trackingNumber: trackingNumber
        });
    } catch (error) {
        console.error('Error shipping order:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Release payment to seller
app.post('/releasePayment', express.json(), async (req, res) => {
    try {
        const { orderId, txHash } = req.body;
        
        console.log('Payment released:', orderId);
        console.log('Transaction hash:', txHash);
        
        res.json({
            success: true,
            message: 'Payment released successfully',
            orderId: orderId
        });
    } catch (error) {
        console.error('Error releasing payment:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get tracking info for seller order
app.get('/getSellerTrackingInfo', express.json(), async (req, res) => {
    try {
        const orderId = req.query.orderId;
        
        if (!orderId || !sellerContractInfo) {
            return res.status(400).json({
                success: false,
                message: 'Order ID required or contract not available'
            });
        }
        
        // Call contract method to get tracking info
        const trackingInfo = await sellerContractInfo.methods.getTrackingInfo(orderId).call({
            from: account
        });
        
        res.json({
            success: true,
            status: trackingInfo.status,
            trackingNumber: trackingInfo.trackingNumber,
            timestamp: trackingInfo.timestamp
        });
    } catch (error) {
        console.error('Error getting seller tracking info:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get tracking history for order
app.get('/getTrackingHistory', express.json(), async (req, res) => {
    try {
        const orderId = req.query.orderId;
        
        if (!orderId || !orderContractInfo) {
            return res.status(400).json({
                success: false,
                message: 'Order ID required or contract not available'
            });
        }
        
        // Call contract method to get tracking history
        const trackingHistory = await orderContractInfo.methods.getTrackingHistory(orderId).call({
            from: account
        });
        
        res.json({
            success: true,
            trackingHistory: trackingHistory
        });
    } catch (error) {
        console.error('Error getting tracking history:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get tracking number - accessible by both seller and buyer
app.get('/getTrackingNumber', express.json(), async (req, res) => {
    try {
        const orderId = req.query.orderId;
        
        if (!orderId) {
            return res.status(400).json({
                success: false,
                trackingNumber: "",
                message: 'Order ID required'
            });
        }
        
        if (!orderContractInfo) {
            return res.status(400).json({
                success: false,
                trackingNumber: "",
                message: 'Order contract not available'
            });
        }
        
        try {
            // Call contract method to get tracking number from OrderContract
            const trackingNumber = await orderContractInfo.methods.getTrackingNumber(orderId).call({
                from: account
            });
            
            console.log('Tracking number retrieved for order', orderId, ':', trackingNumber);
            
            res.json({
                success: true,
                trackingNumber: trackingNumber || ""
            });
        } catch (contractError) {
            console.error('Contract call error:', contractError.message);
            
            // Return empty tracking number if order doesn't exist or not shipped yet
            res.json({
                success: false,
                trackingNumber: "",
                message: contractError.message || 'Tracking number not available'
            });
        }
    } catch (error) {
        console.error('Error getting tracking number:', error);
        res.status(500).json({
            success: false,
            trackingNumber: "",
            message: error.message || 'Could not retrieve tracking number'
        });
    }
});

// Update tracking number for an order
app.post('/updateTrackingNumber', express.json(), async (req, res) => {
    try {
        const { orderId, trackingNumber } = req.body;
        
        if (!orderId || !trackingNumber) {
            return res.status(400).json({
                success: false,
                message: 'Order ID and tracking number required'
            });
        }
        
        if (!orderContractInfo) {
            return res.status(400).json({
                success: false,
                message: 'Order contract not available'
            });
        }
        
        console.log('Updating tracking number for order:', orderId, 'Tracking:', trackingNumber);
        
        // Call contract method to update tracking number
        const tx = await orderContractInfo.methods.updateTrackingNumber(orderId, trackingNumber)
            .send({ from: account, gas: 500000 });
        
        console.log('Tracking number updated:', tx);
        
        res.json({
            success: true,
            message: 'Tracking number updated successfully',
            orderId: orderId,
            trackingNumber: trackingNumber,
            txHash: tx.transactionHash
        });
    } catch (error) {
        console.error('Error updating tracking number:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get full tracking info from OrderContract - accessible by both buyer and seller
app.get('/getFullTrackingInfo', express.json(), async (req, res) => {
    try {
        const orderId = req.query.orderId;
        
        if (!orderId || !orderContractInfo) {
            return res.status(400).json({
                success: false,
                message: 'Order ID required or contract not available'
            });
        }
        
        // Call contract method to get full tracking info
        const trackingInfo = await orderContractInfo.methods.getFullTrackingInfo(orderId).call({
            from: account
        });
        
        res.json({
            success: true,
            orderId: trackingInfo.orderId,
            productName: trackingInfo.productName,
            currentStatus: trackingInfo.currentStatus,
            history: trackingInfo.history
        });
    } catch (error) {
        console.error('Error getting full tracking info:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Only buyer or seller can view tracking information'
        });
    }
});
