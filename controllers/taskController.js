const mongoose = require("mongoose");
const Task = require("../models/Task");
const Team = require("../models/Team");

const validateAssignedUsers = (assignedTo) => {
  if (!Array.isArray(assignedTo)) {
    throw new Error("AssignedTo must be an array of user IDs");
  }
  if (assignedTo.length === 0) {
    throw new Error("At least one user must be assigned to the task");
  }
};

//Team Assignment
const teamAssignment = async (team, teamName, assignedTo, title) => {
  let teamDoc, finalTeamId;

  if (team && mongoose.Types.ObjectId.isValid(team)) {
    teamDoc = await Team.findById(team);
    if (!teamDoc) throw new Error("Team not found");
    finalTeamId = team;
  } else if (teamName?.trim()) {
    const trimmedTeamName = teamName.trim();
    teamDoc = await Team.findOne({ teamName: trimmedTeamName });

    if (teamDoc) {
      finalTeamId = teamDoc._id;
    } else {
      teamDoc = await Team.create({
        teamName: trimmedTeamName,
        description: `Team created for task: ${title}`,
        members: assignedTo,
      });
      finalTeamId = teamDoc._id;
      return { teamDoc, finalTeamId, action: "created" };
    }
  } else {
    throw new Error("Either team ID or teamName is required");
  }

  // Update team members if needed
  const newMembers = assignedTo.filter(
    (userId) =>
      !teamDoc.members.some(
        (memberId) => memberId.toString() === userId.toString()
      )
  );

  if (newMembers.length > 0) {
    teamDoc.members = [...teamDoc.members, ...newMembers];
    teamDoc.updatedAt = new Date();
    await teamDoc.save();
  }

  return {
    teamDoc,
    finalTeamId,
    action: teamDoc.createdAt === teamDoc.updatedAt ? "created" : "updated",
  };
};

const getUserFilter = (user) => {
  return user.role === "admin" ? {} : { assignedTo: { $in: [user._id] } };
};

const calculateTaskProgress = (todoCheckList) => {
  if (!todoCheckList?.length) return 0;
  const completedCount = todoCheckList.filter((item) => item.completed).length;
  return Math.round((completedCount / todoCheckList.length) * 100);
};

const updateTaskStatus = (task) => {
  if (task.progress === 100) {
    task.status = "Completed";
  } else if (task.progress > 0) {
    task.status = "In Progress";
  } else {
    task.status = "Pending";
  }
};

//Create a Task
const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      priority,
      dueDate,
      assignedTo,
      attachments,
      todoCheckList,
      team,
      teamName,
    } = req.body;

    validateAssignedUsers(assignedTo);

    const { teamDoc, finalTeamId, action } = await teamAssignment(
      team,
      teamName,
      assignedTo,
      title
    );

    const task = await Task.create({
      title,
      description,
      priority,
      dueDate,
      assignedTo,
      createdBy: req.user._id,
      todoCheckList,
      attachments,
      team: finalTeamId,
    });

    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email profileImageUrl")
      .populate("team", "teamName description members");

    res.status(201).json({
      message: "Task created successfully",
      task: populatedTask,
      teamAction: action,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create task",
      error: error.message,
    });
  }
};

//Get all Tasks
const getTasks = async (req, res) => {
  try {
    const { status } = req.query;
    const baseFilter = getUserFilter(req.user);

    const filter = status ? { ...baseFilter, status } : baseFilter;
    let tasks = await Task.find(filter).populate(
      "assignedTo",
      "name email profileImageUrl"
    );
    tasks = tasks.map((task) => ({
      ...task._doc,
      completedTodoCount: task.todoCheckList.filter((item) => item.completed)
        .length,
    }));

    const statusCounts = await Promise.all([
      Task.countDocuments(baseFilter),
      Task.countDocuments({ ...baseFilter, status: "Pending" }),
      Task.countDocuments({ ...baseFilter, status: "In Progress" }),
      Task.countDocuments({ ...baseFilter, status: "Completed" }),
    ]);

    res.json({
      message: "All tasks",
      tasks,
      statusSummary: {
        all: statusCounts[0],
        pendingTasks: statusCounts[1],
        inProgressTasks: statusCounts[2],
        completedTasks: statusCounts[3],
      },
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Failed to fetch Tasks.", error: error.message });
  }
};

//Get task by Id
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate(
      "assignedTo",
      "name email profileImageUrl"
    );

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.status(200).json({ message: "Task found", task: task });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Failed to fetch Task by Id.", error: error.message });
  }
};

