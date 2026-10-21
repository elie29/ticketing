import mongoose from 'mongoose';

interface TicketAttrs {
  title: string;
  price: number;
  userId: string;
}

interface TicketDoc extends mongoose.Document<mongoose.Types.ObjectId> {
  id: string;
  title: string;
  price: number;
  userId: string;
  version: number; // offset
  orderId?: string;
}

interface TicketModel extends mongoose.Model<TicketDoc> {
  build(attrs: TicketAttrs): TicketDoc;
}

const ticketSchema = new mongoose.Schema<TicketDoc, TicketModel>(
  {
    title: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    orderId: {
      type: String,
    },
  },
  {
    toJSON: {
      transform(doc, ret) {
        const { _id, ...ticket } = ret;
        return { ...ticket, id: _id };
      },
    },
  }
);
ticketSchema.set("versionKey", "version"); // version instead of __v
ticketSchema.set('optimisticConcurrency', true);
ticketSchema.pre('save', function () {
  if (!this.isNew) this.markModified('version');
});

ticketSchema.statics.build = (attrs: TicketAttrs) => {
  return new Ticket(attrs);
};

const Ticket = mongoose.model<TicketDoc, TicketModel>("Ticket", ticketSchema);

export { Ticket };
