const Product = require('../../model/productSchema');
const Category = require('../../model/categorySchema');
const Brand = require('../../model/brandSchema');
const { validateProduct } = require('../../utils/productvalidation');
const fs = require('fs').promises;
const path = require('path');


const productInfo = async (req, res) => {
    try {
        const categories = await Category.find({ isListed: true, isDeleted: false });
        const brands = await Brand.find({ isListed: true, isDeleted: false });

        const search  = req.query.search || "";
        const status = req.query.status || "All";
        const stockstatus = req.query.stockstatus ||"All";
        const categoryFilter = req.query.category || "";
        const brandFilter = req.query.brand || "";
        const page = parseInt(req.query.page) || 1 ;
        const limit = 5

        const query = { isDeleted: false };

        if (search) {
            query.productName = { $regex: search.trim(), $options: 'i' };
        }
        if (status !== "All") {
            query.isListed = status === 'Listed';
        }
        if (stockstatus !== "All") {
            if (stockstatus === "Available") {
                query.quantity = { $gt: 0 }; 
            } else if (stockstatus === "out of stock") {
                query.quantity = 0; 
            }
        }
        if(categoryFilter) {
            query.category = categoryFilter;
        }
        if (brandFilter) {
            query.brand = brandFilter; 
        }

        const productData = await Product.find(query)
            .populate("category")
            .populate("brand")
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit)
            .exec();

        const count = await Product.countDocuments(query);

        res.render("admin/products", { 
            productData,
            page,
            limit,
            count,
            search,
            stockstatus,
            status,
            brands,
            categories,
            category:categoryFilter,
            brand: brandFilter

        });
    } catch (error) {

        console.error('Error in brandInfo:', error);
        res.status(500).render('error', { message: 'Error fetching brand data' });   
    }
}

const getAddProductPage = async (req, res) => {
    try {
        const categories = await Category.find({ isListed: true, isDeleted: false });
        const brands = await Brand.find({ isListed: true, isDeleted: false });
        let product = null

        if(req.params.id) {
            product = await Product.findById(req.params.id)
                           .populate("category")
                           .populate("brand");

            if (!product || product.isDeleted) {
                return res.status(404).render("error", { message: "Product not found" });
            }               
                  
        }
        res.render('admin/addEditProducts', {
            categories,
            brands,
            product

        });
    } catch (error) {
        console.error('Error loading add product page:', error);
        res.status(500).json({ success: false, message: 'Failed to load addEdit product page' });
    }
};

const addProduct = async (req, res) => {
    try {
        console.log('Request Body:', req.body);
        console.log('Files:', req.files);

        const {
            productName, description, category, brand,
            regularPrice, salePrice, quantity, status
        } = req.body;

        // Parse specifications
        let specifications = [];
        if (req.body.specifications) {
            specifications = Object.entries(req.body.specifications).map(([_, spec]) => ({
                name: spec.name,
                value: spec.value
            }));
        }

        const cardImage = req.files?.['cardImage']?.[0]?.filename;
        const productImages = req.files?.['productImages']?.map(file => file.filename) || [];

        const product = {
            productName,
            description,
            category,
            brand,
            regularPrice: parseFloat(regularPrice || 0),
            salePrice: parseFloat(salePrice || 0),
            productOffer: parseFloat((((regularPrice - salePrice) / regularPrice) * 100 || 0).toFixed(2)),
            quantity: parseInt(quantity || 0),
            specifications,
            status,
            cardImage,
            productImages
        };

        // Validate product data
        const errors = validateProduct(product);
        if (Object.keys(errors).length > 0) {
            console.log('Validation errors:', errors);
            return res.status(400).json({ success: false, errors });
        }

        // Save to database
        const newProduct = new Product(product);
        await newProduct.save();

        res.setHeader('Cache-Control', 'no-store');

        console.log('Product added successfully:', newProduct);
        return res.status(201).json({
            success: true,
            message: 'Product added successfully',
            product: newProduct
        });
    } catch (error) {
        console.error('Error adding product:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message,
            error: error.errors || error.message
        });
    }
};

// const editProduct = async (req, res) => {
//     try {
//         const productId = req.params.id;
//         const { productName, description, category, brand, regularPrice, salePrice, quantity, status, specifications, removeCardImage, removedImages } = req.body;

