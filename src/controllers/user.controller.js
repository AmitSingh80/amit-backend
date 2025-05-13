import {asyncHandler} from "../utils/asynchandler.js"
import { ApiError } from "../utils/apiError.js";
import {User} from "../models/user.model.js"
import{uploadOnCloudinary} from "../utils/fileUpload.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { response } from "express";
import jwt from "jsonwebtoken"


const genrateAccessAndRefreshToken = async (userId)=>{
  try {

      const user= await User.findById(userId)
      const accessToken=  user.generateAccessToken()
      const refreshToken= user.generateRefreshToken()
       
      user.refreshToken=refreshToken
      await user.save({validateBeforeSave:false})

      return {accessToken,refreshToken}

  } catch (error) {
    throw new ApiError(500,"Acces token not genrate")
  }
} 

const registerUser = asyncHandler(async (req,res)=>{
     // get user deatils from frontend
     // validation- not empty
     // check users is unique : username , email
     // check avatar (images)
     // upload them to cloudinary ,avatar
     // create user object - create entry in db
     //  remove password and refresh token field from response
     // check for user creation
     // return res
       
     const { fullName , email, password , username}=req.body
            // console.log("email:", email);
             

            if(
                [fullName,email,username,password].some((field)=> 
                 field?.trim() === "")
            ){
               throw new ApiError(400,"all fields are required")
            }
             
            const existedUser= await User.findOne({
                $or:[{username},{email}]
            })
             
            if(existedUser){
                throw new ApiError(409,"username ,email already exit  in data")
            }

            const avatarLocalPath=req.files?.avatar[0]?.path;
            console.log(avatarLocalPath);   
            
            // const coverImageLocalPath=req.files?.coverImage[0]?.path;
            // console.log(coverImageLocalPath);
            
            let coverImageLocalPath;
            if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
               coverImageLocalPath = req.files.coverImage[0].path
             }
            
            if(!avatarLocalPath){
                throw new ApiError(400,"Avatar file is required")
            }

           const avatar = await uploadOnCloudinary(avatarLocalPath)
          //  console.log(avatar);
           
           const coverImage= await uploadOnCloudinary(coverImageLocalPath)
            // console.log(coverImage);
            
           if(!avatar){
            throw new ApiError(400,"Avatar required")

           }

           const user = await User.create({
            fullName,
            avatar:avatar.url,
            coverImage: coverImage?.url|| "",
            email,
            password,
            username: username.toLowerCase()
           })
           
          const createdUser= await User.findById(user._id).select(
            "-password -refreshToken"
          )
          if(!createdUser){
            throw new ApiError(500,"data created failed by uplaoding/ register the user")
          }
           
          return res.status(201).json(
            new ApiResponse(200,createdUser,"user register succesfully:  hurrey!!!!")
          )


            //for single data entry

           // if(fullName===""){
            //     throw new ApiError(400, "fullname is required")
            // }
            

})

const loginUser= asyncHandler(async(req,res)=>{
       //req body => data
       //username or email
       //find the user 
       // password check
       // access and refresh token
      //  send cookie

      const {email,username ,password}= req.body
      console.log(email);

        // if(!username || !email){
        if(!username && !email){
        
        throw new ApiError(400,"username or email is required")
    }
  // }

      
    //   if(!(username || email)){
        
    //     throw new ApiError(400,"username or email is required")
    // }

      const user = await User.findOne({
      $or: [{username},{email}]
      })

      if(!user){
        throw new ApiError(400," user does not register")
      }

      const isPasswordValid =await user.isPasswordCorrect(password)

      if(!isPasswordValid){
        throw new ApiError(400,"password is wrong or invalid")
      }

      const{accessToken,refreshToken} = await genrateAccessAndRefreshToken(user._id)
      
      const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

        const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser
            },
            "User logged In Successfully"
        )
    )

})

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out successfully "))
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
  const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken

  if(!incomingRefreshToken){
    throw new ApiError(401,"Unauthorize incoming token  ")
  }

   try {
    const decodedToken =jwt.verify(
     incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET
    )
 
    const user = await user.findById(decodedToken?._id)
 
    if(!user){
     throw new ApiError (401,"Invalid refresh token")
    }
 
    if(incomingRefreshToken !== user?.refreshToken){
     throw new ApiError (401, " Refresh token expired or used")
    }
 
    const options ={
     httpOnly: true,
     secure: true
    }
    const {accessToken,newRefreshToken}= await genrateAccessAndRefreshToken(user._id)
     
     return res.status(200)
     .cookie("accessToken",accessToken,options)
     .cookie("refreshToken" , newRefreshToken,options)
      .json(
       ApiResponse(200,
         {
            accessToken ,refreshToken:newRefreshToken
       },
       "newRefreshToken: Now  Access token refresh "
     )
      )
 
   } catch (error) {
     throw new ApiError(500, error?.message || "Invalid refresh token")
    
   }

})

const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body

    

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
})

  const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user,
        "User fetched successfully"
    ))
})


const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        {new: true}
        
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
});
  

  const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    //TODO:  hii!! delete old image -

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar, plz check")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Hurreeeyy!!: Avatar image updated successfully")
    )
  })

  const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    }

    //TODO: delete old image - assignment


    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user,"Hurreeyy!! : cover image updated  successfully ")
    )
    })
  


export {registerUser,loginUser,logoutUser, 
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage
}