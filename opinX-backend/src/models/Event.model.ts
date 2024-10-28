import { Schema, model, Document } from 'mongoose';

interface IEvent extends Document {
  eventId: string;
  title: string;
  description: string;
  yes: number;
  no: number;
  isClosed: boolean;
  startTime: Date;
  endTime: Date;
  users: string[];
}

const EventSchema = new Schema<IEvent>({
  eventId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String },
  yes: { type: Number, default: 5 },
  no: { type: Number, default: 5 },
  isClosed: { type: Boolean, default: false },
  startTime: { type: Date, required: false },
  endTime: { type: Date, required: false },
  users: [{ type: String }],
});

export default model<IEvent>('Event', EventSchema);
