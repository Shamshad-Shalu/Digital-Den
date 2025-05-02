const Offer = require('../../model/offerSchema');
const Product = require('../../model/productSchema');
const Category = require('../../model/categorySchema');
const Brand = require('../../model/brandSchema');
const { validateOffer } = require('../../utils/validation');

const getOffers = async (req, res , next) => {
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
        error.statusCode = 500; 
        next(error);
      }
};   
   
const addOffer = async (req, res, next) => {
    try {
        const {
          name,description,type,discount,startDate,endDate,appliedOn,   
          brands , products , categories , allProducts = false
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

      const errors = validateOffer(offerData);
      if (errors) {
        console.log(errors)
          return res.status(400).json({ success: false, errors });
      }

      const offer = new Offer(offerData);
      await offer.save();

      res.status(201).json({ success: true, message: 'Offer added successfully', data: offer });
    } catch (error) {
        error.statusCode = 500; 
        next(error);
    }
};
 
const editOffer = async (req , res , next)=> {
  try {
      const { id } = req.params;
      const { 
        name,description,type,discount,startDate,endDate,appliedOn,   
        brands , products, allProducts = false ,categories ,productChoice 
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
          allProducts: appliedOn === 'product' ? allProducts : false
      };

      const totalProducts = await Product.find({isDeleted:false , isListed:true });
        if(appliedOn === 'product') {
                offerData.products  = productChoice === "specific" ? products : (totalProducts.map(product => product._id) );
        }else {
            offerData.products = [];
        }

      const errors = validateOffer(offerData);
      if (errors) {
          console.log(errors)
          return res.status(400).json({ success: false, errors });
      };

      const offer = await Offer.findById(id);
      if (!offer) {
          return res.status(404).json({ success: false, message:  'offer not found' });
      }

      await updateOfferStatuses();
      // Update the offer
     offer.set({
          ... offerData,
          updatedAt: Date.now()
      });
      await offer.save();
  

      res.setHeader('Cache-Control', 'no-store');
      res.json({
          success: true,
          message: 'offer updated successfully',
      });
      
  } catch (error) {
    error.statusCode = 500; 
    next(error);
  }
}; 

const toggleOfferStatus = async(req ,res ,next )=>{
  try {

      const id = req.params.id;
      const {status} = req.body;

      const offer = await Offer.findById(id); 
      if (!offer) {
        console.log("offer not found")
          return res.status(404).json({ success: false, message:"offer not found" });
      }
      await updateOfferStatuses();
      if (offer.status === "Expired" || offer.status === "Upcoming"){
          return res.status(404).json({ success: false, message: "Cannot take action on expired  or upcoming offer" });
      }

      offer.status = status;
      await offer.save();

      console.log(`offer status updated to ${status}`);

      res.setHeader('Cache-Control', 'no-store');
      res.json({
          success: true,
          status: offer.status,
          message:`offer status updated to ${status}`
      });

  } catch (error) {
    error.statusCode = 500; 
    next(error);
  }
};

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


module.exports = { 
  getOffers, 
  addOffer, 
  editOffer , 
  toggleOfferStatus
 };