const express = require("express");
const router = express.Router();
const adminController = require("../controller/admin/adminController.js"); 
const customerController = require("../controller/admin/customerController.js");
const categoryController = require("../controller/admin/categoryController.js");
const brandController = require("../controller/admin/brandController.js");
const productController = require("../controller/admin/productController.js");
const {adminAuth} = require("../middleware/auth.js");
const upload = require("../middleware/upload.js")


// login
router.get("/login",adminController.loadLoagin)
router.post("/login",adminController.login);
router.get("/logout",adminController.logout);
router.get("/pageError",adminController.pageError);

// Protected routes
router.use(adminAuth);

//dashboard-routes
router.get("/dashboard",adminController.loadDashboard);

//customer-routes
router.get("/users",customerController.customerInfo);
router.patch("/users/toggle/:id",customerController.toggleUserStatus);

//category-routes 
router.get('/categories', categoryController.categoryInfo);
router.post('/categories/add', categoryController.addCategory);
router.patch('/categories/edit/:id', categoryController.editCategory);
router.patch('/categories/toggle/:id', categoryController.toggleCategoryStatus);
router.patch('/categories/delete/:id', categoryController.deleteCategory);

//brand-routes 
router.get('/brands', brandController.brandInfo);
router.post('/brands/add', brandController.addBrand);
router.patch('/brands/edit/:id', brandController.editBrand);
router.patch('/brands/toggle/:id', brandController.toggleBrandStatus);
router.patch('/brands/delete/:id', brandController.deleteBrand);


// product-routes
router.get('/products', productController.productInfo);
router.get('/products/add', productController.getAddProductPage);
router.get("/products/view/:id",productController.viewProduct);
router.get('/products/edit/:id', productController.getEditProduct);
router.patch('/products/toggle/:id', productController.toggleProductStatus);
router.get('/products/delete/:id', productController.deleteProduct);
router.post('/products/add', upload.fields([
    { name: 'cardImage', maxCount: 1 },
    { name: 'productImages', maxCount: 4 }
]), productController.addProduct);
router.patch('/products/edit/:id', upload.fields([
    { name: 'cardImage', maxCount: 1 },
    { name: 'productImages', maxCount: 4 }
]), productController.editProduct);




module.exports = router;