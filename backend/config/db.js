/**
 * MongoDB Database Connection
 * Handles connection with retry logic and event handling
 */

import mongoose from 'mongoose';

const connectDB = async () => {
    // MongoDB Atlas URI - use environment variable or default to Atlas
    const MONGODB_URI = process.env.MONGODB_URI || 
        'mongodb+srv://wmadhuka_db_user:e661YhV9aJ64VO23@cluster0.pmewjsl.mongodb.net/arecanut_manager?retryWrites=true&w=majority&appName=Cluster0';
    
    try {
        const conn = await mongoose.connect(MONGODB_URI, {
            // Modern mongoose doesn't need these, but good for clarity
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

        // Connection event handlers
        mongoose.connection.on('error', (err) => {
            console.error(`❌ MongoDB Error: ${err.message}`);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️ MongoDB Disconnected');
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log('MongoDB connection closed through app termination');
            process.exit(0);
        });

        return conn;
    } catch (error) {
        console.error(`❌ MongoDB Connection Failed: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;
