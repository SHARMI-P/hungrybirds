// Test environment. A real MongoDB is used (local mongod or the CI service container).
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.MONGO_TEST_URI || 'mongodb://127.0.0.1:27017/hungrybirds_test';
process.env.JWT_SECRET = 'test-secret-that-is-long-enough';
process.env.RAZORPAY_KEY_ID = 'rzp_test_key';
process.env.RAZORPAY_KEY_SECRET = 'rzp_test_secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'rzp_webhook_secret';
process.env.CLIENT_ORIGINS = 'http://localhost:3000';
delete process.env.CLOUDINARY_CLOUD_NAME;
