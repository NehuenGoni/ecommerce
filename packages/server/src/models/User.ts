import bcrypt from "bcrypt";
import mongoose, { Schema, type HydratedDocument, type Types } from "mongoose";

const SALT_ROUNDS = 10;

export type UserRole = "customer" | "admin";

export interface Address {
  label: string;
  street: string;
  city: string;
  province: string;
  zipCode: string;
  isDefault: boolean;
}

/** Una dirección guardada en la libreta del usuario: a diferencia del Address
 * embebido como snapshot en un Order, esta sí tiene _id propio, porque el
 * usuario la edita y borra individualmente. */
export interface SavedAddress extends Address {
  _id: Types.ObjectId;
}

export interface UserDocument {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
  addresses: Types.DocumentArray<SavedAddress>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const addressSchema = new Schema<SavedAddress>({
  label: { type: String, default: "" },
  street: { type: String, required: true },
  city: { type: String, required: true },
  province: { type: String, required: true },
  zipCode: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
});

const userSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Email inválido"],
    },
    password: { type: String, required: true, minlength: 8, select: false },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, default: "" },
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
    addresses: { type: [addressSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        const { password: _password, ...rest } = ret;
        return rest;
      },
    },
  },
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  next();
});

userSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export type UserHydratedDocument = HydratedDocument<UserDocument>;

export const User = mongoose.model<UserDocument>("User", userSchema);
