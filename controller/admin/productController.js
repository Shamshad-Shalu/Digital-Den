const Product = require('../../model/productSchema');
const Category = require('../../model/categorySchema');
const Brand = require('../../model/brandSchema');
const  {determineStatus} = require("../../utils/helper")
const { validateProduct } = require('../../utils/validation');
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

          product.status = await determineStatus(product._id);
          await product.save();
  
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

           product.status = await determineStatus(product._id);
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



const addProduct = async (req, res) => {
    try {
      const {
        productName,
        description,
        category,
        brand,
        regularPrice,
        salePrice,
        quantity,
        specifications,
      } = req.body;
  
      // Parse specifications 
      let parsedSpecifications = [];
      if (specifications) {
        parsedSpecifications = Object.entries(specifications).map(([_, spec]) => ({
          name: spec.name,
          value: spec.value,
        }));
      }
  
      // Handle uploaded files
      const cardImage = req.files?.['cardImage']?.[0]?.filename;
      const productImages = req.files?.['productImages']?.map((file) => file.filename) || [];
  
      let parsedQuantity = parseInt(quantity || 0)
      const isListed = true;

      // Construct product object
      const product = {
        productName,
        description,
        category,
        brand,
        isListed,
        regularPrice: parseFloat(regularPrice || 0),
        salePrice: parseFloat(salePrice || 0),
        productOffer: parseFloat((((regularPrice - salePrice) / regularPrice) * 100 || 0).toFixed(2)),
        quantity: parsedQuantity,
        specifications: parsedSpecifications,
        cardImage,
        productImages,
      };
  
      // Validate
      const errors = validateProduct(product);
      if (Object.keys(errors).length > 0) {
        await cleanupFiles(req.files);
        return res.status(400).json({ success: false, errors });
      }
  
      // Save to database
      const newProduct = new Product(product);
      await newProduct.save();
  
      newProduct.status = await determineStatus(newProduct._id);
      await newProduct.save();
      
      res.setHeader('Cache-Control', 'no-store');
      return res.status(201).json({
        success: true,
        message: 'Product added successfully',
        product: newProduct,
      });
    } catch (error) {
      await cleanupFiles(req.files);
      console.error('Error adding product:', error);
      return res.status(500).json({ success: false, message: 'Server error: in add product  ' + error.message });
    }
  };


  // Edit Product
const editProduct = async (req, res) => {
    try {
      const productId = req.params.id;
      const {
        productName,
        description,
        category,
        brand,
        regularPrice,
        salePrice,
        quantity,
        specifications,
        removeCardImage,
        removedImages,
      } = req.body;
  
      // existing product
      const existingProduct = await Product.findById(productId);
      if (!existingProduct) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
  
      // Parse specifications
      let parsedSpecifications = existingProduct.specifications;
      if (specifications) {
        parsedSpecifications = Object.entries(specifications).map(([_, spec]) => ({
          name: spec.name,
          value: spec.value,
        }));
      }
  
      // Prepare image updates
      let cardImage = existingProduct.cardImage;
      let productImages = [...existingProduct.productImages]; // Start with existing images
      const uploadDir = path.join(__dirname, '../public/uploads/products');
      const deletedFiles = [];
  
      // Handle card image updates
      if (req.files?.['cardImage']) {
        cardImage = req.files['cardImage'][0].filename;
        if (existingProduct.cardImage) {
          deletedFiles.push(path.join(uploadDir, existingProduct.cardImage));
        }
      } else if (removeCardImage === 'true') {
        if (existingProduct.cardImage) {
          deletedFiles.push(path.join(uploadDir, existingProduct.cardImage));
        }
        cardImage = '';
      }
  
      // Handle product images updates
      if (req.files?.['productImages']) {
        // Append new images 
        const newImages = req.files['productImages'].map((file) => file.filename);
        productImages = [...productImages, ...newImages];
      }
  
      if (removedImages) {
        const removedIndices = Object.keys(removedImages).map((index) => parseInt(index));
        const imagesToDelete = existingProduct.productImages.filter((_, index) => removedIndices.includes(index));
        deletedFiles.push(...imagesToDelete.map((image) => path.join(uploadDir, image)));
        productImages = productImages.filter((_, index) => !removedIndices.includes(index));
      }
      let parsedQuantity = parseInt(quantity || 0)
      const isListed = true;

      const updateData = {
        productName,
        description,
        category,
        brand,
        regularPrice: parseFloat(regularPrice || 0),
        salePrice: parseFloat(salePrice || 0),
        productOffer: parseFloat((((regularPrice - salePrice) / regularPrice) * 100 || 0).toFixed(2)),
        quantity:parsedQuantity ,
        isListed,
        specifications: parsedSpecifications,
        cardImage,
        productImages,
      };
  
      // Validate 
      const errors = validateProduct(updateData);
      if (Object.keys(errors).length > 0) {
        await cleanupFiles(req.files);
        return res.status(400).json({ success: false, errors });
      }

      if (productImages.length < 3 || productImages.length > 4) {
        await cleanupFiles(req.files);
        return res.status(400).json({
          success: false,
          errors: { productImages: 'Product images must be between 3 and 4' },
        });
      }
  
      // Update product
      const updatedProduct = await Product.findByIdAndUpdate(
        productId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      updatedProduct.status = await determineStatus(updatedProduct._id);
      await updatedProduct.save();
  
      // Delete old files 
      await Promise.all(
        deletedFiles.map((filePath) =>
          fs.unlink(filePath).catch((err) => console.log('File deletion failed:', err))
        )
      );
      
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({success: true,
        message: 'Product updated successfully',product: updatedProduct,
     });
    } catch (error) {
      await cleanupFiles(req.files);
      console.error('Error editing product:', error.stack);
      return res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
  };
  
  // Helper function to clean
  async function cleanupFiles(files) {
    if (!files) return;
    const uploadDir = path.join(__dirname, '../public/uploads/products');
    const filePaths = [
      ...(files['cardImage'] || []).map((file) => path.join(uploadDir, file.filename)),
      ...(files['productImages'] || []).map((file) => path.join(uploadDir, file.filename)),
    ];
    await Promise.all(filePaths.map((filePath) => fs.unlink(filePath).catch(() => {})));
  }
  

  
const getAddProductPage = async (req, res) => {
    try {

        const categories = await Category.find({ isListed: true, isDeleted: false });
        const brands = await Brand.find({ isListed: true, isDeleted: false });

        res.render('admin/addProduct', {
            categories,
            brands,

        });
    } catch (error) {
        console.error('Error loading add product page:', error);
        res.status(500).json({ success: false, message: 'Failed to load addEdit product page' });
    }
};
  

const getEditProductPage = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
                .populate('category')
                .populate('brand');

        if (!product) {
            return res.status(404).send('Product not found');
        }

        const categories = await Category.find({ isListed: true, isDeleted: false });
        const brands = await Brand.find({ isListed: true, isDeleted: false });

        res.render('admin/editProduct', { product, categories, brands });
        
    } catch (error) {
        console.error('Error rendering edit product page:', error);
        res.status(500).send('Server Error');
    }
};


module.exports = { 
    getAddProductPage, 
    productInfo,
    viewProduct,
    getEditProduct,
    deleteProduct,
    toggleProductStatus,
    addProduct,
   editProduct,
   getAddProductPage,
   getEditProductPage,
};