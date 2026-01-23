const express = require('express');
const {Web3} = require('web3');
const fs = require("fs");
const path = require('path');

// Load contract files
const OrderContract = require('./public/build/OrderContract.json');
const SellerOrderContract = require('./public/build/SellerOrderContract.json');

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
var userCart = {}; // Store cart items with account as key
var loggedInUsers = {}; // Track logged in users

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
    const isLoggedIn = isUserLoggedIn(account);
    return {
        acct: account,
        loading: loading,
        isLoggedIn: isLoggedIn
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

// Login page
app.get('/login', async(req, res) => {
    try {
        res.render('login', getCommonData(req));
    } catch (error) {
        console.error('Error in login route:', error);
        res.status(500).send('Server error');
    }
});

// Handle login POST - mark user as logged in
app.post('/login', express.json(), async(req, res) => {
    try {
        const userAccount = account;
        loggedInUsers[userAccount] = true;
        console.log('User logged in:', userAccount);
        
        res.json({
            success: true,
            message: 'Logged in successfully',
            isLoggedIn: true
        });
    } catch (error) {
        console.error('Error in login route:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Handle logout
app.post('/logout', express.json(), async(req, res) => {
    try {
        const userAccount = account;
        delete loggedInUsers[userAccount];
        console.log('User logged out:', userAccount);
        
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

// Register page
app.get('/register', async(req, res) => {
    try {
        res.render('regsiter', {
            acct: account,
            loading: loading
        });
    } catch (error) {
        console.error('Error in register route:', error);
        res.status(500).send('Server error');
    }
});

// Product page
app.get('/products', async(req, res) => {
    try {
        res.render('products', {
            acct: account,
            loading: loading
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
        
        console.log('Item added to cart:', cartItem);
        
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
        
        console.log('Cart items for', userAccount, ':', cartItems);
        
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
