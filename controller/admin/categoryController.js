const Category = require('../../model/categorySchema');

const categoryInfo = async (req, res) => {
    try {
        const search = req.query.search || "";
        const status = req.query.status || "All";
        const page = parseInt(req.query.page) || 1;
        const limit = 5;

        const query = { isDeleted : false };

        if(search) {
           query.$or = [
            { name: { $regex: search.trim() , $options: 'i' } },
            // { description: { $regex: search.trim() , $options: 'i' } }
        ];

        }
        if (status !== "All") {
            query.isListed = status === 'Listed';
        }

        const categoryData = await Category.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit)
            .exec();

        const count = await Category.countDocuments(query);
        res.render("admin/categories", {
             categoryData, 
             page, 
             limit, 
             count, 
             search, 
             status
        });

    } catch (error) {
        console.error('Error in categoryInfo:', error);
        res.status(500).render('error', { message: 'Error fetching category data' });
    }
};

const toggleCategoryStatus = async (req, res) => {
    try {
        const id = req.params.id ;
        const category = await Category.findById(id);

        if(!category) {
            return res.status(404).json({success:false, message:"Category not found"})
        }

        // toggle category status 
        category.isListed = !category.isListed;
        await category.save();

        res.setHeader('Cache-Control', 'no-store');
        res.json({
            success: true,
            isListed: category.isListed,
            message: `Category status updated to ${category.isListed ? 'Listed' : 'Unlisted'}`
        });


    } catch (error) {
        console.error('Error toggling status:', error);
        res.status(500).json({ success: false, message: 'Failed to update status' });
        
    }
}

const addCategory = async (req, res) => {
    try {
        const {name ,description , categoryOffer} = req.body;

        const existing = await Category.findOne({name});

        if( existing && existing.isDeleted === true){

            existing.isDeleted = false;
            existing.description = description;
            existing.categoryOffer = categoryOffer
            existing.updatedAt = Date.now();
            existing.isListed = true
            await existing.save();
            return res.json({ success: true, message: 'Category restored successfully' });

        }else if( existing && existing.isDeleted === false) {
            return res.status(400).json({ success: false, message: 'Category name already exists' });
        }
           // /save if not found 
           await Category.create({ name, description, categoryOffer });
           res.setHeader('Cache-Control', 'no-store');
           res.json({ success: true, message: 'Category added successfully' });
          
        } catch (error) {
            console.error('Error adding category:', error);
            res.status(500).json({ success: false, message: 'Failed to add category' });
        
    }
  
}

const editCategory = async (req, res) => {
    try {

        const { name, description, categoryOffer } = req.body;
        const { id } = req.params;

        const category = await Category.findByIdAndUpdate(id ,
            {   name,
                description,
                categoryOffer,
                updatedAt : Date.now()
           },
           { new:true }
        )

        if(! category ){
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        res.setHeader('Cache-Control', 'no-store');
        res.json({ 
            success: true, 
            message: 'Category updated successfully',
        });
        
    } catch (error) {
        console.error('Error editing category:', error);
        res.status(500).json({ success: false, message: 'Failed to edit category' });
        
    }
}

const deleteCategory = async (req, res) => {
    try {
        const {id} = req.params;
        const category = await Category.findByIdAndUpdate(
            id,
            {
                isDeleted : true,
                isListed  : false,
                updatedAt : Date.now()
            },
            { new:true }
        );

        if(! category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        res.setHeader('Cache-Control', 'no-store');
        res.json({ 
            success: true, 
            message: 'Category deleted successfully',
        });

    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ success: false, message: 'Failed to delete category' });
    }
};

module.exports = { 
    categoryInfo, 
    addCategory, 
    editCategory, 
    toggleCategoryStatus, 
    deleteCategory 
};