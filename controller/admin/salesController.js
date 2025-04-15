const Order = require("../../model/orderSchema");
const User = require("../../model/userSchema");
const ReturnRequest = require("../../model/returnRequestModel");
const Product = require("../../model/productSchema");
const Wallet = require("../../model/walletSchema");

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

// const  getSalePage = async (req , res) => {
//     try {
//         const {
//             page = 1,
//             search = '',
//             status = 'All',
//             paymentType = "All",
//             category = 'All',
//             brand = 'All',
//             minPrice = '',
//             maxPrice = '',
//             dateRange = 'All',
//             startDate = " ",
//             endDate = ' '
          
//         } = req.query;

//         const limit = 10;
//         const skip = (page - 1) * limit;

//         // Build query
//         let query = {};

//         // Search by order ID or customer name
//         if (search) {
//             query.$or = [
//                 { orderId: { $regex: search, $options: 'i' } },
//                 { 'customer.name': { $regex: search, $options: 'i' } }
//             ];
//         }

//         // Status filter
//         if (status !== 'All') {
//             query.status = status;
//         }

//         // Payment method filter
//         if (paymentType !== 'All') {
//             query.paymentMethod = paymentType;
//         }

//         // Category filter (assuming items have category field)
//         if (category !== 'all') {
//             query['items.category'] = category;
//         }

//         // Brand filter (assuming items have brand field)
//         if (brand !== 'all') {
//             query['items.brand'] = brand;
//         }

//         // Price range filter
//         if (minPrice || maxPrice) {
//             query.total = {};
//             if (minPrice) query.total.$gte = Number(minPrice);
//             if (maxPrice) query.total.$lte = Number(maxPrice);
//         }

//         // Date range filter
//         if (dateRange !== 'all') {
//             const now = new Date();
//             query.orderDate = {};

//             switch (dateRange) {
//                 case 'today':
//                     query.orderDate.$gte = new Date(now.setHours(0, 0, 0, 0));
//                     query.orderDate.$lte = new Date(now.setHours(23, 59, 59, 999));
//                     break;
//                 case 'yesterday':
//                     const yesterday = new Date(now.setDate(now.getDate() - 1));
//                     query.orderDate.$gte = new Date(yesterday.setHours(0, 0, 0, 0));
//                     query.orderDate.$lte = new Date(yesterday.setHours(23, 59, 59, 999));
//                     break;
//                 case 'weekly':
//                     const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
//                     query.orderDate.$gte = new Date(weekStart.setHours(0, 0, 0, 0));
//                     break;
//                 case 'monthly':
//                     const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
//                     query.orderDate.$gte = new Date(monthStart.setHours(0, 0, 0, 0));
//                     break;
//                 case 'custom':
//                     if (startDate) query.orderDate.$gte = new Date(startDate);
//                     if (endDate) query.orderDate.$lte = new Date(endDate);
//                     break;
//             }
//         }

//         // Fetch sales
//         const sales = await Order.find(query)
//             .skip(skip)
//             .limit(limit)
//             .lean();

//             const ordd = await Order.find();

//             console.log("the total order in db =",ordd)

//         const totalSales = await Order.countDocuments(query);
//         const totalPages = Math.ceil(totalSales / limit);

//         // Map sales data
//         const salesData = sales.map(sale => ({
//             _id: sale._id,
//             orderDate: sale.orderDate,
//             orderId: sale.orderId,
//             customerName: sale.customer?.name || 'Unknown',
//             items: sale.items || [],
//             paymentMethod: sale.paymentType,
//             subtotal: sale.subtotal || 0,
//             discount: sale.discount || 0,
//             total: sale.total || 0,
//             status: sale.status
//         }));

       

//         console.log("total sales :",sales);

//         if (req.xhr || req.headers["x-requested-with"] === "XMLHttpRequest") {
//             return res.json({
//                 sales: salesData,
//                 currentPage: Number(page),
//                 totalPages,
//                 totalSales
//             });
//         }

//         res.render("admin/sales", { 
//             sales: salesData,
//             currentPage: Number(page),
//             totalPages,
//             totalSales,
//             search,
//             status,
//             paymentType,
//             category,
//             brand,
//             minPrice,
//             maxPrice,
//             dateRange,
//             startDate,
//             endDate
        
//         });
//     } catch (error) {
//         console.error('Error fetching sales:', error);
//         res.status(500).json({ message: 'Server error' });
//     }
// }



