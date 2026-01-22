const express = require('express');
const {Web3} = require('web3');
const fs = require("fs");
const path = require('path');

//Set up view engine from ejs library
const app = express();
//Set up view engine
app.set('view engine', 'ejs');
//This line of code tells Express to serve static files
app.use(express.static('public'))
//enable form processing
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

//start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    // Initialize Web3 and load blockchain data on startup
    try {
        await loadWeb3();
        await loadBlockchainData();
    } catch (error) {
        console.warn('Note: Ganache may not be running. Please start Ganache on port 7545');
    }
});

// Load contract ABI and full contract data
let contractABI = [];
let contractData = null;
try {
    const contractPath = path.join(__dirname, 'public', 'build', 'OrderContract.json');
    if (fs.existsSync(contractPath)) {
        contractData = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
        contractABI = contractData.abi;
    }
} catch (error) {
    console.warn('Warning: Could not load contract ABI:', error.message);
}

// declare the global variables
var account = '';
var orderCount = 0;
var loading = true;
var GanacheWeb3;
var contractInfo;
var listOfProducts = [];
var listOfProducts = [];
var noOfProducts = 0;

// Initialize Web3 connection to Ganache
async function loadWeb3() {
    try {
        GanacheWeb3 = new Web3("http://127.0.0.1:7545");
        console.log('Web3 connected to Ganache at http://127.0.0.1:7545');
    } catch (error) {
        console.error('Error connecting to Ganache:', error);
    }
}

// Load blockchain data
async function loadBlockchainData() {
    try {
        loading = true;
        const web3 = GanacheWeb3;
        
        // Load account from the blockchain
        const accounts = await web3.eth.getAccounts();
        account = accounts[0];
        console.log('Loaded account:', account);
        
        // Get network ID
        const networkId = await web3.eth.net.getId();
        console.log('Network ID:', networkId);
        
        // Read network data
        const networkData = contractData.networks[networkId];
        
        if (!networkData) {
            throw new Error('Order contract not deployed to detected network');
        }
        
        // Initialize the contract
        contractInfo = new web3.eth.Contract(contractABI, networkData.address);
        console.log('Contract initialized at:', networkData.address);
        
        // Get order count from contract
        const cnt = await contractInfo.methods.getOrderCount().call();
        noOfProducts = cnt;
        console.log(`Order count from blockchain: ${cnt.toString()}`);
        
        loading = false;
        return {
            account,
            contractInfo,
            orderCount
        };
    } catch (error) {
        console.error('Error loading blockchain data:', error);
        loading = false;
        throw error;
    }
}

// Sample product data
const sampleProduct = {
    name: "One Piece The Monsters",
    price: 150,
    imageUrl: "/images/onepiece.jpg",
    description: "Limited edition collectible"
};

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
        res.render('login', {
            acct: account,
            loading: false,
            productData: null
        });
    } catch (error) {
        console.error('Error in login route:', error);
        res.status(500).send('Server error');
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
            product: sampleProduct,
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
        res.render('buy', {
            product: sampleProduct,
            acct: account,
            loading: loading,
            contractABI: JSON.stringify(contractABI),
            contractData: JSON.stringify(contractData)
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
        res.render('ordertrack', {
            orderId: orderId,
            product: sampleProduct,
            acct: account,
            loading: loading,
            contractABI: JSON.stringify(contractABI),
            contractData: JSON.stringify(contractData)
        });
    } catch (error) {
        console.error('Error in ordertrack route:', error);
        res.status(500).send('Server error');
    }
});

// Order Details (with path parameter)
app.get('/orderdetails/:orderId', async(req, res) => {
    try {
        res.render('orderdetails', {
            orderId: req.params.orderId,
            product: sampleProduct,
            acct: account,
            loading: loading,
            contractABI: JSON.stringify(contractABI),
            contractData: JSON.stringify(contractData)
        });
    } catch (error) {
        console.error('Error in orderdetails route:', error);
        res.status(500).send('Server error');
    }
});

// Order Details (with query parameter)
app.get('/orderdetails', async(req, res) => {
    const orderId = req.query.orderId || '';
    
    try {
        res.render('orderdetails', {
            orderId: orderId,
            product: sampleProduct,
            acct: account,
            loading: loading,
            contractABI: JSON.stringify(contractABI),
            contractData: JSON.stringify(contractData)
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
    
    try {
        res.render('confirm', {
            orderId: orderId,
            product: sampleProduct,
            acct: account,
            loading: loading,
            contractABI: JSON.stringify(contractABI),
            contractData: JSON.stringify(contractData)
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
