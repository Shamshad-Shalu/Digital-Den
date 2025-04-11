const Coupon = require("../../model/couponSchema");
const User = require("../../model/userSchema");

const {validateCoupon } = require("../../utils/validation");

const getCoupons = async (req,res)=>{
    try {

        let { search = '', start = '', end = '', type = 'All', status  = 'All', page } = req.query;

        page = parseInt(page) || 1;
        let limit = 5;

        let query = {};
        if (search) {
            query.code = { $regex: search.trim(), $options: 'i' };
        }
        
        if (type !== 'All') query.type = type;
        if (status !== 'All') query.status = status;
       
        if (start || end) {
            query.expireOn = {};
            
            if (start) {
                query.expireOn.$gte = new Date(start);
            }
            
            if (end) {
                query.expireOn.$lte = new Date(end);
                // Set time to end of day for the end date
                query.expireOn.$lte.setHours(23, 59, 59, 999);
            }
        }
        const count = await Coupon.countDocuments(query);
            
        const coupons = await Coupon.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit)
            .exec();


        if (req.xhr || req.headers["x-requested-with"] === "XMLHttpRequest") {
            return res.status(200).json({ 
                success: true, 
                coupons,
                page,
                limit,
                count
            });
        }

        res.render("admin/coupons", { 
            coupons:coupons || [],
            page,
            limit,
            count,
            search,
            start,
            end,
            status,
            type
        });

    } catch (error) {
        console.error("Error in getCoupons:", error.message);
        res.status(500).json({
            success: false,
            message: "Something Went Wrong!",
            redirectUrl:"/admin/pageError" 
        });
    }
}

const addCoupon = async (req ,res) => {
    try {
        const { code , discount ,type , minPurchase ,maxDiscount = null ,usageLimit = null ,expireOn } = req.body;
        const couponData = {
            code, discount,
            type, minPurchase,
            maxDiscount,
            expireOn ,
            usageLimit
        };
        
        const errors = await validateCoupon(couponData);
        if (errors) {
            console.log(errors)
            return res.status(400).json({ success: false, errors });
        }

        const coupon = new Coupon(couponData);
        await coupon.save();
        res.status(201).json({ success: true, message: 'Coupon added successfully', data: coupon });

    } catch (error) {
        console.error('Error adding coupon:', error);
        res.status(500).json({ success: false, message: 'Server error' }); 
    }
}

const editCoupon = async (req , res)=> {
    try {
        const { id } = req.params;
        const { code , discount ,type , minPurchase ,maxDiscount = null ,usageLimit = null ,expireOn } = req.body;
        const couponData = {
            code, discount,
            type, minPurchase,
            maxDiscount,
            expireOn ,
            usageLimit
        };

        const errors = await validateCoupon(couponData , id);
        if (errors) {
            console.log(errors)
            return res.status(400).json({ success: false, errors });
        };
        const coupon = await Coupon.findByIdAndUpdate( 
            id,
            {...couponData,
                updatedAt: Date.now()
            },
            { new: true }
        );

        if(!coupon){
            return res.status(404).json({ success: false, message: 'coupon not found' });
        } 

        res.setHeader('Cache-Control', 'no-store');
        res.json({
            success: true,
            message: 'Coupon updated successfully',
        });
        
    } catch (error) {
        console.error('Error editing coupon:', error);
        res.status(500).json({ success: false, message: 'Failed to edit coupon' });
    }
};

const toggleCouponStatus = async(req ,res)=>{
    try {
        const id = req.params.id;
        const {status} = req.body;

        console.log("coupon status:",status)

        const coupon = await Coupon.findById(id); 
        if (!coupon) {
            return res.status(404).json({ success: false, message: "coupon not found" });
        }

        if(coupon.status === "Expired"){
            return res.status(404).json({ success: false, message: "Cannot take action on expired Coupon" });
        }

        coupon.status = status;
        await coupon.save();


        console.log( `coupon status updated to ${status}`);

        res.setHeader('Cache-Control', 'no-store');
        res.json({
            success: true,
            status: coupon.status,
            message: `coupon status updated to ${status}`
        });

    } catch (error) {
        console.error('Error toggling status:', error);
        res.status(500).json({ success: false, message: 'Failed to update status' });
    }
}

module.exports ={
    getCoupons,
    addCoupon,
    editCoupon,
    toggleCouponStatus
}