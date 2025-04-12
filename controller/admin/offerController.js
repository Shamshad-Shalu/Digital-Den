const Offer = require('../../model/offerSchema');
const Product = require('../../model/productSchema');
const Category = require('../../model/categorySchema');
const Brand = require('../../model/brandSchema');


const getOffers = async (req, res) => {

  //  try {
  
  //         let { search = '', start = '', end = '', type = 'All', status  = 'All', page } = req.query;
  
  //         page = parseInt(page) || 1;
  //         let limit = 5;
  
  //         let query = {};
  //         if (search) {
  //             query.code = { $regex: search.trim(), $options: 'i' };
  //         }
          
  //         if (type !== 'All') query.type = type;
  //         if (status !== 'All') query.status = status;
         
  //         if (start || end) {
  //             query.expireOn = {};
              
  //             if (start) {
  //                 query.expireOn.$gte = new Date(start);
  //             }
              
  //             if (end) {
  //                 query.expireOn.$lte = new Date(end);
  //                 // Set time to end of day for the end date
  //                 query.expireOn.$lte.setHours(23, 59, 59, 999);
  //             }
  //         }
  //         const count = await Coupon.countDocuments(query);
              
  //         const coupons = await Coupon.find(query)
  //             .sort({ createdAt: -1 })
  //             .limit(limit)
  //             .skip((page - 1) * limit)
  //             .exec();
  
  
  //         if (req.xhr || req.headers["x-requested-with"] === "XMLHttpRequest") {
  //             return res.status(200).json({ 
  //                 success: true, 
  //                 coupons,
  //                 page,
  //                 limit,
  //                 count
  //             });
  //         }
  
  //         res.render("admin/coupons", { 
  //             coupons:coupons || [],
  //             page,
  //             limit,
  //             count,
  //             search,
  //             start,
  //             end,
  //             status,
  //             type
  //         });
  
  //     } catch (error) {
  //         console.error("Error in getCoupons:", error.message);
  //         res.status(500).json({
  //             success: false,
  //             message: "Something Went Wrong!",
  //             redirectUrl:"/admin/pageError" 
  //         });
  //     }


  try {
    const { search = '', page = 1, limit = 5 } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } }
      ];
    }

    const offers = await Offer.find(query)
      .populate({
        path: 'targetIds',
        model: function (doc) { return doc.appliesToModel; }
      })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    const total = await Offer.countDocuments(query);

    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
      res.status(200).json({
        success: true,
        offers,
        page: parseInt(page) || 1,
        limit,
        total
      });
    } else {
      res.render('admin/offers', {
        search: search || '',
        page: parseInt(page) || 1,
        totalPages: Math.ceil(total / limit),
        offers,
        limit,
        total
      });
    }
  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

const addOffer = async (req, res) => {
  try {
    const {
      name,
      discountPercentage,
      minPurchase,
      maxDiscount,
      startDate,
      endDate,
      isActive,
      appliesTo,
      isAll,
      targetIds
    } = req.body;

    if (!name || !discountPercentage || !startDate || !endDate || !appliesTo) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    let appliesToModel;
    switch (appliesTo) {
      case 'products':
        appliesToModel = 'Product';
        break;
      case 'categories':
        appliesToModel = 'Category';
        break;
      case 'brands':
        appliesToModel = 'Brand';
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid appliesTo value' });
    }

    const offer = new Offer({
      name,
      discountPercentage,
      minPurchase: minPurchase || 0,
      maxDiscount,
      startDate,
      endDate,
      isActive: isActive === 'true',
      appliesTo,
      isAll: isAll === 'true',
      targetIds: isAll === 'true' ? [] : (targetIds || []),
      appliesToModel
    });

    await offer.save();
    res.json({ success: true, message: 'Offer added successfully', offer });
  } catch (error) {
    console.error('Error adding offer:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

const getOfferOptions = async (req, res) => {
  try {
    const { appliesTo } = req.query;
    console.log('Fetching options for appliesTo:', appliesTo);

    let options = [];
    if (appliesTo === 'products') {
      options = await Product.find({}, { productName: 1, _id: 1 }).lean();
    } else if (appliesTo === 'categories') {
      options = await Category.find({}, { name: 1, _id: 1 }).lean();
    } else if (appliesTo === 'brands') {
      options = await Brand.find({}, { brandName: 1, _id: 1 }).lean();
    }

    console.log('Options fetched:', JSON.stringify(options, null, 2));
    if (options.length === 0) {
      console.warn('No options found for:', appliesTo);
    }
    res.json({ success: true, options });
  } catch (error) {
    console.error('Error fetching offer options:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

module.exports = { getOffers, addOffer, getOfferOptions };