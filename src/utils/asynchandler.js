const asynchandler= (requestHandlser)=>{
    (req,res,next)=>{
        Promise.resolve(requestHandlser(req,res,next))
        .catch((err) => next(err))
    }
}



export {asynchandler}


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



