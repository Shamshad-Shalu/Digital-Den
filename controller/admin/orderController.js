const Order = require("../../model/orderSchema");
const User = require("../../model/userSchema");
const ReturnRequest = require("../../model/returnRequestModel");
const Product = require("../../model/productSchema");
const Coupon = require("../../model/couponSchema");
const { sendstatusUpdateMail } = require("../../utils/userEmails");
const { generateCustomId } = require("../../utils/helper");
const Wallet = require("../../model/walletSchema");

// Get All Orders
const getAllOrders = async (req, res) => {
  try {
    const {
      search = "",
      orderStatus = "All",
      paymentStatus = "All",
      dateRange = "All",
      page = 1,
    } = req.query;
    const limit = 5;

    let query = {};
    if (search) {
      const users = await User.find({
        username: { $regex: search.trim(), $options: "i" },
      });
      const userIds = users.map((user) => user._id);
      
      query.$or = [
        { orderId: { $regex: search.trim(), $options: "i" } },
        { userId: { $in: userIds } },
      ];
    }
    if (orderStatus !== "All") query.status = orderStatus;
    if (paymentStatus !== "All") query.paymentStatus = paymentStatus;

    const now = new Date();
    if (dateRange !== "All") {
      let startDate;
      switch (dateRange) {
        case "Today":
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case "Yesterday":
          startDate = new Date(now.setHours(0, 0, 0, 0));
          startDate.setDate(startDate.getDate() - 1);
          break;
        case "Last7Days":
          startDate = new Date(now.setHours(0, 0, 0, 0));
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "Last30Days":
          startDate = new Date(now.setHours(0, 0, 0, 0));
          startDate.setDate(startDate.getDate() - 30);
          break;
        case "ThisMonth":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "LastMonth":
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          break;
        default:
          startDate = null;
      }
      if (startDate) {
        query.createdAt = { $gte: startDate };
        if (dateRange === "Yesterday")
          query.createdAt.$lt = new Date(startDate).setHours(23, 59, 59, 999);
      }
    }

    const totalOrders = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate("userId", "username email")
      .sort({ createdAt: -1 })   
      .skip((page - 1) * limit)   
      .limit(limit);

    const ordersWithDetails = orders.map((order) => ({
      ...order.toObject(),
      customer: {
        name: order.userId?.username || "N/A",
        email: order.userId?.email || "N/A",
      },
    }));

    if (req.headers["x-requested-with"] === "XMLHttpRequest") {
      return res.json({
        orders: ordersWithDetails,
        page: parseInt(page),
        limit,
        count: totalOrders,
      });
    }

    res.render("admin/orders", {
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
    console.error("Error in getAllOrders:", error);
    res.status(500).render("error", { message: "Error fetching orders" });
  }
};

// Update Order Status
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findOne({ orderId })
       .populate("orderedItems.product");

    if (!order){
      return res.status(404).json({ success: false, message: "Order not found" });

    }
    
    const validTransitions = {
      Pending: ["Processing", "Cancelled"],
      Processing: ["Shipped", "Cancelled"],
      Shipped: ["Out for Delivery", "Cancelled"],
      "Out for Delivery": ["Delivered"],
      Delivered: ["Return Request"],
      "Return Request": ["Delivered", "Returned"],
      Returned: [],
      Cancelled: [],
    };

    const currentStatus = order.status.trim();
    const newStatus = status.trim();

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${currentStatus} to ${newStatus}`,
      });
    }

    if (newStatus === "Cancelled" && !order.isCanceled) {
      order.cancellation = {
        reason: req.body.reason || "Admin cancellation",
        canceledBy: req.user?._id,
        canceledAt: new Date(),
      };

      if (order.paymentStatus === "Paid") {
          let wallet = await Wallet.findOne({ userId: order.userId });
          if (!wallet) {
            wallet = new Wallet({
              userId: order.userId,
              balance: 0,
            });
            await wallet.save();
          }

          const refundAmount = order.finalAmount;
          wallet.balance += refundAmount;

          wallet.transactions.push({
            transactionId: generateCustomId("RFD"),
            amount: refundAmount,
            type: "Credit",
            status: "Completed",
            method: "Refund",
            description: `Refund for cancelled order #${order.orderId}`,
            orderId: order._id,
            date: Date.now(),
          });
          wallet.lastUpdated = new Date();
          await wallet.save();
          order.paymentStatus = "Refunded";
      }

      order.isCanceled = true;
      order.refundAmount = order.finalAmount;
      order.returnTax = order.tax;
      order.revokedCoupon = order.couponDiscount;

      // If a coupon was applied, remove user
      if (order.appliedCoupon) {
        await Coupon.updateOne(
          { _id: order.appliedCoupon._id },
          { $pull: { usersUsed: order.userId } }
        );
      }


      for (const item of order.orderedItems) {
        item.returnStatus = "Cancelled";
        item.returnReason =  "Admin cancellation";
        
        const product = await Product.findOne({ _id: item.product._id });
        if (product) {
          product.quantity += item.quantity;
          await product.save();
        }
      }

    }

    order.status = newStatus;
    if (newStatus === "Delivered") order.paymentStatus = "Paid";
    else if (newStatus === "Cancelled" && order.paymentStatus !== "Refunded")
      order.paymentStatus = "Failed";
    order.updatedAt = new Date();

    await order.save();
    res.json({ success: true, message: `Order status updated to ${status}` });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get Order Details
