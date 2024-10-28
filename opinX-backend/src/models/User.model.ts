import { Schema, model, Document } from 'mongoose';

interface IUser extends Document {
  userId: string;
  email: string;
  name: string;
}

const UserSchema = new Schema<IUser>({
  userId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  name: { type: String, required: true },
});

export default model<IUser>('User', UserSchema);