//         const existingProduct = await Product.findById(productId);
//         if (!existingProduct) {
//             return res.status(404).json({ success: false, message: 'Product not found' });
//         }

//         let parsedSpecifications = existingProduct.specifications;
//         if (specifications) {
//             parsedSpecifications = Object.entries(specifications).map(([_, spec]) => {
//                 if (!spec.name || !spec.value) throw new Error('Invalid specification format');
//                 return { name: spec.name, value: spec.value };
//             });
//         }

//         const updateData = {
//             productName, description, category, brand,
//             regularPrice: parseFloat(regularPrice || 0),
//             salePrice: parseFloat(salePrice || 0),
//             productOffer: parseFloat((((regularPrice - salePrice) / regularPrice) * 100 || 0).toFixed(2)),
//             quantity: parseInt(quantity || 0),
//             specifications: parsedSpecifications,
//             status,
//             cardImage: req.files?.['cardImage']?.[0]?.filename || (removeCardImage === 'true' ? '' : existingProduct.cardImage),
//             productImages: existingProduct.productImages
//         };

//         const uploadDir = path.join(__dirname, '../public/uploads/products');
//         const deletedFiles = [];

//         try {
//             if (req.files?.['cardImage'] && existingProduct.cardImage) {
//                 const oldCardImagePath = path.join(uploadDir, existingProduct.cardImage);
//                 await fs.unlink(oldCardImagePath);
//                 deletedFiles.push(oldCardImagePath);
//             } else if (removeCardImage === 'true' && existingProduct.cardImage) {
//                 const oldCardImagePath = path.join(uploadDir, existingProduct.cardImage);
//                 await fs.unlink(oldCardImagePath);
//                 deletedFiles.push(oldCardImagePath);
//             }

//             if (req.files?.['productImages']) {
//                 for (const oldImage of existingProduct.productImages) {
//                     const oldImagePath = path.join(uploadDir, oldImage);
//                     await fs.unlink(oldImagePath);
//                     deletedFiles.push(oldImagePath);
//                 }
//                 updateData.productImages = req.files['productImages'].map(file => file.filename);
//             } else if (removedImages) {
//                 const removedIndices = Object.keys(removedImages).map(index => parseInt(index));
//                 const imagesToDelete = existingProduct.productImages.filter((_, index) => removedIndices.includes(index));
//                 for (const image of imagesToDelete) {
//                     const imagePath = path.join(uploadDir, image);
//                     await fs.unlink(imagePath);
//                     deletedFiles.push(imagePath);
//                 }
//                 updateData.productImages = existingProduct.productImages.filter((_, index) => !removedIndices.includes(index));
//             }

//             const errors = validateProduct(updateData);
//             if (Object.keys(errors).length > 0) {
//                 return res.status(400).json({ success: false, errors });
//             }

//             const updatedProduct = await Product.findByIdAndUpdate(productId, { $set: updateData }, { new: true, runValidators: true });
//             res.json({ success: true, message: 'Product updated successfully', product: updatedProduct });
//         } catch (error) {
//             // Rollback file deletions if database update fails
//             for (const filePath of deletedFiles) {
//                 await fs.writeFile(filePath, '').catch(() => {}); // Simplified rollback; ideally restore original files
//             }
//             throw error;
//         }
//     } catch (error) {
//         console.error('Edit product error:', error.stack);
//         res.status(500).json({ success: false, message: 'Server error: ' + error.message });
//     }
// };

