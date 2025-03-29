const Coupon = require("../../model/couponSchema");


// Get Coupons
const getCoupons = async (req ,res) => {
    try {

        const {search , type , status ,  expireOn} = req.query;
        let query = {};

        if(search ){
            query.code = { $regex: search, $options: 'i' };
        }

        if(type) {
            query.type = type;
        }

        if(status){
            query.status = status;
        }
        if(expireOn) {
            
        }
        
    } catch (error) {
        
    }
} 