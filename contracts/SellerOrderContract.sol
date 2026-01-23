// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SellerOrderContract {
    enum SellerOrderStatus { Pending, Accepted, Shipped, Delivered, Paid, Cancelled }
    
    string public companyName;
    uint public sellerOrderCount;
    address public contractOwner;

    constructor() {
        sellerOrderCount = 0;
        companyName = "LegiLah";
        contractOwner = msg.sender;
    }

    struct SellerOrder {
        uint orderId;
        address payable seller;
        address payable buyer;
        string buyerName;
        string productName;
        uint price;
        uint totalAmount;
        SellerOrderStatus status;
        uint timestamp;
        bool isAccepted;
        bool isShipped;
        bool isPaid;
        string trackingNumber;
    }

    struct SellerProfile {
        address seller;
        string sellerName;
        uint totalOrdersAccepted;
        uint totalOrdersShipped;
        uint totalEarnings;
        bool isActive;
    }

    struct PaymentRecord {
        uint orderId;
        uint amount;
        uint timestamp;
        bool isPaid;
    }

    mapping(uint => SellerOrder) public sellerOrders;
    mapping(address => SellerProfile) public sellerProfiles;
    mapping(address => uint[]) public sellerOrdersList;
    mapping(uint => PaymentRecord) public paymentRecords;
    mapping(address => uint) public sellerBalance;

    event SellerOrderCreated(uint orderId, address seller, address buyer, uint amount);
    event OrderAccepted(uint orderId, address seller);
    event OrderShipped(uint orderId, address seller, string trackingNumber);
    event PaymentReleased(uint orderId, address seller, uint amount);
    event SellerProfileCreated(address seller, string sellerName);

    // Create seller profile
    function createSellerProfile(string memory _sellerName) public {
        require(bytes(_sellerName).length > 0, "Seller name cannot be empty");
        require(!sellerProfiles[msg.sender].isActive, "Profile already exists");
        
        sellerProfiles[msg.sender] = SellerProfile({
            seller: msg.sender,
            sellerName: _sellerName,
            totalOrdersAccepted: 0,
            totalOrdersShipped: 0,
            totalEarnings: 0,
            isActive: true
        });
        
        emit SellerProfileCreated(msg.sender, _sellerName);
    }

    // Create a new seller order
    function createSellerOrder(
        address payable _seller,
        address payable _buyer,
        string memory _buyerName,
        string memory _productName,
        uint _price
    ) public returns (uint) {
        require(_seller != address(0), "Invalid seller address");
        require(_buyer != address(0), "Invalid buyer address");
        require(_price > 0, "Price must be greater than 0");
        require(sellerProfiles[_seller].isActive, "Seller profile not active");
        
        sellerOrderCount++;
        
        sellerOrders[sellerOrderCount] = SellerOrder({
            orderId: sellerOrderCount,
            seller: _seller,
            buyer: _buyer,
            buyerName: _buyerName,
            productName: _productName,
            price: _price,
            totalAmount: _price,
            status: SellerOrderStatus.Pending,
            timestamp: block.timestamp,
            isAccepted: false,
            isShipped: false,
            isPaid: false,
            trackingNumber: ""
        });
        
        sellerOrdersList[_seller].push(sellerOrderCount);
        
        emit SellerOrderCreated(sellerOrderCount, _seller, _buyer, _price);
        return sellerOrderCount;
    }

    // Seller accepts the order
    function acceptOrder(uint _orderId) public {
        require(_orderId > 0 && _orderId <= sellerOrderCount, "Invalid order ID");
        SellerOrder storage order = sellerOrders[_orderId];
        require(msg.sender == order.seller, "Only seller can accept the order");
        require(!order.isAccepted, "Order already accepted");
        require(order.status == SellerOrderStatus.Pending, "Order status must be Pending");
        
        order.isAccepted = true;
        order.status = SellerOrderStatus.Accepted;
        
        SellerProfile storage profile = sellerProfiles[msg.sender];
        profile.totalOrdersAccepted++;
        
        emit OrderAccepted(_orderId, msg.sender);
    }

    // Seller ships the order
    function shipOrder(uint _orderId, string memory _trackingNumber) public {
        require(_orderId > 0 && _orderId <= sellerOrderCount, "Invalid order ID");
        require(bytes(_trackingNumber).length > 0, "Tracking number cannot be empty");
        
        SellerOrder storage order = sellerOrders[_orderId];
        require(msg.sender == order.seller, "Only seller can ship the order");
        require(order.isAccepted, "Order must be accepted first");
        require(!order.isShipped, "Order already shipped");
        require(order.status == SellerOrderStatus.Accepted, "Order status must be Accepted");
        
        order.isShipped = true;
        order.trackingNumber = _trackingNumber;
        order.status = SellerOrderStatus.Shipped;
        
        SellerProfile storage profile = sellerProfiles[msg.sender];
        profile.totalOrdersShipped++;
        
        emit OrderShipped(_orderId, msg.sender, _trackingNumber);
    }

    // Release payment to seller after delivery confirmation
    function releasePayment(uint _orderId) public payable {
        require(_orderId > 0 && _orderId <= sellerOrderCount, "Invalid order ID");
        SellerOrder storage order = sellerOrders[_orderId];
        require(msg.sender == order.buyer, "Only buyer can release payment");
        require(order.isShipped, "Order must be shipped first");
        require(!order.isPaid, "Payment already released");
        require(msg.value >= order.totalAmount, "Insufficient payment amount");
        
        order.isPaid = true;
        order.status = SellerOrderStatus.Paid;
        
        // Transfer payment to seller
        sellerBalance[order.seller] += order.totalAmount;
        
        // Create payment record
        paymentRecords[_orderId] = PaymentRecord({
            orderId: _orderId,
            amount: order.totalAmount,
            timestamp: block.timestamp,
            isPaid: true
        });
        
        // Update seller profile
        SellerProfile storage profile = sellerProfiles[order.seller];
        profile.totalEarnings += order.totalAmount;
        
        emit PaymentReleased(_orderId, order.seller, order.totalAmount);
    }

    // Seller withdraws their balance
    function withdrawBalance() public {
        require(sellerBalance[msg.sender] > 0, "No balance to withdraw");
        uint amount = sellerBalance[msg.sender];
        sellerBalance[msg.sender] = 0;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Withdrawal failed");
    }

    // Cancel order (seller can cancel if not yet shipped)
    function cancelOrder(uint _orderId) public {
        require(_orderId > 0 && _orderId <= sellerOrderCount, "Invalid order ID");
        SellerOrder storage order = sellerOrders[_orderId];
        require(msg.sender == order.seller, "Only seller can cancel the order");
        require(!order.isShipped, "Cannot cancel a shipped order");
        
        order.status = SellerOrderStatus.Cancelled;
        
        emit OrderAccepted(_orderId, msg.sender);
    }

    // Get seller order details
    function getSellerOrder(uint _orderId) public view returns (SellerOrder memory) {
        require(_orderId > 0 && _orderId <= sellerOrderCount, "Invalid order ID");
        return sellerOrders[_orderId];
    }

    // Get seller profile
    function getSellerProfile(address _seller) public view returns (SellerProfile memory) {
        return sellerProfiles[_seller];
    }

    // Get seller's orders
    function getSellerOrders(address _seller) public view returns (uint[] memory) {
        return sellerOrdersList[_seller];
    }

    // Get seller balance
    function getSellerBalance(address _seller) public view returns (uint) {
        return sellerBalance[_seller];
    }

    // Get order count
    function getSellerOrderCount() public view returns (uint) {
        return sellerOrderCount;
    }
}
