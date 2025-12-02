import { model, Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, "Email is Required"],
      trim: true,
      unique: [true, "Given Email Should be Unique"],
    },

    password: {
      type: String,
      required: [true, "Password is Required"],
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified(password)) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.isPasswordCorrect = async function (passwword) {
  return await bcrypt.compare(passwword, this.password);
};

userSchema.methods.genrateAccessToken = async function () {
  return await jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCRESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCRESS_TOKEN_EXPIRY,
    }
  );
};

export const User = model("User", userSchema);
