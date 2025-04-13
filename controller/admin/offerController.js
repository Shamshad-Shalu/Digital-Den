const Offer = require('../../model/offerSchema');
const Product = require('../../model/productSchema');
const Category = require('../../model/categorySchema');
const Brand = require('../../model/brandSchema');
const { validateOffer } = require('../../utils/validation');


// update offer status
const updateOfferStatuses = async () => {
    try {

        const now = new Date();
        const offers = await Offer.find();
        const bulkOps = offers.map(offer => {
            const startDate = new Date(offer.startDate); 
            const endDate = new Date(offer.endDate); 
            
            const newStatus = startDate > now ?  "Upcoming" :
                  endDate < now ?  'Expired' :
                  offer.status === 'Disabled' ? 'Disabled' : 'Active';
            
            if (offer.status !== newStatus) {
                return {
                    updateOne: {
                        filter: { _id: offer._id },
                        update: { $set: { status: newStatus, updatedAt: new Date() } }
                    }
                };
                
            }
        }).filter(Boolean); 

        if (bulkOps.length > 0) {
            await Offer.bulkWrite(bulkOps);
            
            console.log(`Updated ${bulkOps.length} offer status(es).`);
        }
       
    } catch (error) {
        console.error('Error updating offer statuses:', error.message);
    }
};

const getOffers = async (req, res) => {
   try {

        const categories = await Category.find({ isListed: true, isDeleted: false });
        const brands = await Brand.find({ isListed: true, isDeleted: false });
        const products = await Product.find({isDeleted:false , isListed:true });

        let { search = '', start = '', end = '', type = 'All', status  = 'All', appliedOn = "All",  page } = req.query;

        page = parseInt(page) || 1;
        let limit = 5;

        await updateOfferStatuses();
        let query = {};
        if (search) {
            query.name = { $regex: search.trim(), $options: 'i' };
        }
  
        if (type !== 'All') query.type = type;
        if (status !== 'All') query.status = status;
        if (appliedOn && appliedOn !== 'All') {
          query.appliedOn = appliedOn;
       }
      
      if (start || end) {
          if (start) {
              query.startDate = query.startDate || {};
              query.startDate.$gte = new Date(start);
          }
          
          if (end) {
              query.endDate = query.endDate || {};
              const endDate = new Date(end);
              endDate.setHours(23, 59, 59, 999);
              query.endDate.$lte = endDate;
          }
      }

        const count = await Offer.countDocuments(query);

        const offers = await Offer.find(query)
            .populate("categories")
            .populate("brands")
            .populate("products")
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit)
            .lean();

        if (req.xhr || req.headers["x-requested-with"] === "XMLHttpRequest") {
            return res.status(200).json({ 
                success: true, 
                offers,
                page,
                limit,
                count,
                categories,
                brands,
                products,
          
            });
        }

        res.render("admin/offers", { 
            offers:offers || [],
            page,
            count,
            limit,
            appliedOn,
            status,
            search,
            start,
            end,
            type,
            categories,
            brands,
            products,
        });
  
      } catch (error) {
        console.error("Error fetching offers:", error.message);
        return res.status(500).json({
            success: false,
            message: "Something went wrong",
            redirectUrl: "/admin/pageError"
        });
      }
};

const addOffer = async (req, res) => {
    try {
        const {
          name,
          description,
          type,
          discount,
          startDate,
          endDate,
          appliedOn,
          categories = [],
          brands = [],
          products = [],
          allProducts = false
        } = req.body;

        const offerData = {
          name,
          description,
          type,
          discount,
          startDate,
          endDate,
          appliedOn,
          categories: appliedOn === 'category' ? categories : [],
          brands: appliedOn === 'brand' ? brands : [],
          products: appliedOn === 'product' ? products : [],
          allProducts: appliedOn === 'product' ? allProducts : false
      };

      console.log("Offer data :",offerData);

      const errors = await validateOffer(offerData);
      if (errors) {
        console.log(errors)
          return res.status(400).json({ success: false, errors });
      }

      const offer = new Offer(offerData);
      await offer.save();

      res.status(201).json({ success: true, message: 'Offer added successfully', data: offer });
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