//Update a task
const updateTask = async (req, res) => {
  try {
    const { assignedTo, ...updateData } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Update basic fields
    Object.assign(task, updateData);

    if (assignedTo) {
      validateAssignedUsers(assignedTo);
      task.assignedTo = assignedTo;
    }

    const updatedTask = await task.save();
    res.status(200).json({
      message: "Task updated successfully",
      task: updatedTask,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update task",
      error: error.message,
    });
  }
};

// Delete a task
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task id not found." });
    }

    res.status(200).json({ message: "Task deleted successfully." });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Failed to delete a task by Id.",
      error: error.message,
    });
  }
};

//Update task status
const updateTasksStatus = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(400).json({ message: "Task not found." });

    const isAssigned = task.assignedTo.some(
      (userId) => userId.toString() === req.user._id.toString()
    );

    if (!isAssigned && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorizes." });
    }

    task.status = req.body.status || task.status;

    if (task.status === "Completed") {
      task.todoCheckList.forEach((item) => (item.completed = true));
      task.progress = 100;
    }

    const updatedTask = await task.save();
    res.status(200).json({
      message: "Task status updated successfully.",
      task: updatedTask,
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Failed to update a task.", error: error.message });
  }
};

//Update Task Checklist
const updateTaskCheckList = async (req, res) => {
  try {
    const { todoCheckList } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    if (!task.assignedTo.includes(req.user._id) && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Not authorized to update checklist" });
    }

    task.todoCheckList = todoCheckList;

    task.progress = calculateTaskProgress(todoCheckList);
    updateTaskStatus(task);

    await task.save();
    const updatedTask = await Task.findById(req.params.id).populate(
      "assignedTo",
      "name email profileImageUrl"
    );

    res.status(200).json({
      message: "Task checklist updated successfully.",
      task: updatedTask,
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Failed to update a task.", error: error.message });
  }
};

//Get Dashboard Data
const getAggregatedData = async (filter = {}) => {
  const [
    totalTasks,
    pendingTasks,
    completedTasks,
    overdueTasks,
    taskDistributionRaw,
    taskPriorityLevelsRaw,
    recentTasks,
  ] = await Promise.all([
    Task.countDocuments(filter),
    Task.countDocuments({ ...filter, status: "Pending" }),
    Task.countDocuments({ ...filter, status: "Completed" }),
    Task.countDocuments({
      ...filter,
      status: { $ne: "Completed" },
      dueDate: { $lt: new Date() },
    }),
    Task.aggregate([
      { $match: filter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Task.aggregate([
      { $match: filter },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
    ]),
    Task.find(filter)
      .sort({ createdAt: -1 })
      .limit(10)
      .select("title status priority dueDate createdAt"),
  ]);

  const taskStatus = ["Pending", "In Progress", "Completed"];
  const taskDistribution = taskStatus.reduce(
    (acc, status) => {
      const key = status.replace(/\s+/g, "");
      acc[key] =
        taskDistributionRaw.find((item) => item._id === status)?.count || 0;
      return acc;
    },
    { All: totalTasks }
  );

  const taskPriorities = ["Low", "Medium", "High"];
  const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
    acc[priority] =
      taskPriorityLevelsRaw.find((item) => item._id === priority)?.count || 0;
    return acc;
  }, {});

  return {
    statistics: { totalTasks, pendingTasks, completedTasks, overdueTasks },
    charts: { taskDistribution, taskPriorityLevels },
    recentTasks,
  };
};

const getDashboardData = async (req, res) => {
  try {
    const data = await getAggregatedData();
    res.status(200).json({ message: "Dashboard data", ...data });
  } catch (error) {
    res.status(500).json({
      message: "Failed to get dashboard data",
      error: error.message,
    });
  }
};

const getUserDashboardData = async (req, res) => {
  try {
    const filter = { assignedTo: req.user._id };
    const data = await getAggregatedData(filter);
    res.status(200).json({ message: "User dashboard data", ...data });
  } catch (error) {
    res.status(500).json({
      message: "Failed to get user dashboard data",
      error: error.message,
    });
  }
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  updateTasksStatus,
  updateTaskCheckList,
  getDashboardData,
  getUserDashboardData,
};
