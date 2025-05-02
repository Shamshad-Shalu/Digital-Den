const Coupon = require("../../model/couponSchema");
const User = require("../../model/userSchema");
const {validateCoupon } = require("../../utils/validation");

const getCoupons = async (req,res , next)=>{
    try {

        let { search = '', start = '', end = '', type = 'All', status  = 'All', page } = req.query;

        page = parseInt(page) || 1;
        let limit = 5;

        let query = {};
        if (search) {
            query.code = { $regex: search.trim(), $options: 'i' };
        }
        await updateCouponStatuses();
        
        if (type !== 'All') query.type = type;
        if (status !== 'All') query.status = status;
        if (start || end) {
            query.expireOn = {};
            
            if (start) {
                query.expireOn.$gte = new Date(start);
            }
            
            if (end) {
                const endDate = new Date(end);
                endDate.setHours(23, 59, 59, 999);
                query.expireOn.$lte = endDate;
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
        error.statusCode = 500; 
        next(error);
    }
}

const addCoupon = async (req ,res ,next) => {
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
        error.statusCode = 500; 
        next(error);
    }
}

const editCoupon = async (req , res, next)=> {
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


        const coupon = await Coupon.findById(id);
        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }

        // Determine updated status
        const now = new Date();
        const expireDate = new Date(expireOn);
        const status =
            expireDate < now ? 'Expired' :
            coupon.status === 'Disabled' ? 'Disabled' : 'Active';

        // Update the coupon
        coupon.set({
            ...couponData,
            status,
            updatedAt: Date.now()
        });
        await coupon.save();
    

        res.setHeader('Cache-Control', 'no-store');
        res.json({
            success: true,
            message: 'Coupon updated successfully',
        });
        
    } catch (error) {
        error.statusCode = 500; 
        next(error);
    }
};

const toggleCouponStatus = async(req ,res , next)=>{
    try {
        await updateCouponStatuses();
        const id = req.params.id;
        const {status} = req.body;

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
        error.statusCode = 500; 
        next(error);
    }
}

// update coupon status
const updateCouponStatuses = async () => {
    try {
        const now = new Date();

        const coupons = await Coupon.find();
        const bulkOps = coupons.map(coupon => {
            const newStatus = new Date(coupon.expireOn) < now ? 'Expired' :
            coupon.status === 'Disabled' ? 'Disabled' : 'Active'; 
            
            if (coupon.status !== newStatus) {
                return {
                    updateOne: {
                        filter: { _id: coupon._id },
                        update: { $set: { status: newStatus, updatedAt: new Date() } }
                    }
                };
                
            }
        }).filter(Boolean); 

        if (bulkOps.length > 0) {
            await Coupon.bulkWrite(bulkOps);
            
            console.log(`Updated ${bulkOps.length} coupon status(es).`);
        }
       
    } catch (error) {
        console.error('Error updating coupon statuses:', error.message);
    }
};

module.exports ={
    getCoupons,
    addCoupon,
    editCoupon,
    toggleCouponStatus
}