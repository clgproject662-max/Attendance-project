const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI;

        if (!uri || uri.includes('<username>') || uri.includes('admin:admin123@cluster0.mongodb.net')) {
            console.warn('\n============================================================');
            console.warn('⚠️  MONGODB_URI notice:');
            console.warn('   Please configure your real MongoDB Atlas connection string in:');
            console.warn('   backend/.env -> MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/...');
            console.warn('============================================================\n');
        }

        const conn = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000 // 5 second timeout for quick diagnostics
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host} (Database: ${conn.connection.name})`);
        return conn;
    } catch (error) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        console.warn('💡 Tip: Ensure your IP address is whitelisted in MongoDB Atlas Network Access (0.0.0.0/0)');
        console.warn('💡 Also verify your username, password, and database name in backend/.env');
        // Do not force process.exit() so server can still serve health check & informative error responses
    }
};

module.exports = connectDB;