const editProduct = async (req, res) => {
    console.log("add product funtion")
    try {
        const productId = req.params.id;
        const { 
               productName, description, category,
               brand, regularPrice, salePrice, quantity,
                status ,specifications ,removeCardImage, removedImages
            } = req.body;

        console.log('Request body:', req.body);
        console.log('Files:', req.files);

        const existingProduct = await Product.findById(productId);
        if (!existingProduct) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        let parsedSpecifications = existingProduct.specifications;
        if (specifications) {
            parsedSpecifications = Object.entries(specifications).map(([_, spec]) => ({
                name: spec.name,
                value: spec.value
            }));
        }

        const updateData = {
            productName,
            description,
            category,
            brand,
            regularPrice: parseFloat(regularPrice || 0),
            salePrice: parseFloat(salePrice || 0),
            productOffer: parseFloat((((regularPrice - salePrice) / regularPrice) * 100 || 0).toFixed(2)),
            quantity: parseInt(quantity || 0),
            specifications: parsedSpecifications,
            status,
            cardImage: req.files?.['cardImage']?.[0]?.filename || (removeCardImage === 'true' ? '' : existingProduct.cardImage),
            productImages: existingProduct.productImages // Preserve existing images by default
        };

        // Define the upload directory
        const uploadDir = path.join(__dirname, '../public/uploads/products');

        // Clean up old card image 
        if (req.files?.['cardImage'] && existingProduct.cardImage) {
            const oldCardImagePath = path.join(uploadDir, existingProduct.cardImage);
            await fs.unlink(oldCardImagePath).catch(err => console.log('Old card image deletion failed:', err));
        } else if (removeCardImage === 'true' && existingProduct.cardImage) {
            const oldCardImagePath = path.join(uploadDir, existingProduct.cardImage);
            await fs.unlink(oldCardImagePath).catch(err => console.log('Old card image deletion failed:', err));
        }

        // Handle product images
        if (req.files?.['productImages']) {
            for (const oldImage of existingProduct.productImages) {
                const oldImagePath = path.join(uploadDir, oldImage);
                await fs.unlink(oldImagePath).catch(err => console.log('Old product image deletion failed:', err));
            }
            updateData.productImages = req.files['productImages'].map(file => file.filename);
        } else if (removedImages) {
            const removedIndices = Object.keys(removedImages).map(index => parseInt(index));
            const imagesToDelete = existingProduct.productImages.filter((_, index) => removedIndices.includes(index));
            for (const image of imagesToDelete) {
                const imagePath = path.join(uploadDir, image);
                await fs.unlink(imagePath).catch(err => console.log('Old product image deletion failed:', err));
            }
            updateData.productImages = existingProduct.productImages.filter((_, index) => !removedIndices.includes(index));
        }

        const errors = validateProduct(updateData);
        if (Object.keys(errors).length > 0) {
            console.log('Validation errors:', errors);
            return res.status(400).json({ success: false, errors });
        }

        // Update product
        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        res.setHeader('Cache-Control', 'no-store');
        res.json({
            success: true,
            message: 'Product updated successfully',
            product: updatedProduct
        });

    } catch (error) {
       console.error('Edit product error:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message,
            error: error.message
        });
    }
};

const viewProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('category')
            .populate('brand');

        if (!product) {
            return res.status(404).render('error', { message: 'Product not found' });
        }

        res.render('admin/viewProduct', { product });
    } catch (error) {
        console.error('Error viewing product:', error);
        res.status(500).render('error', { message: 'Server error' });
    }
};


const getEditProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId).populate('category brand'); 
        const categories = await Category.find();
        const brands = await Brand.find(); 

        if (!product) {
            return res.status(404).send('Product not found');
        }

        res.render('admin/addEditProducts', {
            product,
            categories,
            brands,
            
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
};

const deleteProduct = async (req , res) => {
  try {
          const {id} = req.params;
          const product = await Product.findByIdAndUpdate(
              id,
              {
                  isDeleted:true,
                  isListed:false,
                  updatedAt : Date.now()
              },
              { new:true }
          );
  
          if(! product) {
              return res.status(404).json({ success: false, message: 'product not found' });
          }
  
          res.setHeader('Cache-Control', 'no-store');
          res.json({ 
              success: true, 
              message: 'Product deleted successfully',
          });
  
      } catch (error) {
          console.error('Error deleting product:', error);
          res.status(500).json({ success: false, message: 'Failed to delete product' });
      }
}

const toggleProductStatus = async (req , res ) => {
   try {
           const id = req.params.id;
           const product = await Product.findById(id); 
   
           if (!product) {
               return res.status(404).json({ success: false, message: "Product not found" });
           }
           // Toggle Product status
           product.isListed = !product.isListed;
           await product.save();
   
           res.setHeader('Cache-Control', 'no-store');
           res.json({
               success: true,
               isListed: product.isListed,
               message: `Product status updated to ${product.isListed ? 'Listed' : 'Unlisted'}`
           });
   
       } catch (error) {
           console.error('Error toggling status:', error);
           res.status(500).json({ success: false, message: 'Failed to update status' });
       }
}

module.exports = { 
    getAddProductPage, 
    addProduct,
    productInfo,
    viewProduct,
    editProduct,
    getEditProduct,
    deleteProduct,
    toggleProductStatus
};