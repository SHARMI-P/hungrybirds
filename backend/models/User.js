const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema({
  label:       { type: String, default: 'Home' },   // Home / Work / Other
  fullAddress: { type: String, required: true },
  lat:         { type: Number, required: true },
  lng:         { type: Number, required: true },
});

const userSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  phone:     { type: String, required: true },
  password:  { type: String, required: true },
  addresses: [addressSchema],
  role:      { type: String, enum: ['customer', 'admin'], default: 'customer' },
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
