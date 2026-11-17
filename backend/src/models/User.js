import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    supabaseId: {
      type: String,
      required: true,
      unique: true,
    },

    githubUsername: {
      type: String,
      default: null,
    },

    githubConnected: {
      type: Boolean,
      default: false,
    },

    fullName: {
      type: String,
      default: "",
    },

    email: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;