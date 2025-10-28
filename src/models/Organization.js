import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Organization (B2B Anchor Account)
 * Represents an event management company, agency, or creative collective
 * that manages multiple users (creatives and admins) within GetVybz.
 */
const organizationSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
    },
    contactEmail: {
      type: String,
      required: [true, "Contact email is required"],
      lowercase: true,
      trim: true,
    },
    contactPhone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    subscriptionPlan: {
      type: String,
      enum: ["free", "pro", "enterprise"],
      default: "free",
    },
    billingInfo: {
      cardLast4: String,
      billingEmail: String,
      nextBillingDate: Date,
    },
    users: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          enum: ["admin", "manager", "creative", "finance"],
          default: "creative",
        },
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    verifiedAt: Date,
  },
  {
    timestamps: true,
  }
);

organizationSchema.index({ name: 1, contactEmail: 1 }, { unique: true });

const Organization = mongoose.model("Organization", organizationSchema);
export default Organization;
