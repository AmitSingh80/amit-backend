import {asyncHandler} from "../utils/asynchandler.js"

const registerUser = asyncHandler(async (req,res)=>{
     res.status(200).json({
        success: true,
         message: "you can register data ",
     })
   

})

export {registerUser}