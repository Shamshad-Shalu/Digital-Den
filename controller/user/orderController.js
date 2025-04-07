const Cart = require("../../model/cartSchema");
const Category = require("../../model/categorySchema");
const User = require("../../model/userSchema");
const Order  = require("../../model/orderSchema"); 
const OrderCancellation = require("../../model/OrderCancellations");
const ReturnRequest = require("../../model/returnRequestModel"); 
const {validateCancelOrder ,validateReturnRequest} = require("../../utils/validation");


const getorderSuccessPage = async (req, res) => {
    const { userData } = res.locals;
    const { orderId } = req.session; 
    try {
        const order = await Order.findOne({ orderId, userId: userData._id })
            .populate('orderedItems.product');
        if (!order) {
            return res.redirect('/user/orders');
        }
        res.render('user/order-success', { order });
    } catch (error) {
        console.error('Error fetching order success:', error);
        res.status(500).send('Server error');
    }
};


// const getOrders = async (req , res) => {
//     const {userData } = res.locals;

//     try {
//         // Fetch the user
//         const user = await User.findById(userData);
//         if (!user) {
//             console.error("User not found for ID:", userData._id);
//             return res.redirect("/user/home");
//         }

//         const orders = await Order.find({userId:userData._id})
//                 .populate("orderedItems.product")
//                 .sort({ invoiceDate: -1 });
//         const summary = {
//             totalOrders :orders.length,
//             activeOrders : orders.filter(order => ['Pending', 'Processing', 'Shipped'].includes(order.status)).length,
//             totalSpend :orders.reduce((sum , order ) => sum + order.finalAmount , 0)
//         }

//         res.render('user/orders', { user,orders, summary });
        
//     } catch (error) {
//         console.error('Error fetching orders:', error);
//         res.status(500).send('Server error');
//     }
// }


// const getOrders = async (req , res) => {
//     const {userData } = res.locals;

//     try {

//         // Fetch the user
//         const user = await User.findById(userData);
//         if (!user) {
//             console.error("User not found for ID:", userData._id);
//             return res.redirect("/user/home");
//         }

//         let  {page , limit , filter , sort} = req.query;

//         page = parseInt(page) || 1 ;
//         limit = parseInt(limit) || 5 ;
//         filter = filter || "all";
//         sort = sort || "date-desc"

//         let query = { userId: userData._id };

//         if (req.query.search) {
//             const searchTerm = req.query.search.trim();
//             query.$or = [
//                 { orderId: { $regex: searchTerm, $options: 'i' } },
//                 { status: { $regex: searchTerm, $options: 'i' } },
//                 { 'orderedItems.product.productName': { $regex: searchTerm, $options: 'i' } }
//             ];
//         }

//         // Apply status filter
//         if (filter !== "all") {
//             query.status = filter.charAt(0).toUpperCase() + filter.slice(1); // Capitalize first letter (e.g., "processing" -> "Processing")
//         }

//         // Calculate total orders for pagination
//         const totalOrders = await Order.countDocuments(query);

//         // Calculate pagination metadata
//         const totalPages = Math.ceil(totalOrders / limit);
//         const skip = (page - 1) * limit;

//         // Build sort criteria
//         let sortCriteria = {};
//         switch (sort) {
//             case "date-desc":
//                 sortCriteria = { invoiceDate: -1 };
//                 break;
//             case "date-asc":
//                 sortCriteria = { invoiceDate: 1 };
//                 break;
//             case "total-desc":
//                 sortCriteria = { finalAmount: -1 };
//                 break;
//             case "total-asc":
//                 sortCriteria = { finalAmount: 1 };
//                 break;
//             case "status":
//                 sortCriteria = { status: 1 };
//                 break;
//             default:
//                 sortCriteria = { invoiceDate: -1 }; // Fallback to date-desc
//         }

//         const orders = await Order.find({userId:userData._id})
//                 .populate("orderedItems.product")
//                 .sort(sortCriteria)
//                 .skip(skip)
//                 .limit(limit);
        
//         // Calculate summary
//         const allOrders = await Order.find({ userId: userData._id }); // Fetch all orders for summary
//         const summary = {
//             totalOrders: allOrders.length,
//             activeOrders: allOrders.filter(order => ['Pending', 'Processing', 'Shipped'].includes(order.status)).length,
//             totalSpend: allOrders.reduce((sum, order) => sum + order.finalAmount, 0),
//         };

//         res.render('user/orders', {
//             user,
//             orders,
//             summary,
//             pagination: {
//                 currentPage: page,
//                 totalPages,
//                 totalOrders,
//                 limit
//             },
//             filter,
//             sort,
//         });
        
//     } catch (error) {
//         console.error('Error fetching orders:', error);
//         res.status(500).send('Server error');
//     }
// }


