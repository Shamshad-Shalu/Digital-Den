const Order = require("../../model/orderSchema");
const User = require("../../model/userSchema");
const ReturnRequest = require("../../model/returnRequestModel");
const Product = require("../../model/productSchema");

// Get All Orders
const getAllOrders = async (req, res) => {
  try {
    const search = req.query.search || "";
    const orderStatus = req.query.orderStatus || "All";
    const paymentStatus = req.query.paymentStatus || "All";
    const dateRange = req.query.dateRange || "All";
    const page = parseInt(req.query.page) || 1;
    const limit = 5;

    let query = {};

    // Search by order ID or username 
    if (search) {
      const users = await User.find({
        username: { $regex: search.trim(), $options: "i" },
      });
      const userIds = users.map((user) => user._id);
      query.$or = [
        { orderId: { $regex: search.trim(), $options: "i" } },
        {username: { $regex: search.trim(), $options: "i" } },
        { userId: { $in: userIds } },
      ];
    }

    // Filter by order status
    if (orderStatus !== "All") {
      query.status = orderStatus;
    }

    // Filter by payment status
    if (paymentStatus !== "All") {
      query.paymentStatus = paymentStatus;
    }

    // Filter by date range
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
        if (dateRange === "Yesterday") {
          query.createdAt.$lt = new Date(startDate).setHours(23, 59, 59, 999);
        }
      }
    }

    // Fetch total orders for pagination
    const totalOrders = await Order.countDocuments(query);

  
    const orders = await Order.find(query)
      .populate("userId", "username email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Map orders to  customer details
    const ordersWithDetails = orders.map((order) => {
      return {
        ...order.toObject(),
        customer: {
          name: order.userId.username,
          email: order.userId.email,
        },
      };
    });

    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
        return res.json({
            orders: ordersWithDetails,
            page,
            limit,
            count: totalOrders,
        });
    }

    // Render the orders page
    res.render("admin/orders", {
      orders: ordersWithDetails,
      page,
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

    const order = await Order.findOne({ orderId }).populate("orderedItems.product");
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Validate status transition
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

    if (!validTransitions[order.status].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${order.status} to ${status}`,
      });
    }

    // Update inventory if order is cancelled or returned
    if (["Cancelled", "Returned"].includes(status)) {
      for (const item of order.orderedItems) {
        const product = await Product.findById(item.product._id);
        product.quantity += item.quantity;
        await product.save();
      }
    }

    // Update order status
    order.status = status;
    if (status === "Delivered") {
      order.paymentStatus = "Paid";
    } else if (status === "Cancelled") {
      order.paymentStatus = "Failed";
    } else if (status === "Returned") {
      order.paymentStatus = "Refunded";
    }
    order.updatedAt = new Date();

    // Add note
    order.notes = order.notes || [];
    order.notes.push({
      author: "Admin",
      content: `Order status updated to ${status}`,
      date: new Date(),
    });

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
      .populate("orderedItems.product", "productName cardImage");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Calculate customer statistics
    const customerStats = {
      totalOrders: order.userId.orderHistory.length,
      totalSpent: await Order.aggregate([
        { $match: { userId: order.userId._id, status: { $ne: "Cancelled" } } },
        { $group: { _id: null, total: { $sum: "$finalAmount" } } },
      ]).then((result) => (result[0] ? result[0].total : 0)),
      totalReturns: await ReturnRequest.countDocuments({
        orderId: { $in: order.userId.orderHistory },
        status: "Approved",
      }),
    };

    res.json({ order, customerStats });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Process Return Request
const processReturnRequest = async (req, res) => {
  try {
    const { returnId } = req.params;
    const { returnStatus, refundMethod, statusNote, internalNote, sendNotification } = req.body;

    const returnRequest = await ReturnRequest.findById(returnId).populate({
      path: "orderId",
      populate: [
        { path: "userId", select: "email wallet" },
        { path: "orderedItems.product", select: "productName cardImage quantity" },
      ],
    });

    if (!returnRequest) {
      return res.status(404).json({ success: false, message: "Return request not found" });
    }

    const order = returnRequest.orderId;

    // Update return request status
    returnRequest.status =
      returnStatus === "approved"
        ? "Approved"
        : returnStatus === "rejected"
        ? "Rejected"
        : "More Info Requested";
    returnRequest.refundMethod = returnStatus === "approved" ? refundMethod : null;
    returnRequest.statusNote = statusNote;
    returnRequest.internalNote = internalNote;
    await returnRequest.save();

    // If approved, process refund and update inventory
    if (returnStatus === "approved") {
      if (refundMethod === "Wallet") {
        order.userId.wallet += order.finalAmount;
        await order.userId.save();
      }
      order.paymentStatus = "Refunded";
      order.status = "Returned";

      // Update inventory
      if (returnRequest.itemId) {
        const item = order.orderedItems.find(
          (i) => i._id.toString() === returnRequest.itemId.toString()
        );
        const product = await Product.findById(item.product._id);
        product.quantity += item.quantity;
        await product.save();
        item.returnStatus = "Returned";
      } else {
        for (const item of order.orderedItems) {
          if (item.returnStatus === "Return Requested") {
            const product = await Product.findById(item.product._id);
            product.quantity += item.quantity;
            await product.save();
            item.returnStatus = "Returned";
          }
        }
      }
    } else if (returnStatus === "rejected") {
      order.status = "Delivered";
      if (returnRequest.itemId) {
        const item = order.orderedItems.find(
          (i) => i._id.toString() === returnRequest.itemId.toString()
        );
        item.returnStatus = "Not Returned";
      } else {
        order.orderedItems.forEach((item) => {
          if (item.returnStatus === "Return Requested") {
            item.returnStatus = "Not Returned";
          }
        });
      }
    }

    // Add note to order
    order.notes = order.notes || [];
    order.notes.push({
      author: "Admin",
      content: `Return request ${returnStatus}. Note: ${statusNote || "None"}`,
      date: new Date(),
    });
    await order.save();

    // Send email notification (simulated)
    if (sendNotification) {
      console.log(`Sending email to ${order.userId.email}: Return request ${returnStatus}`);
    }

    res.json({ success: true, message: `Return request ${returnStatus} successfully` });
  } catch (error) {
    console.error("Error processing return request:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// Add Order Note
const addOrderNote = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { note } = req.body;

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    order.notes = order.notes || [];
    order.notes.push({
      author: "Admin",
      content: note,
      date: new Date(),
    });
    await order.save();

    res.json({ success: true, message: "Note added successfully" });
  } catch (error) {
    console.error("Error adding note:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getAllOrders,
  updateOrderStatus,
  getOrderDetails,
  processReturnRequest,
  addOrderNote,
};