const getSalePage = async (req, res) => {
    try {
        const {
            page = 1,
            search = '',
            status = 'All',
            paymentType = "All",
            category = 'All',
            brand = 'All',
            minPrice = '',
            maxPrice = '',
            dateRange = 'all',
            startDate = '',
            endDate = ''
        } = req.query;

        const limit = 5;
        const skip = (page - 1) * limit;

        let query = {};

        if (search) {
            query.$or = [
                { orderId: { $regex: search, $options: 'i' } },
                { 'customer.name': { $regex: search, $options: 'i' } }
            ];
        }

        // Status filter
        if (status !== 'All') {
            query.status = status;
        }


        if (paymentType !== 'All') {
            query.paymentMethod = paymentType; 
        }

        // Category filter - FIXED: case sensitivity and structure
        if (category !== 'All') {
            query['items.category'] = { $regex: new RegExp(category, 'i') };
        }

        // Brand filter - FIXED: case sensitivity and structure
        if (brand !== 'All' && brand !== 'all') {
            query['items.brand'] = { $regex: new RegExp(brand, 'i') };
        }

        // Price range filter
        if (minPrice || maxPrice) {
            query.finalAmount = {}; 
            if (minPrice) query.finalAmount.$gte = Number(minPrice);
            if (maxPrice) query.finalAmount.$lte = Number(maxPrice);
        }

        // Date range filter
        if (dateRange !== 'all') {
            const now = new Date();
            query.createdAt = {};

            switch (dateRange) {
                case 'today':
                    query.createdAt.$gte = new Date(now.setHours(0, 0, 0, 0));
                    query.createdAt.$lte = new Date(now.setHours(23, 59, 59, 999));
                    break;
                case 'yesterday':
                    const yesterday = new Date();
                    yesterday.setDate(now.getDate() - 1);
                    query.createdAt.$gte = new Date(yesterday.setHours(0, 0, 0, 0));
                    query.createdAt.$lte = new Date(yesterday.setHours(23, 59, 59, 999));
                    break;
                case 'weekly':
                    const weekStart = new Date();
                    weekStart.setDate(now.getDate() - now.getDay());
                    query.createdAt.$gte = new Date(weekStart.setHours(0, 0, 0, 0));
                    break;
                case 'monthly':
                    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                    query.createdAt.$gte = new Date(monthStart.setHours(0, 0, 0, 0));
                    break;
                case 'custom':
                    if (startDate && startDate.trim() !== '') 
                        query.createdAt.$gte = new Date(startDate);
                    if (endDate && endDate.trim() !== '') {
                        const endDateTime = new Date(endDate);
                        endDateTime.setHours(23, 59, 59, 999);
                        query.createdAt.$lte = endDateTime;
                    }
                    break;
            }
        }

        const statsCalculations = await Order.aggregate([
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: "$finalAmount" }, 
                totalDiscount: { $sum: { $add: ["$discount", "$couponDiscount"] } },
                // For returns, assuming orders with status "Returned" count
                totalReturns: {
                  $sum: {
                    $cond: [{ $eq: ["$status", "Returned"] }, "$finalAmount", 0]
                  }
                }
              }
            }
        ]);
          
        const stats = statsCalculations.length > 0 ? statsCalculations[0] : { 
            totalRevenue: 0, 
            totalDiscount: 0, 
            totalReturns: 0 
        };

        console.log("MongoDB query:", JSON.stringify(query, null, 2)); 

        // Test query without filters first
        const totalOrdersInDb = await Order.countDocuments({});
        console.log("Total orders in DB (no filters):", totalOrdersInDb);

        // Fetch sales with filters
        const sales = await Order.find(query)
            .skip(skip)
            .limit(limit)
            .lean();

        console.log("Filtered sales count:", sales.length);

        const totalSales = await Order.countDocuments(query);
        const totalPages = Math.ceil(totalSales / limit);

        const salesData = sales.map(sale => ({
            _id: sale._id,
            orderDate: sale.invoiceDate || sale.createdAt,
            orderId: sale.orderId,
            customerName: sale.userId?.name || sale.address?.name || 'Unknown', 
            email: sale.userId?.email || '',
            items: sale.orderedItems || [], 
            paymentMethod: sale.paymentMethod, 
            subtotal: sale.totalPrice || 0,
            discount: (sale.discount || 0) + (sale.couponDiscount || 0), 
            total: sale.finalAmount || 0, 
            status: sale.status
        }));

        if (req.xhr || req.headers["x-requested-with"] === "XMLHttpRequest") {
            return res.json({
                sales: salesData,
                page: Number(page),
                limit: limit,
                count: totalSales
            });
        }

        res.render("admin/sales", { 
            sales: salesData,
            totalOrder:totalOrdersInDb,
            currentPage: Number(page),
            totalOrder: totalOrdersInDb,
            totalRevenue: stats.totalRevenue,
            totalDiscount: stats.totalDiscount,
            totalReturns: stats.totalReturns,
            totalPages,
            totalSales,
            search,
            status,
            paymentType,
            category,
            brand,
            minPrice,
            maxPrice,
            dateRange,
            startDate,
            endDate
        });
    } catch (error) {
        console.error('Error fetching sales:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};



module.exports = {
getSalePage

}