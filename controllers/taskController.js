const Task = require("../models/Task");
const Team = require("../models/Team");
//Create a Task
// const createTask = async (req, res) => {
//   try {
//     const {
//       title,
//       description,
//       priority,
//       dueDate,
//       assignedTo,
//       attachments,
//       todoCheckList,
//       team,
//       teamName,
//     } = req.body;

//     if (!Array.isArray(assignedTo)) {
//       return res
//         .status(400)
//         .json({ message: "AssignedTo must be an array of user's Id." });
//     }
//     if (assignedTo.length === 0) {
//       return res
//         .status(400)
//         .json({ message: "At least one user must be assigned to the task." });
//     }

//     if (!team) {
//       return res.status(400).json({ message: "Team ID is required." });
//     }

//     const teamDoc = await Team.findById(team);
//     if (!teamDoc) {
//       return res.status(404).json({ message: "Team not found." });
//     }
//     const task = await Task.create({
//       title,
//       description,
//       priority,
//       dueDate,
//       assignedTo,
//       createdBy: req.user._id,
//       todoCheckList,
//       attachments,
//       team,
//     });

//     res.status(201).json({ message: "Task created successfully", task: task });
//   } catch (error) {
//     console.log(error);
//     res
//       .status(500)
//       .json({ message: "Failed to fetch Tasks.", error: error.message });
//   }
// };

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

    if (!Array.isArray(assignedTo)) {
      return res
        .status(400)
        .json({ message: "AssignedTo must be an array of user's Id." });
    }
    if (assignedTo.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one user must be assigned to the task." });
    }

    let teamDoc;
    let finalTeamId;

    // Case 1: If team ID is provided, use existing team
    if (team && mongoose.Types.ObjectId.isValid(team)) {
      teamDoc = await Team.findById(team);
      if (!teamDoc) {
        return res.status(404).json({ message: "Team not found." });
      }
      finalTeamId = team;

      // Update existing team with new members (if they're not already in the team)
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
        console.log(
          `Updated team "${teamDoc.teamName}" with ${newMembers.length} new members`
        );
      }
    }
    // Case 2: If teamName is provided, create new team or update existing one
    else if (teamName && teamName.trim()) {
      const trimmedTeamName = teamName.trim();

      teamDoc = await Team.findOne({ teamName: trimmedTeamName });

      if (teamDoc) {
        finalTeamId = teamDoc._id;

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
          console.log(
            `Updated existing team "${trimmedTeamName}" with ${newMembers.length} new members`
          );
        }
      } else {
        // Create new team
        teamDoc = await Team.create({
          teamName: trimmedTeamName,
          description: `Team created for task: ${title}`,
          members: assignedTo,
        });
        finalTeamId = teamDoc._id;
        console.log(
          `Created new team "${trimmedTeamName}" with ${assignedTo.length} members`
        );
      }
    } else {
      return res.status(400).json({
        message: "Either team ID or teamName is required.",
      });
    }

    // Create the task
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

    // Populate the task with team and assignedTo details for response
    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email profileImageUrl")
      .populate("team", "teamName description members");

    res.status(201).json({
      message: "Task created successfully",
      task: populatedTask,
      teamAction:
        teamDoc.createdAt === teamDoc.updatedAt ? "created" : "updated",
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Failed to create task.", error: error.message });
  }
};

