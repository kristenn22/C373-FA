// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract OrderContract {
    enum OrderStatus { Pending, Processing, Shipped, Delivered, Confirmed }
    
    string public companyName;
    uint public orderCount;
    address payable public owner;

    constructor() {
        orderCount = 0;
        companyName = "LegiLah";
        owner = payable(msg.sender);
    }

    struct Product {
        string name;
        uint price;
        string imageUrl;
        string description;
    }

    struct Order {
        uint orderId;
        address payable buyer;
        address payable seller;
        string buyerName;
        string deliveryAddress;
        Product product;
        uint totalAmount;
        OrderStatus status;
        uint timestamp;
        bool isPaid;
        bool isReleased;
    }

    struct TrackingUpdate {
        string status;
        string description;
        uint timestamp;
    }

    mapping(uint => Order) public orders;
    mapping(uint => TrackingUpdate[]) public trackingHistory;
    mapping(address => uint[]) public userOrders;

    event OrderCreated(uint orderId, address buyer, uint amount);
    event OrderPaid(uint orderId, address buyer, uint amount);
    event OrderStatusUpdated(uint orderId, OrderStatus status);
    event DeliveryConfirmed(uint orderId, address buyer);

    // Create a new order
    function createOrder(
        string memory _buyerName,
        string memory _deliveryAddress,
        string memory _productName,
        uint _price,
        string memory _imageUrl,
        string memory _description
    ) public returns (uint) {
        orderCount++;
        
        Product memory newProduct = Product({
            name: _productName,
            price: _price,
            imageUrl: _imageUrl,
            description: _description
        });
        
        orders[orderCount] = Order({
            orderId: orderCount,
            buyer: payable(msg.sender),
            seller: owner,
            buyerName: _buyerName,
            deliveryAddress: _deliveryAddress,
            product: newProduct,
            totalAmount: _price,
            status: OrderStatus.Pending,
            timestamp: block.timestamp,
            isPaid: false,
            isReleased: false
        });
        
        userOrders[msg.sender].push(orderCount);
        
        // Add initial tracking
        trackingHistory[orderCount].push(TrackingUpdate({
            status: "Order Created",
            description: "Your order has been created",
            timestamp: block.timestamp
        }));
        
        emit OrderCreated(orderCount, msg.sender, _price);
        return orderCount;
    }

    // Pay for order
    function payForOrder(uint _orderId) public payable {
        require(_orderId > 0 && _orderId <= orderCount, "Invalid order ID");
        Order storage order = orders[_orderId];
        require(msg.sender == order.buyer, "Only buyer can pay");
        require(!order.isPaid, "Order already paid");
        require(msg.value >= order.totalAmount, "Insufficient payment");
        
        order.isPaid = true;
        order.status = OrderStatus.Processing;
        
        trackingHistory[_orderId].push(TrackingUpdate({
            status: "Payment Received",
            description: "Payment has been received and order is being processed",
            timestamp: block.timestamp
        }));
        
        emit OrderPaid(_orderId, msg.sender, msg.value);
        emit OrderStatusUpdated(_orderId, OrderStatus.Processing);
    }

    // Update order status (only contract owner or authorized parties)
    function updateOrderStatus(uint _orderId, OrderStatus _status, string memory _description) public {
        require(_orderId > 0 && _orderId <= orderCount, "Invalid order ID");
        Order storage order = orders[_orderId];
        
        order.status = _status;
        
        string memory statusText;
        if (_status == OrderStatus.Processing) {
            statusText = "Processing";
        } else if (_status == OrderStatus.Shipped) {
            statusText = "Shipped";
        } else if (_status == OrderStatus.Delivered) {
            statusText = "Delivered";
        } else if (_status == OrderStatus.Confirmed) {
            statusText = "Confirmed";
        }
        
        trackingHistory[_orderId].push(TrackingUpdate({
            status: statusText,
            description: _description,
            timestamp: block.timestamp
        }));
        
        emit OrderStatusUpdated(_orderId, _status);
    }

    // Confirm delivery by buyer
    function confirmDelivery(uint _orderId, bool _received) public {
        require(_orderId > 0 && _orderId <= orderCount, "Invalid order ID");
        Order storage order = orders[_orderId];
        require(msg.sender == order.buyer, "Only buyer can confirm delivery");
        require(order.status == OrderStatus.Delivered, "Order not yet delivered");
        
        if (_received) {
            order.status = OrderStatus.Confirmed;
            
            trackingHistory[_orderId].push(TrackingUpdate({
                status: "Confirmed",
                description: "Delivery confirmed by customer",
                timestamp: block.timestamp
            }));

            // Release payment to seller only after buyer confirms delivery
            if (order.isPaid && !order.isReleased && order.totalAmount > 0) {
                order.isReleased = true;
                (bool success, ) = order.seller.call{value: order.totalAmount}("");
                require(success, "Payment release failed");
            }
            
            emit DeliveryConfirmed(_orderId, msg.sender);
        } else {
            trackingHistory[_orderId].push(TrackingUpdate({
                status: "Refund Requested",
                description: "Customer reported item not received",
                timestamp: block.timestamp
            }));
        }
    }

    // Get order details
    function getOrder(uint _orderId) public view returns (
        uint orderId,
        address buyer,
        address seller,
        string memory buyerName,
        string memory productName,
        uint price,
        string memory imageUrl,
        uint totalAmount,
        OrderStatus status,
        uint timestamp,
        bool isPaid,
        bool isReleased
    ) {
        require(_orderId > 0 && _orderId <= orderCount, "Invalid order ID");
        Order memory order = orders[_orderId];
        
        return (
            order.orderId,
            order.buyer,
            order.seller,
            order.buyerName,
            order.product.name,
            order.product.price,
            order.product.imageUrl,
            order.totalAmount,
            order.status,
            order.timestamp,
            order.isPaid,
            order.isReleased
        );
    }

    // Get tracking history
    function getTrackingHistory(uint _orderId) public view returns (TrackingUpdate[] memory) {
        require(_orderId > 0 && _orderId <= orderCount, "Invalid order ID");
        return trackingHistory[_orderId];
    }

    // Get user's orders
    function getUserOrders(address _user) public view returns (uint[] memory) {
        return userOrders[_user];
    }

    // Get order count
    function getOrderCount() public view returns (uint) {
        return orderCount;
    }
}
