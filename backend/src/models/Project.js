import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      ref: "User",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    repositoryUrl: {
      type: String,
      default: "",
    },

    source: {
      type: String,
      enum: ["github", "manual"],
      required: true,
    },

    status: {
      type: String,
      enum: ["unfinished", "abandoned", "active", "archived"],
      default: "unfinished",
    },

    abandonmentReason: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const Project = mongoose.model("Project", projectSchema);

export default Project;