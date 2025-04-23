const Order = require("../../model/orderSchema");
const User = require("../../model/userSchema");
const Product = require("../../model/productSchema");



const getSalePage = async (req, res) => {
    try {
        
        const {
            page = 1,
            search = '',
            status = 'All',
            paymentMethod = "All",
            minPrice = '',
            maxPrice = '',
            dateRange = 'all',
            startDate = '',
            endDate = ''
        } = req.query;

        const limit = 5;

        let query = {};

        if (search) {
            query.$or = [
                { orderId: { $regex: search, $options: 'i' } },
            ];
        }

        if (status !== 'All') {
            query.status = status;
        }

        if (paymentMethod !== 'All') {
            query.paymentMethod = paymentMethod; 
        }

        if (minPrice || maxPrice) {
            query.finalAmount = {}; 
            if (minPrice) query.finalAmount.$gte = Number(minPrice);
            if (maxPrice) query.finalAmount.$lte = Number(maxPrice);
        }

        if (dateRange !== 'All') {
            const now = new Date();
            switch (dateRange) {
                case 'today':
                    query.createdAt = {
                        $gte: new Date(now.setHours(0, 0, 0, 0)),
                        $lte: new Date(now.setHours(23, 59, 59, 999))
                    };
                    break;
                case 'yesterday':
                    const yesterday = new Date();
                    yesterday.setDate(now.getDate() - 1);
                    query.createdAt = {
                        $gte: new Date(yesterday.setHours(0, 0, 0, 0)),
                        $lte: new Date(yesterday.setHours(23, 59, 59, 999))
                    };
                    break;
                case 'weekly':
                    const weekStart = new Date();
                    weekStart.setDate(now.getDate() - now.getDay());
                    query.createdAt = {
                        $gte: new Date(weekStart.setHours(0, 0, 0, 0))
                    };
                    break;
                case 'monthly':
                    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                    query.createdAt = {
                        $gte: new Date(monthStart.setHours(0, 0, 0, 0))
                    };
                    break;
                case 'custom':
                    if (startDate && startDate.trim() !== '' || endDate && endDate.trim() !== '') {
                        query.createdAt = {};
                        
                        if (startDate && startDate.trim() !== '') 
                            query.createdAt.$gte = new Date(startDate);
                        
                        if (endDate && endDate.trim() !== '') {
                            const endDateTime = new Date(endDate);
                            endDateTime.setHours(23, 59, 59, 999);
                            query.createdAt.$lte = endDateTime;
                        }
                    }
                    break;
            }
        } 

        const statsCalculations = await Order.aggregate([
            { $match: query }, 
            {
              $group: {
                _id: null,
                grossSales : { $sum: "$totalPrice" }, 
                totalDiscount: { $sum: "$discount" },
                cancelOrders: {
                    $sum: {
                      $cond: [{ $eq: ["$status", "Cancelled"] }, "$finalAmount", 0]
                    }
                },
                totalReturns: {
                    $sum: {
                      $cond: [{ $eq: ["$status", "Returned"] }, "$finalAmount", 0]
                    }
                },
                totalCouponDiscount: { $sum: "$couponDiscount"},
                netSale: { 
                    $sum: {
                      $cond: [
                        { $in: ["$status", ["Cancelled", "Returned"]] },
                        0,
                        "$finalAmount"
                      ]
                    }
                },
              }
            }
        ]);
          
        let stats = statsCalculations.length > 0 ? statsCalculations[0] : { 
            grossSales: 0, 
            totalDiscount: 0, 
            totalReturns: 0 ,
            cancelOrders: 0 ,
            totalCouponDiscount : 0,
            netSale : 0,
        };

        const totalOrders = await Order.countDocuments(query);

        
        const sales = await Order.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const totalPages = Math.ceil(totalOrders / limit);

        const salesData = sales.map(sale => ({
            _id: sale._id,
            orderDate: sale.invoiceDate || sale.createdAt,
            orderId: sale.orderId,
            items: sale.orderedItems || [], 
            paymentMethod: sale.paymentMethod, 
            subtotal: sale.totalPrice ,
            discount: sale.discount ,
            revokedCoupon:sale.refundAmount || 0,
            refundAmount:sale.refundAmount || 0,
            tax: sale.tax ,
            couponDiscount:sale.couponDiscount ,
            total: sale.finalAmount, 
            status: sale.status
        }));

        if (req.xhr || req.headers["x-requested-with"] === "XMLHttpRequest") {
            return res.json({
                sales: salesData,
                page,
                limit,
                count: totalOrders,
                grossSale: stats.grossSales,
                totalDiscount: stats.totalDiscount,
                cancelOrders: stats.cancelOrders,
                totalReturns: stats.totalReturns,
                totalCoupon : stats.totalCouponDiscount,
                netSale : stats.netSale,
                totalPages,
                totalOrders,
            });
        } 

        res.render("admin/sales", { 
            sales: salesData,
            currentPage: page,
            grossSale: stats.grossSales,
            totalDiscount: stats.totalDiscount,
            cancelOrders: stats.cancelOrders,
            totalReturns: stats.totalReturns,
            totalCoupon : stats.totalCouponDiscount,
            netSale : stats.netSale,
            totalPages,
            totalOrders,
            search,
            status,
            paymentMethod,
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

const exportSales = async (req, res) => {
    try {
        const {
            search = '',
            status = 'All',
            paymentMethod = "All",
            minPrice = '',
            maxPrice = '',
            dateRange = 'all',
            startDate = '',
            endDate = ''
        } = req.query;

        // For exports, we need a higher limit
        const limit = parseInt(req.query.limit) || 1000;

        let query = {};

        if (search) {
            query.$or = [
                { orderId: { $regex: search, $options: 'i' } },
            ];
        }

        if (status !== 'All') {
            query.status = status;
        }

        if (paymentMethod !== 'All') {
            query.paymentMethod = paymentMethod; 
        }

        if (minPrice || maxPrice) {
            query.finalAmount = {}; 
            if (minPrice) query.finalAmount.$gte = Number(minPrice);
            if (maxPrice) query.finalAmount.$lte = Number(maxPrice);
        }

        if (dateRange !== 'All') {
            const now = new Date();
            switch (dateRange) {
                case 'today':
                    query.createdAt = {
                        $gte: new Date(now.setHours(0, 0, 0, 0)),
                        $lte: new Date(now.setHours(23, 59, 59, 999))
                    };
                    break;
                case 'yesterday':
                    const yesterday = new Date();
                    yesterday.setDate(now.getDate() - 1);
                    query.createdAt = {
                        $gte: new Date(yesterday.setHours(0, 0, 0, 0)),
                        $lte: new Date(yesterday.setHours(23, 59, 59, 999))
                    };
                    break;
                case 'weekly':
                    const weekStart = new Date();
                    weekStart.setDate(now.getDate() - now.getDay());
                    query.createdAt = {
                        $gte: new Date(weekStart.setHours(0, 0, 0, 0))
                    };
                    break;
                case 'monthly':
                    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                    query.createdAt = {
                        $gte: new Date(monthStart.setHours(0, 0, 0, 0))
                    };
                    break;
                case 'custom':
                    if (startDate && startDate.trim() !== '' || endDate && endDate.trim() !== '') {
                        query.createdAt = {};
                        
                        if (startDate && startDate.trim() !== '') 
                            query.createdAt.$gte = new Date(startDate);
                        
                        if (endDate && endDate.trim() !== '') {
                            const endDateTime = new Date(endDate);
                            endDateTime.setHours(23, 59, 59, 999);
                            query.createdAt.$lte = endDateTime;
                        }
                    }
                    break;
            }
        }

        const statsCalculations = await Order.aggregate([
            { $match: query }, 
            {
              $group: {
                _id: null,
                grossSales : { $sum: "$totalPrice" }, 
                totalDiscount: { $sum: "$discount" },
                cancelOrders: {
                    $sum: {
                      $cond: [{ $eq: ["$status", "Cancelled"] }, "$finalAmount", 0]
                    }
                },
                totalReturns: {
                    $sum: {
                      $cond: [{ $eq: ["$status", "Returned"] }, "$finalAmount", 0]
                    }
                },
                totalCouponDiscount: { $sum: "$couponDiscount"},
                netSale: { 
                    $sum: {
                      $cond: [
                        { $in: ["$status", ["Cancelled", "Returned"]] },
                        0,
                        "$finalAmount"
                      ]
                    }
                },
              }
            }
        ]);
          
        let stats = statsCalculations.length > 0 ? statsCalculations[0] : { 
            grossSales: 0, 
            totalDiscount: 0, 
            totalReturns: 0,
            cancelOrders: 0,
            totalCouponDiscount: 0,
            netSale: 0,
        };

        const totalOrders = await Order.countDocuments(query);
        
        // For export, we retrieve all matching records (up to the limit)
        const sales = await Order.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        const salesData = sales.map(sale => ({
            _id: sale._id,
            orderDate: sale.invoiceDate || sale.createdAt,
            orderId: sale.orderId,
            items: sale.orderedItems || [], 
            paymentMethod: sale.paymentMethod, 
            subtotal: sale.totalPrice,
            discount: sale.discount,
            couponDiscount: sale.couponDiscount,
            revokedCoupon: sale.refundAmount || 0,
            refundAmount: sale.refundAmount || 0,
            tax: sale.tax,
            total: sale.finalAmount, 
            status: sale.status
        }));

        res.json({
            sales: salesData,
            grossSale: stats.grossSales,
            totalDiscount: stats.totalDiscount,
            cancelOrders: stats.cancelOrders,
            totalReturns: stats.totalReturns,
            totalCoupon: stats.totalCouponDiscount,
            netSale: stats.netSale,
            totalOrders,
            dateRange,
            startDate,
            endDate
        });
    } catch (error) {
        console.error('Error exporting sales:', error);
        res.status(500).json({ message: 'Export failed', error: error.message });
    }
};

const getDashboardPage = async (req, res) => {
    try {
        const { period = 'month' } = req.query;

        let query = {};
        const now = new Date();

        switch (period) {
            case 'day':
                query.createdAt = {
                    $gte: new Date(now.setHours(0, 0, 0, 0)),
                    $lte: new Date(now.setHours(23, 59, 59, 999))
                };
                break;
            case 'week':
                const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
                query.createdAt = { $gte: new Date(weekStart.setHours(0, 0, 0, 0)) };
                break;
            case 'month':
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                query.createdAt = { $gte: new Date(monthStart.setHours(0, 0, 0, 0)) };
                break;
            case 'year':
                const yearStart = new Date(now.getFullYear(), 0, 1);
                query.createdAt = { $gte: new Date(yearStart.setHours(0, 0, 0, 0)) };
                break;
        }

        // Stats Calculations
        const statsCalculations = await Order.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    netSale: {
                        $sum: {
                            $cond: [
                                { $in: ["$status", ["Cancelled", "Returned"]] },
                                0,
                                "$finalAmount"
                            ]
                        }
                    },
                    totalOrders: { $sum: 1 }
                }
            }
        ]);

        let stats = statsCalculations.length > 0 ? statsCalculations[0] : {
            netSale: 0,
            totalOrders: 0
        };

        // Total Customers
        const totalCustomers = await User.countDocuments({ isAdmin: false, isBlocked: false });

        // Total Products
        const totalProducts = await Product.countDocuments({ isListed: true, isDeleted: false });

        // Sales Chart Data (Dynamic Grouping Based on Period)
        let dateFormat;
        let limit;
        switch (period) {
            case 'day':
                dateFormat = "%Y-%m-%d %H:00"; // Group by hour for daily view
                limit = 24; // 24 hours in a day
                break;
            case 'week':
                dateFormat = "%Y-%m-%d"; // Group by day for weekly view
                limit = 7; // 7 days in a week
                break;
            case 'month':
                dateFormat = "%Y-%m-%d"; // Group by day for monthly view
                limit = 31; // Up to 31 days in a month
                break;
            case 'year':
                dateFormat = "%Y-%m"; // Group by month for yearly view
                limit = 12; // 12 months in a year
                break;
            default:
                dateFormat = "%Y-%m";
                limit = 12;
        }

        const salesChartData = await Order.aggregate([
            { $match: query },
            {
                $group: {
                    _id: {
                        $dateToString: { format: dateFormat, date: "$createdAt" }
                    },
                    total: { $sum: "$finalAmount" }
                }
            },
            { $sort: { "_id": 1 } },
            { $limit: limit }
        ]);

        const salesChart = {
            labels: salesChartData.map(d => d._id),
            data: salesChartData.map(d => d.total)
        };

        // Category Chart Data
        const categoryChartData = await Order.aggregate([
            { $match: query },
            { $unwind: "$orderedItems" },
            {
                $lookup: {
                    from: "products",
                    localField: "orderedItems.product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            {
                $lookup: {
                    from: "categories",
                    localField: "productDetails.category",
                    foreignField: "_id",
                    as: "categoryDetails"
                }
            },
            { $unwind: "$categoryDetails" },
            {
                $group: {
                    _id: "$categoryDetails.name",
                    total: { $sum: { $multiply: ["$orderedItems.quantity", "$orderedItems.price"] } }
                }
            },
            { $sort: { total: -1 } },
            { $limit: 5 }
        ]);

        const categoryChart = {
            labels: categoryChartData.map(d => d._id),
            data: categoryChartData.map(d => d.total)
        };

        // Best Selling Products (Top 10)
        const bestProducts = await Order.aggregate([
            { $match: query },
            { $unwind: "$orderedItems" },
            {
                $lookup: {
                    from: "products",
                    localField: "orderedItems.product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            {
                $lookup: {
                    from: "categories",
                    localField: "productDetails.category",
                    foreignField: "_id",
                    as: "categoryDetails"
                }
            },
            { $unwind: "$categoryDetails" },
            {
                $group: {
                    _id: "$orderedItems.product",
                    name: { $first: "$productDetails.productName" },
                    categoryName: { $first: "$categoryDetails.name" },
                    units: { $sum: "$orderedItems.quantity" }
                }
            },
            { $sort: { units: -1 } },
            { $limit: 10 }
        ]);

        // Best Selling Categories (Top 10)
        const bestCategories = await Order.aggregate([
            { $match: query },
            { $unwind: "$orderedItems" },
            {
                $lookup: {
                    from: "products",
                    localField: "orderedItems.product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            {
                $lookup: {
                    from: "categories",
                    localField: "productDetails.category",
                    foreignField: "_id",
                    as: "categoryDetails"
                }
            },
            { $unwind: "$categoryDetails" },
            {
                $group: {
                    _id: "$categoryDetails._id",
                    name: { $first: "$categoryDetails.name" },
                    revenue: { $sum: { $multiply: ["$orderedItems.quantity", "$orderedItems.price"] } },
                    products: { $addToSet: "$orderedItems.product" }
                }
            },
            { $sort: { revenue: -1 } },
            { $limit: 10 }
        ]);

        // Best Selling Brands (Top 10)
        const bestBrands = await Order.aggregate([
            { $match: query },
            { $unwind: "$orderedItems" },
            {
                $lookup: {
                    from: "products",
                    localField: "orderedItems.product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            {
                $lookup: {
                    from: "brands",
                    localField: "productDetails.brand",
                    foreignField: "_id",
                    as: "brandDetails"
                }
            },
            { $unwind: "$brandDetails" },
            {
                $group: {
                    _id: "$brandDetails._id",
                    name: { $first: "$brandDetails.brandName" },
                    categoryName: { $first: "$productDetails.category" },
                    revenue: { $sum: { $multiply: ["$orderedItems.quantity", "$orderedItems.price"] } }
                }
            },
            { $sort: { revenue: -1 } },
            { $limit: 10 }
        ]);

        // Recent Orders
        const recentOrders = await Order.find(query)
            .sort({ createdAt: -1 })
            .limit(5)
            .lean()
            .populate('userId', 'username');

        const recentOrdersData = recentOrders.map(order => ({
            orderId: order.orderId,
            customer: order.userId ? order.userId.username : 'Unknown',
            date: order.createdAt,
            amount: order.finalAmount,
            status: order.status
        }));

        if (req.xhr || req.headers["x-requested-with"] === "XMLHttpRequest") {
            return res.json({
                netSale: stats.netSale,
                totalOrders: stats.totalOrders,
                totalCustomers,
                totalProducts,
                salesChart,
                categoryChart,
                bestProducts: bestProducts.map(p => ({
                    name: p.name,
                    categoryName: p.categoryName,
                    units: p.units
                })),
                bestCategories: bestCategories.map(c => ({
                    name: c.name,
                    revenue: c.revenue,
                    products: c.products.length
                })),
                bestBrands: bestBrands.map(b => ({
                    name: b.name,
                    categoryName: b.categoryName,
                    revenue: b.revenue
                })),
                recentOrders: recentOrdersData
            });
        }

        res.render("admin/dashboard", {
            netSale: stats.netSale,
            totalOrders: stats.totalOrders,
            totalCustomers,
            totalProducts,
            salesChart,
            categoryChart,
            bestProducts: bestProducts.map(p => ({
                name: p.name,
                categoryName: p.categoryName,
                units: p.units
            })),
            bestCategories: bestCategories.map(c => ({
                name: c.name,
                revenue: c.revenue,
                products: c.products.length
            })),
            bestBrands: bestBrands.map(b => ({
                name: b.name,
                categoryName: b.categoryName,
                revenue: b.revenue
            })),
            recentOrders: recentOrdersData
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};


module.exports = {
getSalePage,
getDashboardPage ,
exportSales

}