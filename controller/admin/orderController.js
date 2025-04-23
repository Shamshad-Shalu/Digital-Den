const Order = require("../../model/orderSchema");
const User = require("../../model/userSchema");
const ReturnRequest = require("../../model/returnRequestModel");
const Product = require("../../model/productSchema");
const { sendEmail } = require('../../utils/email');
const { generateCustomId } = require("../../utils/helper");
const Wallet = require("../../model/walletSchema");

// Get All Orders
const getAllOrders = async (req, res) => {
  try {
    const { search = '', orderStatus = 'All', paymentStatus = 'All', dateRange = 'All', page = 1 } = req.query;
    const limit = 5;

    let query = {};
    if (search) {
      const users = await User.find({ username: { $regex: search.trim(), $options: 'i' } });
      const userIds = users.map(user => user._id);
      query.$or = [
        { orderId: { $regex: search.trim(), $options: 'i' } },
        { userId: { $in: userIds } },
      ];
    }
    if (orderStatus !== 'All') query.status = orderStatus;
    if (paymentStatus !== 'All') query.paymentStatus = paymentStatus;

    const now = new Date();
    if (dateRange !== 'All') {
      let startDate;
      switch (dateRange) {
        case 'Today': startDate = new Date(now.setHours(0, 0, 0, 0)); break;
        case 'Yesterday': startDate = new Date(now.setHours(0, 0, 0, 0)); startDate.setDate(startDate.getDate() - 1); break;
        case 'Last7Days': startDate = new Date(now.setHours(0, 0, 0, 0)); startDate.setDate(startDate.getDate() - 7); break;
        case 'Last30Days': startDate = new Date(now.setHours(0, 0, 0, 0)); startDate.setDate(startDate.getDate() - 30); break;
        case 'ThisMonth': startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
        case 'LastMonth': startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1); break;
        default: startDate = null;
      }
      if (startDate) {
        query.createdAt = { $gte: startDate };
        if (dateRange === 'Yesterday') query.createdAt.$lt = new Date(startDate).setHours(23, 59, 59, 999);
      }
    }

    const totalOrders = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('userId', 'username email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const ordersWithDetails = orders.map(order => ({
      ...order.toObject(),
      customer: { name: order.userId?.username || 'N/A', email: order.userId?.email || 'N/A' },
    }));

    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.json({ orders: ordersWithDetails, page: parseInt(page), limit, count: totalOrders });
    }

    res.render('admin/orders', {
      orders: ordersWithDetails,
      page: parseInt(page),
      limit,
      count: totalOrders,
      search,
      orderStatus,
      paymentStatus,
      dateRange,
    });
  } catch (error) {
    console.error('Error in getAllOrders:', error);
    res.status(500).render('error', { message: 'Error fetching orders' });
  }
};

// Update Order Status
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findOne({ orderId }).populate('orderedItems.product');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const validTransitions = {
      'Pending': ['Processing', 'Cancelled'],
      'Processing': ['Shipped', 'Cancelled'],
      'Shipped': ['Out for Delivery', 'Cancelled'],
      'Out for Delivery': ['Delivered'],
      'Delivered': ['Return Request'],
      'Return Request': ['Delivered', 'Returned'],
      'Returned': [],
      'Cancelled': [],
    };

    if (!validTransitions[order.status]?.includes(status)) {
      return res.status(400).json({ success: false, message: `Cannot change status from ${order.status} to ${status}` });
    }

    if (status === 'Cancelled' && !order.isCanceled) {
      order.cancellation = {
        reason: req.body.reason || 'Admin cancellation',
        canceledBy: req.user?._id,
        canceledAt: new Date(),
      };
      order.isCanceled = true;
    }

    if (['Cancelled', 'Returned'].includes(status) && !order.isCanceled && order.status !== 'Returned') {
      for (const item of order.orderedItems) {
        const product = await Product.findById(item.product._id);
        if (product) {
          product.quantity += item.quantity;
          await product.save();
        }
      }
    }

    order.status = status;
    if (status === 'Delivered') order.paymentStatus = 'Paid';
    else if (status === 'Cancelled') order.paymentStatus = 'Failed';
    else if (status === 'Returned') order.paymentStatus = 'Refunded';
    order.updatedAt = new Date();

    await order.save();
    res.json({ success: true, message: `Order status updated to ${status}` });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get Order Details
