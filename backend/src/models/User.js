import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  phone: { type: String, default: '', trim: true, maxlength: 30 },
  zipCode: { type: String, default: '', trim: true, maxlength: 20 },
  birthday: { type: Date, default: null },
  gender: { type: String, enum: ['unspecified', 'female', 'male', 'other'], default: 'unspecified' },
  referralCode: { type: String, default: '', trim: true, maxlength: 40 },
  role: { type: String, enum: ['user', 'admin'], default: 'user', index: true },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
}, { timestamps: true, toJSON: { transform(_doc, ret) { delete ret.passwordHash; delete ret.__v; return ret; } } });

export const User = mongoose.model('User', userSchema);
