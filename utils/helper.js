const validator = require("validator");
const Product  = require("../model/productSchema");
const Offer = require("../model/offerSchema");


// async function determineStatus (productId, isListed, quantity)  {
//     try {
//       // Fetch the product with its brand and category populated
//       const product = await Product.findById(productId)
//         .populate('brand')
//         .populate('category')
//         .lean();
  
//       if (!product) {
//         throw new Error('Product not found');
//       }
  
//       const brandIsListed = product.brand?.isListed ?? true;
//       const categoryIsListed = product.category?.isListed ?? true;
  
//       if (!brandIsListed || !categoryIsListed) {
//         return 'Discontinued';
//       }
  
//       if (!isListed) {
//         return 'Discontinued';
//       }
  
//       return quantity > 0 ? 'Available' : 'Out of stock';
//     } catch (error) {
//       console.error('Error determining status:', error.stack);
//       return 'Discontinued';
//     }
// };

async function determineStatus(productId) {
    try {
      
        const product = await Product.findById(productId)
            .populate('brand')
            .populate('category')
            .lean();

        if (!product) {
            throw new Error('Product not found');
        }

        const brandIsListed = product.brand?.isListed ?? false; 
        const categoryIsListed = product.category?.isListed ?? false; 

        // console.log(`Determining status for product ${product.productName}:`, {
        //     isListed:product.isListed,
        //     brandIsListed,
        //     categoryIsListed,
        //     quantity:product.quantity,
        // });

        if (!brandIsListed) {
            return 'Discontinued';
        }

        if (!categoryIsListed) {
            return 'Discontinued';
        }

        if (!product.isListed) {
            return 'Discontinued';
        }

        if (product.quantity <= 0) {
            return 'Out of stock';
        }
        return 'Available';
    } catch (error) {
        console.error(`Error determining status for product ${productId}:`, error.stack);
        return 'Discontinued';
    }
}

const updateProductsForBrand = async (brandId) => {
    try {
        const products = await Product.find({ brand: brandId })
            .populate('category')
            .populate('brand');

        for (let product of products) {
            const newStatus = await determineStatus(product._id);
            if (product.status !== newStatus) {
                product.status = newStatus;
                await product.save();
            } 
        }
    } catch (error) {
        console.error(`Error updating product statuses for brand ${brandId}:`, error.stack);
    }
};

const updateProductsForCategory = async (categoryId) => {
    try {
        const products = await Product.find({ category: categoryId })
            .populate('category')
            .populate('brand');

        for (let product of products) {
            const newStatus = await determineStatus(product._id);
            if (product.status !== newStatus) {
                console.log(`Updating status for product ${product._id} from ${product.status} to ${newStatus}`);
                product.status = newStatus;
                await product.save();
            }
        }
    } catch (error) {
        console.error(`Error updating product statuses for category ${categoryId}:`, error.stack);
    }
};

function validateUser(req) {
    const {username, email, password} = req.body;
    
    if (!validator.isAlphanumeric(username.replace(/\s/g, ''))){
        return "Please enter a valid Username";
    }
    
    if(!validator.isEmail(email)) {
        return "Please enter a valid Email";
    }
    
    if(!validator.isStrongPassword(password)) {
        return "Please enter a strong password";
    }
    
    return null; 
}

//otp generating 
function genarateOtp(){
  return  Math.floor(100000 + Math.random() * 900000).toString();
} 

const generateCustomId = (function () {
    const counters = {}; 
  
    return function(prefix = "TNX") {
      if (!counters[prefix]) {
        counters[prefix] = 0;
      }
  
      const id = `${prefix}-${String(counters[prefix]++).padStart(8, '0')}`;
      return id;
    };
})();

async function getSpecialOffer(product) {
    const now = new Date();
    const regularPrice = product.regularPrice;
    const MAX_DISCOUNT = regularPrice * 0.5; 

    const offers = await Offer.find({
        status: 'Active',
        startDate: { $lte: now },
        endDate: { $gte: now },
        $or: [
            { appliedOn: 'product', products: product._id },
            { appliedOn: 'brand', brands: product.brand?._id || product.brand },
            { appliedOn: 'category', categories: product.category?._id || product.category }
        ]
    });

    const specialOffers = [];
   
    for (let offer of offers) {
        let discount = 0;

        if (offer.type === "Percentage") {
            discount = (regularPrice * offer.discount) / 100;
        } else if (offer.type === "Fixed") {
            discount = offer.discount;
        }

        discount = Math.min(discount, MAX_DISCOUNT);

        specialOffers.push({
            discount,
            type: offer.type,
            offerName: offer.name,
            endDate: offer.endDate,
            description: offer.description,
            appliedOn: offer.appliedOn,
        });
    }

    return specialOffers;
}

async function calculateBestOffer (product , quantity) {

    const productDiscount = Math.max((product.regularPrice - product.salePrice), 0)* quantity;
    const categoryDiscount = product.category?.categoryOffer 
        ? (product.regularPrice * product.category.categoryOffer * quantity) / 100 
        : 0;
    const brandDiscount = product.brand?.brandOffer 
        ? (product.regularPrice * product.brand.brandOffer * quantity) / 100 
        : 0;

    const specialOffers = await getSpecialOffer(product);

    const specialDiscount = specialOffers.length > 0
        ? Math.max(...specialOffers.map(offer => offer.discount * quantity))
        : 0;

    const maxDiscount = Math.max(productDiscount, categoryDiscount , brandDiscount ,specialDiscount);

    let discountType = 'product';
    if (maxDiscount === categoryDiscount){
        discountType = 'category';
    }else if (maxDiscount === brandDiscount) {
        discountType = 'brand';
    }else if (maxDiscount === specialDiscount) {
        discountType = 'special';
    }

    return {amount : maxDiscount , type : discountType }
};

module.exports = {
    validateUser,
    genarateOtp,
    getSpecialOffer,
    calculateBestOffer,
    determineStatus,
    updateProductsForBrand,
    generateCustomId,
    updateProductsForCategory
}