const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId })
      .populate('userId', 'username email phone createdAt orderHistory')
      .populate('orderedItems.product', 'productName sku');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (!order.userId) return res.status(500).json({ success: false, message: 'User data missing' });

    res.json(
      {
        success: true,
        order: order.toObject(),
      });
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch order details' });
  }
};

const processReturnRequest = async (req, res) => {
  try {
    const { returnId } = req.params;
    const { returnStatus } = req.body;

    const returnRequest = await ReturnRequest.findOne({ orderId: returnId }).populate({
      path: 'orderId',
      populate: [
        { path: 'userId', select: 'email username' },
        { path: 'orderedItems.product', select: 'productName quantity' },
        {path: 'appliedCoupon'}
      ],
    });

    if (!returnRequest) return res.status(404).json({ success: false, message: 'Return request not found' });

    const order = returnRequest.orderId;

    // Update return request status
    returnRequest.status = returnStatus === 'approved' ? 'Approved' : returnStatus === 'rejected' ? 'Rejected' : 'Pending';
    await returnRequest.save();

    if (returnStatus === 'approved') {
      
      // Find or create the user's wallet
      let wallet = await Wallet.findOne({ userId: order.userId._id });
      if (!wallet) {
        wallet = new Wallet({
          userId: order.userId._id,
          balance: 0,
          currency: 'INR',
        });
      }
      let refundAmount = 0 ;

      const refundItems = order.orderedItems.filter(item =>
        returnRequest.itemIds.length === 0 || returnRequest.itemIds.includes(item._id.toString())
      );

      const totalOrderItemAmount = order.orderedItems.reduce((sum, item) => sum + item.totalAmount, 0);
      const itemsTotal = refundItems.reduce((sum, item) => sum + item.totalAmount, 0);

      let coupon = 0;
      const appliedCoupon = order.appliedCoupon;

      // Subtotal after this return
      const remainingItems = order.orderedItems.filter(item => 
        !returnRequest.itemIds.includes(item._id.toString())
      );
      const remainingTotal = remainingItems.reduce((sum, item) => sum + item.totalAmount, 0);

      if( appliedCoupon && remainingTotal < appliedCoupon.minPurchase){
        coupon = order.couponDiscount;
      }

      let shipping = 0;
      if (totalOrderItemAmount >= 500 && (remainingTotal < 500)) {
        shipping = 50;
      }

      const tax = (itemsTotal / (totalOrderItemAmount - coupon) ) * order.tax;
      refundAmount = itemsTotal + tax - coupon - shipping; 

      refundAmount = Math.round(refundAmount);

      returnRequest.refundAmount = refundAmount;
      await returnRequest.save();

      // wallet update 
      wallet.balance += refundAmount ;
      wallet.transactions.push({
        transactionId: generateCustomId("RFD"),
        amount:refundAmount,
        type: 'Credit',
        status:'Completed',
        method: 'Refund',
        description: `Refund for items in order #${order.orderId}`,
      });
      await wallet.save();

      // product  update
      for (const item of refundItems) {
          const product = await Product.findById(item.product._id);
          if (product) {
            product.quantity += item.quantity;
            await product.save();
          }
          item.returnStatus = 'Returned';
      }

      order.refundAmount =  refundAmount;
      order.revokedCoupon = coupon;
       // Update status
       order.paymentStatus = 'Refunded';
       order.status = 'Returned';

    } else if (returnStatus === 'rejected') {
      order.status = 'Delivered';
      for (const item of refundItems) {
        item.returnStatus = 'Not Returned';
      }
    }

    await order.save();

    // Send email notification
    if (returnStatus === 'approved') {
      await sendEmail({
        to: order.userId.email,
        subject: 'Return Request Approved',
        html: `<p>Dear ${order.userId.username}, your return request for order #${order.orderId} has been approved. ₹${order.finalAmount.toLocaleString('en-IN')} has been credited to your wallet.</p>`,
      });
    } else if (returnStatus === 'rejected') {
      await sendEmail({
        to: order.userId.email,
        subject: 'Return Request Rejected',
        html: `<p>Dear ${order.userId.username}, your return request for order #${order.orderId} has been rejected.</p>`,
      });
    }

    res.json({ success: true, message: `Return request ${returnStatus} successfully` });
  } catch (error) {
    console.error('Error processing return request:', error);
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
};

module.exports = {
  getAllOrders,
  updateOrderStatus,
  getOrderDetails,
  processReturnRequest,
};