//Get all Tasks
const getTasks = async (req, res) => {
  try {
    const { status } = req.query;
    let filter = {};
    if (status) {
      filter.status = status;
    }

    let tasks;
    if (req.user.role === "admin") {
      tasks = await Task.find(filter).populate(
        "assignedTo",
        "name email profileImageUrl"
      );
    } else {
      tasks = await Task.find({
        ...filter,
        assignedTo: { $in: [req.user._id] },
      }).populate("assignedTo", "name email profileImageUrl ");
    }

    tasks = await Promise.all(
      tasks.map(async (task) => {
        const completedTaskCount = task.todoCheckList.filter(
          (item) => item.completed
        ).length;
        return { ...task._doc, completedTodoCount: completedTaskCount };
      })
    );

    const allTasks = await Task.countDocuments(
      req.user.role === "admin" ? {} : { assignedTo: req.user._id }
    );

    const pendingTasks = await Task.countDocuments({
      ...filter,
      status: "Pending",
      ...(req.user.role !== "admin" && { assignedTo: req.user._id }),
    });

    const inProgressTasks = await Task.countDocuments({
      ...filter,
      status: "In Progress",
      ...(req.user.role !== "admin" && { assignedTo: req.user._id }),
    });

    const completedTasks = await Task.countDocuments({
      ...filter,
      status: "Completed",
      ...(req.user.role !== "admin" && { assignedTo: req.user._id }),
    });

    res.json({
      message: "All Tasks.",
      tasks: tasks,
      statusSummary: {
        all: allTasks,
        pendingTasks,
        inProgressTasks,
        completedTasks,
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
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }
    task.title = req.body.title || task.title;
    task.description = req.body.description || task.description;
    task.priority = req.body.priority || task.priority;
    task.dueDate = req.body.dueDate || task.dueDate;
    task.todoCheckList = req.body.todoCheckList || task.todoCheckList;
    task.attachments = req.body.attachments || task.attachments;

    if (req.body.assignedTo) {
      if (!Array.isArray(req.body.assignedTo)) {
        return res
          .status(400)
          .json({ message: "AssignedTo must be an array of user ID's." });
      }
      task.assignedTo = req.body.assignedTo;
    }

    const updatedTask = await task.save();
    res
      .status(200)
      .json({ message: "Task updated successfully.", task: updatedTask });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Failed to update a task.", error: error.message });
  }
};

//Delete a Task
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task id not found." });
    }

    await task.deleteOne();
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

    const completedCount = task.todoCheckList.filter(
      (item) => item.completed
    ).length;
    const totalItems = task.todoCheckList.length;
    task.progress =
      totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

    if (task.progress === 100) {
      task.status = "Completed";
    } else if (task.progress > 0) {
      task.status = "In Progress";
    } else {
      task.status = "Pending";
    }
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
const getDashboardData = async (req, res) => {
  try {
    const totalTasks = await Task.countDocuments();
    const pendingTasks = await Task.countDocuments({ status: "Pending" });
    const completedTasks = await Task.countDocuments({
      status: "Completed",
    });
    const overdueTasks = await Task.countDocuments({
      status: { $ne: "Completed" },
      dueDate: { $lt: new Date() },
    });

    // All status are included
    const taskStatus = ["Pending", "In Progress", "Completed"];
    const taskDistributionRaw = await Task.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const taskDistribution = taskStatus.reduce((acc, status) => {
      const formattedKey = status.replace(/\s+/g, "");
      acc[formattedKey] =
        taskDistributionRaw.find((item) => item._id === status)?.count || 0;
      return acc;
    }, {});

    taskDistribution["All"] = totalTasks;

    //All priority levels included
    const taskPriorities = ["Low", "Medium", "High"];
    const taskPriorityLevelsRaw = await Task.aggregate([
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 },
        },
      },
    ]);

    const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
      acc[priority] =
        taskPriorityLevelsRaw.find((item) => item._id === priority)?.count || 0;
      return acc;
    }, {});

    //Recent 10 tasks
    const recentTasks = await Task.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select("title status priority dueDate createdAt");

    res.status(200).json({
      message: "Dashboard Data",
      statistics: {
        totalTasks,
        pendingTasks,
        completedTasks,
        overdueTasks,
      },
      charts: {
        taskDistribution,
        taskPriorityLevels,
      },
      recentTasks,
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Failed to update a task.", error: error.message });
  }
};

const getUserDashboardData = async (req, res) => {
  try {
    const userId = req.user._id;

    const totalTasks = await Task.countDocuments({ assignedTo: userId });
    const pendingTasks = await Task.countDocuments({
      assignedTo: userId,
      status: "Pending",
    });
    const completedTasks = await Task.countDocuments({
      assignedTo: userId,
      status: "Completed",
    });
    const overdueTasks = await Task.countDocuments({
      assignedTo: userId,
      status: { $ne: "Completed" },
      dueDate: { $lt: new Date() },
    });

    // All status are included
    const taskStatus = ["Pending", "In Progress", "Completed"];
    const taskDistributionRaw = await Task.aggregate([
      {
        $match: { assignedTo: userId },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const taskDistribution = taskStatus.reduce((acc, status) => {
      const formattedKey = status.replace(/\s+/g, "");
      acc[formattedKey] =
        taskDistributionRaw.find((item) => item._id === status)?.count || 0;
      return acc;
    }, {});

    taskDistribution["All"] = totalTasks;

    //All priority levels included
    const taskPriorities = ["Low", "Medium", "High"];
    const taskPriorityLevelsRaw = await Task.aggregate([
      {
        $match: { assignedTo: userId },
      },
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 },
        },
      },
    ]);

    const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
      acc[priority] =
        taskPriorityLevelsRaw.find((item) => item._id === priority)?.count || 0;
      return acc;
    }, {});

    //Recent 10 tasks
    const recentTasks = await Task.find({ assignedTo: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("title status priority dueDate createdAt");

    res.status(200).json({
      message: "User Dashboard Data",
      statistics: {
        totalTasks,
        pendingTasks,
        completedTasks,
        overdueTasks,
      },
      charts: {
        taskDistribution,
        taskPriorityLevels,
      },
      recentTasks,
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Failed to update a task.", error: error.message });
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
