# Quick Start Guide - LegiLah E-Commerce

## Prerequisites Checklist
- [ ] Node.js installed
- [ ] MetaMask browser extension installed
- [ ] Ganache installed (or Ganache CLI)

## Setup Steps (5 minutes)

### 1. Start Ganache
```bash
ganache -p 7545
```
**Leave this terminal running!**

### 2. Run Setup Script (Windows)
```bash
setup.bat
```

Or manually:
```bash
truffle compile
truffle migrate --reset
copy build\contracts\OrderContract.json ca2App\public\build\
copy build\contracts\Migrations.json ca2App\public\build\
```

### 3. Configure MetaMask

**Add Ganache Network:**
- Network Name: `Ganache Local`
- RPC URL: `http://127.0.0.1:7545`
- Chain ID: `1337`
- Currency: `ETH`

**Import Account:**
- Copy any private key from Ganache
- MetaMask → Import Account → Paste private key

### 4. Start Application
```bash
cd ca2App
node app.js
```

### 5. Open Browser
Navigate to: http://localhost:3001

## Application Flow

```
1. /buy → Connect MetaMask → Buy Product
   ↓
2. /ordertrack → View Order Summary
   ↓
3. /orderdetails → See Tracking Timeline
   ↓
4. /confirm → Confirm Delivery
```

## Test Scenario

1. **Buy Page**: Click "Connect MetaMask" → Approve connection → Click "Buy" → Confirm transaction
2. **Wait**: Transaction will be mined (few seconds)
3. **Track**: You'll be redirected to order tracking page
4. **View Details**: Click "Details" to see timeline
5. **Confirm**: Navigate to confirm page and confirm delivery

## Common Issues

**"Contract not found"**
- Run `truffle migrate --reset`
- Copy contract files again

**"Insufficient funds"**
- Import Ganache account with ETH

**"Wrong network"**
- Switch MetaMask to Ganache Local

**"Transaction failed"**
- Check Ganache is running
- Check gas settings in MetaMask

## Contract Addresses

After running `truffle migrate`, note the deployed addresses:
- OrderContract: Check Ganache transactions or `build/contracts/OrderContract.json`

## Default Product

- **Name**: One Piece The Monsters
- **Price**: $150 (in ETH)
- Can be customized in `ca2App/app.js`

## Ports

- Ganache: `7545`
- Web Server: `3001`
- Make sure these ports are available

## Next Steps

- Add product image: Place image at `ca2App/public/images/onepiece.jpg`
- Customize product: Edit `sampleProduct` in `ca2App/app.js`
- Test full flow: Complete a purchase and delivery confirmation

## Support

Check the main README.md for detailed documentation and troubleshooting.
