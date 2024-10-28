import { Schema, model, Document } from 'mongoose';

interface IUserWallet extends Document {
  userId: string;
  walletId: string;
  balance: number;
  locked: number;
}

const UserWalletSchema = new Schema<IUserWallet>({
  userId: { type: String, required: true, unique: true },
  walletId: { type: String, required: true, unique: true },
  balance: { type: Number, required: true },
  locked: { type: Number, required: true },
});

export default model<IUserWallet>('UserWallet', UserWalletSchema);
