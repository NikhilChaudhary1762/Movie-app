const mongoose = require('mongoose')
const dns = require('dns')

dns.setServers(['8.8.8.8', '8.8.4.4'])

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      autoSelectFamily: false,
      serverSelectionTimeoutMS: 30000,
    })

   console.log('Connected Database:', mongoose.connection.name)
   console.log('Database Host:', mongoose.connection.host)
  } catch (error) {
    console.error('MongoDB connection failed:', error.message)
    throw error
  }
}

module.exports = connectDB