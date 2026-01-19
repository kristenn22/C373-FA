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
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

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

// Sample product data
const sampleProduct = {
    name: "One Piece The Monsters",
    price: 150,
    imageUrl: "/images/onepiece.jpg",
    description: "Limited edition collectible"
};

// Define routes - home page
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

// Order tracker page
app.get('/ordertrack', async(req, res) => {
    const orderId = req.query.orderId || 1;
    
    try {
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

// Order details page
app.get('/orderdetails', async(req, res) => {
    const orderId = req.query.orderId || 1;
    
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

// Confirm delivery page
app.get('/confirm', async(req, res) => {
    const orderId = req.query.orderId || 1;
    
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
