import mongoose from "mongoose"
import { DB_NAME } from "../constants.js"


const connectDB= async ()=>{
    try {
        const conectionString = await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)
        console.log(`Mongodb connection successfuly: ${conectionString.connection.host}`);
        
    } catch (error) {
        console.log("connection  database failed :",error);
        throw error
        
        
    }
}

export default connectDB