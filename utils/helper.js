const validator = require("validator");
const Product  = require("../model/productSchema");

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


// const updateAllProductStatuses = async () => {
//     try {
//         console.log('Starting product status update job...');
//         const products = await Product.find()
//             .populate('category')
//             .populate('brand');

//         for (let product of products) {
//             const newStatus = await determineStatus(product._id);
//             if (product.status !== newStatus) {
//                 product.status = newStatus;
//                 await product.save();
//                 console.log(`Updated status for product ${product._id} to ${newStatus}`);
//             }
//         }
//         console.log('Product status update job completed.');
//     } catch (error) {
//         console.error('Error in product status update job:', error.stack);
//     }
// };



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

module.exports = {
    validateUser,
    genarateOtp,
    determineStatus,
    updateProductsForBrand,

    updateProductsForCategory
}