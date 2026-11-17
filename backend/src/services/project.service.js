import Project from "../models/Project.js";

export const createProject = async (userId, projectData) => {
  return await Project.create({
    ...projectData,
    userId,
  });
};

export const getAllProjects = async (userId) => {
  return await Project.find({ userId }).sort({ createdAt: -1 });
};

export const getProjectById = async (userId, projectId) => {
  return await Project.findOne({
    _id: projectId,
    userId,
  });
};

export const updateProject = async (userId, projectId, updateData) => {
  return await Project.findOneAndUpdate(
    { _id: projectId, userId },
    updateData,
    { new: true, runValidators: true }
  );
};

export const deleteProject = async (userId, projectId) => {
  return await Project.findOneAndDelete({
    _id: projectId,
    userId,
  });
};w