const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId })
      .populate("userId", "username email phone createdAt orderHistory")
      .populate("orderedItems.product", "productName sku");

    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    if (!order.userId)
      return res
        .status(500)
        .json({ success: false, message: "User data missing" });

    res.json({
      success: true,
      order: order.toObject(),
    });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch order details" });
  }
};

const processReturnRequest = async (req, res) => {
  try {
    const { returnId } = req.params;
    const { returnStatus } = req.body;

    // Fetch return request
    const returnRequest = await ReturnRequest.findOne({ orderId: returnId ,status:"Pending"}).populate({
      path: "orderId",
      populate: [
        { path: "userId", select: "email username" },
        { path: "orderedItems.product", select: "productName quantity" },
        { path: "appliedCoupon" },
      ], 
    }); 

    if (!returnRequest) {
      return res.status(404).json({ success: false, message: "Return request not found" });
    };
    const order = returnRequest.orderId;

    returnRequest.status =
      returnStatus === "approved" ? "Approved" :
      returnStatus === "rejected" ? "Rejected" : "Pending";
    await returnRequest.save();

    // refund and remaining items
    const refundItems = order.orderedItems.filter(
      (item) => returnRequest.itemIds.length === 0 || returnRequest.itemIds.includes(item._id.toString())
    ); 

    const remainingItems = order.orderedItems.filter(
      (item) => !returnRequest.itemIds.includes(item._id.toString())
    );

    const totalAmount = order.totalPrice - order.discount; 
    const refundItemAmount = refundItems.reduce((sum, item) => sum + item.totalAmount, 0); 
    const remainingTotal = remainingItems
      .filter((item) => item.returnStatus === "Not Returned")
      .reduce((sum, item) => sum + item.totalAmount, 0); 

    let refundAmount = 0;
    let returnTax = 0;
    const appliedCoupon = order.appliedCoupon;

    let shipping = (totalAmount >= 500 && remainingTotal < 500 && remainingTotal > 0 ) ? 50 : 0 ;
   
    let coupon  = order.couponDiscount;

    const remainingItemcoupon = remainingTotal * (coupon / totalAmount);
    const remainingItemTax = (remainingTotal - remainingItemcoupon ) * 0.18;
    const refundItemcoupon = refundItemAmount * (coupon / totalAmount);
    const refundItemTax = (refundItemAmount - ( refundItemAmount * coupon / totalAmount))* 0.18;

    // Calculate tax refund
    let remainingTax = 0;    
    let couponAdjustment = 0; 

    if (appliedCoupon && remainingTotal < appliedCoupon.minPurchase) {
        remainingTax = remainingTotal * 0.18; 
        couponAdjustment = (remainingItemcoupon + remainingItemcoupon * 0.18);
    } else {
        remainingTax =  remainingItemTax
    };
    
    returnTax = order.tax - remainingTax;  

    const totalRemainingTotal = remainingTotal - remainingItemcoupon + remainingTax + couponAdjustment;
    refundAmount =  order.finalAmount - ( totalRemainingTotal + shipping + order.refundAmount ) 

    // Update order 
    if (returnStatus === "approved") {
        const wallet = await Wallet.findOneAndUpdate(
          { userId: order.userId._id },
          {
            $setOnInsert: {
              userId: order.userId,
            },
            $inc: { balance: refundAmount },
            $push: {
              transactions: {
                transactionId: generateCustomId("RFD"),
                amount: refundAmount,
                type: "Credit",
                status: "Completed",
                method: "Refund",
                description: `Refund for order #${order.orderId}`,
                orderId: order._id,
                date: Date.now(),
              },
            },
            $set: { lastUpdated: new Date() },
          },
          { upsert: true, new: true }
        );

         for (const item of refundItems) {
            item.returnStatus = "Returned";
            const product = await Product.findOne({_id:item.product._id});
            product.quantity += item.quantity;
            await product.save();
        };


        // Update order fields
        order.refundAmount += refundAmount;
        order.returnTax = returnTax;
        order.revokedCoupon = coupon;
        order.paymentStatus = "Refunded";
        order.status = remainingTotal === 0 ? "Returned" : "Partially Returned";

    } else if (returnStatus === "rejected") {
        refundItems.forEach(item => item.returnStatus = "Not Returned");
        const alreadyReturned = order.orderedItems.some(item => item.returnStatus === "Returned");
        if (alreadyReturned) {
            order.status = "Partially Returned";
        } else {
            order.status = "Delivered";
        }
    }

    await order.save();

     // Send email notification 
    if (returnStatus === "approved" || returnStatus === "rejected") {
      await sendstatusUpdateMail(returnStatus, order);
    }

    res.json({success: true,message: `Return request ${returnStatus} successfully`,});
    
  } catch (error) {
    console.error("Error processing return request:", error);
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
};


module.exports = {
  getAllOrders,
  updateOrderStatus,
  getOrderDetails,
  processReturnRequest,
};
