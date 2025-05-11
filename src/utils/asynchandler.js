const asyncHandler= (requestHandlser)=>{
   return  (req,res,next)=>{
        Promise.resolve(requestHandlser(req,res,next))
        .catch((err) => next(err))
    }
}



export {asyncHandler}


// const asynchandler=(fn)=> ()=>{}

// const asynchandler=(fn)=> async(req,res,next)=>{
//     try {
//         await fn(req,res,next)
//     } catch (error) {
//         res.status(500).json({
//             success:false,
//             message:error.message
//         })
//     }
// }



