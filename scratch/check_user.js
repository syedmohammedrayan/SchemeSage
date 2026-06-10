import mongoose from 'mongoose';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/schemesage';

const UserSchema = new mongoose.Schema({
  id: String,
  email: String,
  role: String,
  status: String
});

const UserModel = mongoose.model('UserVerify', UserSchema, 'users');

async function check() {
  await mongoose.connect(MONGODB_URI);
  const user = await UserModel.findOne({ email: 'admin@demo.com' });
  console.log('User found:', JSON.stringify(user, null, 2));
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
