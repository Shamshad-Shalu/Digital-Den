const Brand = require('../../model/brandSchema');
const {updateProductsForBrand} = require("../../utils/helper")

const brandInfo = async (req, res) => {
    try {
        const search = req.query.search || "";
        const status = req.query.status || "All";
        const page = parseInt(req.query.page) || 1;
        const limit = 5;

        const query = { isDeleted: false };

        if (search) {
            query.brandName  = { $regex: search.trim(), $options: 'i' };
        }
    
        if (status !== "All") {
            query.isListed = status === 'Listed';
        }

        const brandData = await Brand.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit)
            .exec();

        const count = await Brand.countDocuments(query);
        res.render("admin/brands", { 
            brandData, 
            page,
            limit,
            count,
            search,
            status
        });

    } catch (error) {
        console.error('Error in brandInfo:', error);
        res.status(500).render('error', { message: 'Error fetching brand data' });
    }
};

const toggleBrandStatus = async (req, res) => {
    try {
        const id = req.params.id;
        const brand = await Brand.findById(id); 

        if (!brand) {
            return res.status(404).json({ success: false, message: "Brand not found" });
        }

        // Toggle brand status
        brand.isListed = !brand.isListed;
        await brand.save();
        await updateProductsForBrand(brand._id);

        res.setHeader('Cache-Control', 'no-store');
        res.json({
            success: true,
            isListed: brand.isListed,
            message: `Brand status updated to ${brand.isListed ? 'Listed' : 'Unlisted'}`
        });

    } catch (error) {
        console.error('Error toggling status:', error);
        res.status(500).json({ success: false, message: 'Failed to update status' });
    }
};

const addBrand = async (req, res) => {
    try {
        let { name, brandOffer } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Invalid brand name' });
        }
        const existingBrand = await Brand.findOne({ 
            brandName: { $regex: new RegExp(`^${name}$`, 'i') }
        });
        
        if (existingBrand) {
            if (existingBrand.isDeleted) {
                existingBrand.brandName = name;
                existingBrand.isDeleted = false;
                existingBrand.brandOffer = brandOffer;
                existingBrand.updatedAt = Date.now();
                existingBrand.isListed = true;
                await existingBrand.save();
                await updateProductsForBrand(existingBrand._id);
                
                return res.json({ success: true, message: 'Brand restored successfully',});
            } else {
                // Brand exists and is active
                return res.status(400).json({ success: false, message: 'Brand name already exists'});
            }
        }
        
        // Create new brand if it doesn't exist
        const newBrand = await Brand.create({ 
            brandName: name, 
            brandOffer,
            isListed:true 
        });

        res.setHeader('Cache-Control', 'no-store');
        res.json({ success: true, message: 'Brand added successfully' });

    } catch (error) {
        console.error('Error adding brand:', error);
        res.status(500).json({ success: false, message: 'Failed to add brand' });
    }
};

const editBrand = async (req, res) => {
    try {
        const { name, brandOffer } = req.body; 
        const { id } = req.params;

        const existingBrand = await Brand.findOne({ 
            brandName: { $regex: new RegExp(`^${name}$`, 'i') }
        });
        
        if (existingBrand) {
            if (existingBrand.isDeleted) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'An Deleted Brand found with this name . Please restore it by adding with same Brand name ' 
                });
            } else {
                // Brand exists and is active
                return res.status(400).json({ success: false, message: 'Brand name already exists'});
            }
        }

        const brand = await Brand.findByIdAndUpdate( 
            id,
            {
                brandName:name,
                brandOffer, 
                updatedAt: Date.now()
            },
            { new: true }
        );

        if (!brand) {
            return res.status(404).json({ success: false, message: 'Brand not found' });
        }

        res.setHeader('Cache-Control', 'no-store');
        res.json({
            success: true,
            message: 'Brand updated successfully',
        });

    } catch (error) {
        console.error('Error editing brand:', error);
        res.status(500).json({ success: false, message: 'Failed to edit brand' });
    }
};

const deleteBrand = async (req, res) => {
    try {
        const { id } = req.params;
        const brand = await Brand.findByIdAndUpdate( 
            id,
            {
                isDeleted: true,
                isListed: false,
                updatedAt: Date.now()
            },
            { new: true }
        );

        if (!brand) {
            return res.status(404).json({ success: false, message: 'Brand not found' });
        }

        await updateProductsForBrand(brand._id);

        res.setHeader('Cache-Control', 'no-store');
        res.json({
            success: true,
            message: 'Brand deleted successfully',
        });

    } catch (error) {
        console.error('Error deleting brand:', error);
        res.status(500).json({ success: false, message: 'Failed to delete brand' });
    }
};

module.exports = {
    brandInfo, 
    addBrand,  
    editBrand, 
    toggleBrandStatus,
    deleteBrand 
};