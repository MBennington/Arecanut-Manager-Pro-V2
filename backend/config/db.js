/**
 * MongoDB Database Connection
 * Handles connection with retry logic and event handling
 */

import mongoose from 'mongoose';

const connectDB = async () => {
    // Prefer explicit URI; fall back to default Atlas SRV
    let uri = process.env.MONGODB_URI ||
        'mongodb+srv://wmadhuka_db_user:e661YhV9aJ64VO23@cluster0.pmewjsl.mongodb.net/arecanut_manager?retryWrites=true&w=majority&appName=Cluster0';

    // If SRV lookup fails (ECONNREFUSED on querySrv), try standard URI if set
    const standardUri = process.env.MONGODB_URI_STANDARD;
    const isSrvError = (err) => err.message && (
        err.message.includes('querySrv') ||
        err.message.includes('ECONNREFUSED') ||
        err.message.includes('getaddrinfo')
    );

    const tryConnect = async (connectionUri) => {
        return mongoose.connect(connectionUri, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 45000,
        });
    };

    try {
        let conn = await tryConnect(uri);

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

        mongoose.connection.on('error', (err) => {
            console.error(`❌ MongoDB Error: ${err.message}`);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️ MongoDB Disconnected');
        });

        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log('MongoDB connection closed through app termination');
            process.exit(0);
        });

        return conn;
    } catch (error) {
        if (isSrvError(error) && standardUri) {
            console.warn('⚠️ SRV lookup failed, trying standard connection string...');
            try {
                const conn = await tryConnect(standardUri);
                console.log(`✅ MongoDB Connected (standard): ${conn.connection.host}`);
                return conn;
            } catch (e) {
                console.error(`❌ MongoDB Connection Failed: ${e.message}`);
                process.exit(1);
            }
        }

        console.error(`❌ MongoDB Connection Failed: ${error.message}`);
        if (error.message.includes('querySrv') || error.message.includes('ECONNREFUSED')) {
            console.error(`
Troubleshooting (querySrv / ECONNREFUSED):
1. Resume cluster: MongoDB Atlas free tier pauses after 60 days. Log in to cloud.mongodb.com → your cluster → "Resume".
2. Check network: Ensure this machine can reach the internet and DNS (e.g. try ping cluster0.pmewjsl.mongodb.net).
3. Try different DNS: Use Google DNS (8.8.8.8) or another DNS if your network blocks SRV lookups.
4. Use standard URI: In .env set MONGODB_URI_STANDARD with the "Standard connection string" from Atlas (Connect → Drivers → "I have a connection string" → toggle off SRV).
`);
        }
        process.exit(1);
    }
};

export default connectDB;
