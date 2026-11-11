const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const PHONE_EMAIL_DOMAIN = '@phone.hungrybirds.local';

const addressSchema = new mongoose.Schema({
  label: { type: String, default: 'Home', trim: true, maxlength: 30 }, // Home / Work / Other
  fullAddress: { type: String, required: true, trim: true, maxlength: 300 },
  lat: { type: Number, required: true, min: -90, max: 90 },
  lng: { type: Number, required: true, min: -180, max: 180 },
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    // select:false → the hash is never returned unless explicitly requested.
    password: { type: String, required: true, select: false },
    addresses: [addressSchema],
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' }],
    role: { type: String, enum: ['customer', 'admin', 'agent'], default: 'customer' },
  },
  { timestamps: true },
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function comparePassword(entered) {
  return bcrypt.compare(entered, this.password);
};

userSchema.methods.toPublic = function toPublic() {
  return {
    _id: this._id,
    name: this.name,
    // Accounts created with phone OTP get an internal placeholder email that is never shown.
    email: this.email.endsWith(PHONE_EMAIL_DOMAIN) ? '' : this.email,
    phone: this.phone,
    role: this.role,
    addresses: this.addresses,
    favorites: this.favorites,
  };
};

module.exports = mongoose.model('User', userSchema);
module.exports.PHONE_EMAIL_DOMAIN = PHONE_EMAIL_DOMAIN;