const getOrders = async (req, res) => {
    const { userData } = res.locals;

    try {
        // Fetch the user
        const user = await User.findById(userData);
        if (!user) {
            console.error("User not found for ID:", userData._id);
            return res.status(404).json({ success: false, message: "User not found" });
        }

        let { page, limit, filter, sort, search } = req.query;

 
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 5;
        filter = filter || "all";
        sort = sort || "date-desc";
        search = search || "";

        let query = { userId: userData._id };

        if (search) {
            const searchTerm = search.trim();
            query.$or = [
                { orderId: { $regex: searchTerm, $options: 'i' } },
                { status: { $regex: searchTerm, $options: 'i' } },
                { 'orderedItems.product.productName': { $regex: searchTerm, $options: 'i' } },
            ];
        }

        if (filter !== "all") {
            query.status = filter.charAt(0).toUpperCase() + filter.slice(1); 
        }

        const totalOrders = await Order.countDocuments(query);

        const totalPages = Math.ceil(totalOrders / limit);
        const skip = (page - 1) * limit;

        //  sort criteria
        let sortCriteria = {};
        switch (sort) {
            case "date-desc":
                sortCriteria = { invoiceDate: -1 };
                break;
            case "date-asc":
                sortCriteria = { invoiceDate: 1 };
                break;
            case "total-desc":
                sortCriteria = { finalAmount: -1 };
                break;
            case "total-asc":
                sortCriteria = { finalAmount: 1 };
                break;
            case "status":
                sortCriteria = { status: 1 };
                break;
            default:
                sortCriteria = { invoiceDate: -1 }; 
        }

        // Fetch orders
        const orders = await Order.find(query)
            .populate("orderedItems.product")
            .sort(sortCriteria)
            .skip(skip)
            .limit(limit);

        // Calculate summary
        const allOrders = await Order.find({ userId: userData._id });
        const summary = {
            totalOrders: allOrders.length,
            activeOrders: allOrders.filter(order => ['Pending', 'Processing', 'Shipped'].includes(order.status)).length,
            totalSpend: allOrders.reduce((sum, order) => sum + order.finalAmount, 0),
        };

        
        if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
            return res.json({
                success: true,
                orders,
                summary,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalOrders,
                    limit,
                },
                filter,
                sort,
            });
        }

        res.render('user/orders', {
            user,
            orders,
            summary,
            pagination: {
                currentPage: page,
                totalPages,
                totalOrders,
                limit,
            },
            filter,
            sort,
            search, 
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        res.status(500).send('Server error');
    }
};

const trackOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findOne({ orderId })
            .populate('orderedItems.product', 'productName');

        if (!order) {
            console.log('Order not found for ID:', orderId);
            return res.status(404).json({ message: 'Order not found' });
        }
        res.json({
            orderId: order.orderId,
            status: order.status,
            createdAt: order.createdAt,
            address: order.address,
        });

    } catch (error) {
        console.error('Error in trackOrder:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const cancelOrder = async (req , res) => {
    try {

        if (res.locals.isUserBlocked) {
            return res.status(403).json({ success: false, message: 'Account is blocked' });
        }
    
        const {userData } = res.locals;
        const { orderId } = req.params;
        const { reason,comments } = req.body;
    
        // Validate request data
        const errors = validateCancelOrder({ reason, comments });
        if (errors) {
            return res.status(400).json({ success: false, errors });
        }

        const user = await User.findById(userData)
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Find order
        const order = await Order.findOne({ orderId }).populate('orderedItems.product');
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Check user is authorized to cancel 
        if (order.userId.toString() !== user._id.toString()  && !user.isAdmin) {
            return res.status(403).json({ success: false, message: 'Unauthorized to cancel this order' });
        }

        //checking
        if (['Delivered', 'Cancelled', 'Returned'].includes(order.status)) {
            return res.status(400).json({ success: false, message: 'Cannot cancel this order' });
        }

    
        // Set cancellation details
        order.cancellation = {
            reason,
            comments: comments || '',
            canceledBy: user._id,
            canceledAt: new Date()
      };
      order.isCanceled = true;
      order.status = 'Cancelled'; 

        // Increment stock for each product
        for (const item of order.orderedItems) {
            const product = item.product;
            product.quantity += item.quantity;
            await product.save();
        }

        await order.save();
        res.json({success: true,message: 'Order canceled successfully',});
        
    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}


const returnOrder = async (req, res) => {
    try {
        const { isUserBlocked, userData } = res.locals;
        if (isUserBlocked) {
            return res.status(403).json({ success: false, message: 'Account is blocked' });
        }

        const { orderId } = req.params;
        const { reason } = req.body;

        const errors = validateReturnRequest({ reason });
        if (errors) {
            return res.status(400).json({ success: false, errors });
        }

        const user = await User.findById(userData);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const order = await Order.findOne({ orderId }).populate('orderedItems.product');
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.userId.toString() !== user._id.toString() && !user.isAdmin) {
            return res.status(403).json({ success: false, message: 'Unauthorized to cancel this order' });
        }

        if (order.status !== 'Delivered') {
            return res.status(400).json({ success: false, message: 'Only delivered orders can be returned' });
        }

        if (['Return Request', 'Returned'].includes(order.status)) {
            return res.status(400).json({ success: false, message: 'Order is already in the return process' });
        }

        const returnRequest = new ReturnRequest({
            orderId: order._id,
            itemIds: order.orderedItems.map(item => item._id.toString()), // Include all item IDs for whole order
            reason,
            requestedBy: user._id,
            status: user.isAdmin ? 'Approved' : 'Pending',
        });
        await returnRequest.save();
        console.log("Saved returnRequest _id:", returnRequest._id);

        if (returnRequest.status === 'Approved') {
            for (const item of order.orderedItems) {
                const product = item.product;
                product.quantity += item.quantity;
                await product.save();
                item.returnStatus = 'Returned';
                item.returnReason = reason; // Store reason for each item
            }
            order.status = 'Returned';
            await order.save();
        } else {
            for (const item of order.orderedItems) {
                item.returnStatus = 'Return Requested';
                item.returnReason = reason; // Store reason for each item
            }
            order.status = 'Return Request';
            await order.save();
        }

        res.json({
            success: true,
            message: returnRequest.status === 'Approved' ? 'Order returned successfully' : 'Return request submitted for review',
        });
    } catch (error) {
        console.error('Return order error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// const returnOrder = async (req,res ) => {
//     try {
//         const {isUserBlocked ,userData } = res.locals;
//         if (isUserBlocked) {
//             return res.status(403).json({ success: false, message: 'Account is blocked' });
//         }

//         const { orderId } = req.params;
//         const { reason } = req.body;
    
//         // Validate request data
//         const errors = validateReturnRequest({ reason });
//         if (errors) {
//             return res.status(400).json({ success: false, errors });
//         }

//         const user = await User.findById(userData)
//         if (!user) {
//             return res.status(404).json({ success: false, message: 'User not found' });
//         }

//         // Find the order
//         const order = await Order.findOne({ orderId }).populate('orderedItems.product');
//         if (!order) {
//             return res.status(404).json({ success: false, message: 'Order not found' });
//         }

//         // Check if the user is authorized to cancel
//         if (order.userId.toString() !== user._id.toString()  && !user.isAdmin) {
//             return res.status(403).json({ success: false, message: 'Unauthorized to cancel this order' });
//         }

//         //checking
//         if (order.status !== 'Delivered') {
//             return res.status(400).json({ success: false, message: 'Only delivered orders can be returned' });
//         }

//         // Checking the order is already returned or has a return request
//         if (['Return Request', 'Returned'].includes(order.status)) {
//             return res.status(400).json({ success: false, message: 'Order is already in the return process' });
//         }

//         const returnRequest = new ReturnRequest({
//             orderId: order._id,
//             itemId: null, 
//             reason,
//             requestedBy: user._id,
//             status: user.isAdmin ? 'Approved' : 'Pending', 
//         });
//         await returnRequest.save();

//         // increment stock for  approved requests  
//         if (returnRequest.status === 'Approved') {
//             for (const item of order.orderedItems) {
//                 const product = item.product;
//                 product.quantity += item.quantity;
//                 await product.save();

//                 // Update the return status of each item
//                 item.returnStatus = 'Returned';
//             }

//             // Update the order status
//             order.status = 'Returned';
//             await order.save();

//         } else {
//             // update the order status to Return Request  for pending  
//             order.status = 'Return Request';
//             await order.save();
//         }

//         res.json({
//             success: true,
//             message: returnRequest.status === 'Approved'? 'Order returned successfully'
//             : 'Return request submitted for review',
//         });
        
//     } catch (error) {
//         console.error('Return order error:', error);
//         res.status(500).json({ success: false, message: 'Server error' });
//     }
// }
 
// //specific item 
// const returnItem = async (req,res ) => {
//     try {
//         const {userData ,isUserBlocked } = res.locals;
//         const { orderId ,itemId } = req.params;
//         const { reason } = req.body;

//         if (isUserBlocked) {
//             return res.status(403).json({ success: false, message: 'Account is blocked' });
//         }

//         // Validate request data
//         const errors = validateReturnRequest({ reason });
//         if (errors) {
//             return res.status(400).json({ success: false, errors });
//         }

//         const user = await User.findById(userData)
//         if (!user) {
//             return res.status(404).json({ success: false, message: 'User not found' });
//         }

//         // Find the order
//         const order = await Order.findOne({ orderId }).populate('orderedItems.product');
//         if (!order) {
//             return res.status(404).json({ success: false, message: 'Order not found' });
//         }

//         //  user is authorized ?
//         if (order.userId.toString() !== user._id.toString()  && !user.isAdmin) {
//             return res.status(403).json({ success: false, message: 'Unauthorized to cancel this order' });
//         }

//         //checking
//         if (order.status !== 'Delivered') {
//             return res.status(400).json({ success: false, message: 'Only delivered orders can be returned' });
//         }

//         // Find the item in the orderedItems array
//         const item = order.orderedItems.find(ite => ite._id.toString() === itemId);
//         if (!item) {
//             return res.status(404).json({ success: false, message: 'Item not found in order' });
//         }

//         // already returned or has a return request?
//         if (['Return Requested', 'Returned'].includes(item.returnStatus)) {
//             return res.status(400).json({ success: false, message: 'Item is already in the return process' });
//         }

//         const returnRequest = new ReturnRequest({
//             orderId: order._id,
//             itemId: item._id, 
//             reason,
//             requestedBy: user._id,
//             status: user.isAdmin ? 'Approved' : 'Pending',
//         });
//         await returnRequest.save();

//        //  update the item and increment stock
//        if (returnRequest.status === 'Approved') {
//             const product = item.product;
//             product.quantity += item.quantity;
//             await product.save();

//             // Update the return status of the item
//             item.returnStatus = 'Returned';

//             // Check if all items are returned
//             const allItemsReturned = order.orderedItems.every(i => i.returnStatus === 'Returned');
//             if (allItemsReturned) {
//                 order.status = 'Returned';
//             }

//             await order.save();
//         } else {
//             // If pending case  "Return Requested"
//             item.returnStatus = 'Return Requested';

//             // Update the order status to "Return Request" if not already set
//             if (order.status !== 'Return Request') {
//                 order.status = 'Return Request';
//             }

//             await order.save();
//         }

//         res.json({
//             success: true,message: returnRequest.status === 'Approved'? 'Item returned successfully'
//                 : 'Return request submitted for review',
//         });
        
//     } catch (error) {
//         console.error('Return order error:', error);
//         res.status(500).json({ success: false, message: 'Server error' });
//     }
// }

const returnItem = async (req, res) => {
    try {
        const { userData, isUserBlocked } = res.locals;
        const { orderId, itemId } = req.params;
        const { reason } = req.body;

        if (isUserBlocked) {
            return res.status(403).json({ success: false, message: 'Account is blocked' });
        }

        const errors = validateReturnRequest({ reason });
        if (errors) {
            return res.status(400).json({ success: false, errors });
        }

        const user = await User.findById(userData);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const order = await Order.findOne({ orderId }).populate('orderedItems.product');
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.userId.toString() !== user._id.toString() && !user.isAdmin) {
            return res.status(403).json({ success: false, message: 'Unauthorized to cancel this order' });
        }

        if (order.status !== 'Delivered') {
            return res.status(400).json({ success: false, message: 'Only delivered orders can be returned' });
        }

        const item = order.orderedItems.find(i => i._id.toString() === itemId);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found in order' });
        }

        if (['Return Requested', 'Returned'].includes(item.returnStatus)) {
            return res.status(400).json({ success: false, message: 'Item is already in the return process' });
        }

        const returnRequest = new ReturnRequest({
            orderId: order._id,
            itemIds: [itemId], // Store itemId as a string in the array
            reason,
            requestedBy: user._id,
            status: user.isAdmin ? 'Approved' : 'Pending',
        });
        await returnRequest.save();

        if (returnRequest.status === 'Approved') {
            const product = item.product;
            product.quantity += item.quantity;
            await product.save();

            item.returnStatus = 'Returned';
            item.returnReason = reason; // Store reason in the order item

            const allItemsReturned = order.orderedItems.every(i => i.returnStatus === 'Returned');
            if (allItemsReturned) {
                order.status = 'Returned';
            }
        } else {
            item.returnStatus = 'Return Requested';
            item.returnReason = reason; 
            if (order.status !== 'Return Request') {
                order.status = 'Return Request';
            }
        }

        await order.save();

        res.json({
            success: true,
            message: returnRequest.status === 'Approved' ? 'Item returned successfully' : 'Return request submitted for review',
        });
    } catch (error) {
        console.error('Return order error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


module.exports = {
    getorderSuccessPage,
    getOrders,
    trackOrder,
    cancelOrder,
    returnOrder,
    returnItem

}