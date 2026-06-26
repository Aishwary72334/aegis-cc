import express from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const targetUserId = req.query.userId || req.user.id;
    // Fetch tasks and goals in parallel
    const [
      { data: tasks, error: tasksError },
      { data: goals, error: goalsError }
    ] = await Promise.all([
      req.supabase.from('tasks').select('*').eq('user_id', targetUserId),
      req.supabase.from('goals').select('*').eq('user_id', targetUserId)
    ]);

    if (tasksError) throw tasksError;
    if (goalsError) throw goalsError;

    // 1. Task calculations
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Tasks by status count
    const statusCounts = {
      'To Do': 0,
      'In Progress': 0,
      'Waiting': 0,
      'Blocked': 0,
      'Completed': 0,
      'Cancelled': 0
    };
    tasks.forEach(t => {
      if (statusCounts[t.status] !== undefined) {
        statusCounts[t.status]++;
      }
    });

    // Tasks by priority count
    const priorityCounts = {
      'Critical': 0,
      'High': 0,
      'Medium': 0,
      'Low': 0
    };
    tasks.forEach(t => {
      if (priorityCounts[t.priority] !== undefined) {
        priorityCounts[t.priority]++;
      }
    });

    // 2. Goal progress calculations
    const totalGoals = goals.length;
    const averageGoalProgress = totalGoals > 0 
      ? Math.round(goals.reduce((acc, g) => acc + g.progress, 0) / totalGoals) 
      : 0;

    // 3. Time Telemetry (for completed tasks)
    let totalEstimatedMinutes = 0;
    let totalActualMinutes = 0;
    tasks.filter(t => t.status === 'Completed').forEach(t => {
      totalEstimatedMinutes += t.estimated_duration || 0;
      totalActualMinutes += t.actual_duration || 0;
    });

    // 4. Weekly Activity (Completed tasks in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Group completed tasks by day of week
    const weekdayActivity = [
      { day: 'Mon', completed: 0 },
      { day: 'Tue', completed: 0 },
      { day: 'Wed', completed: 0 },
      { day: 'Thu', completed: 0 },
      { day: 'Fri', completed: 0 },
      { day: 'Sat', completed: 0 },
      { day: 'Sun', completed: 0 }
    ];

    tasks.filter(t => t.status === 'Completed' && new Date(t.updated_at) >= sevenDaysAgo).forEach(t => {
      const date = new Date(t.updated_at);
      // getDay() is 0 for Sunday, 1 for Monday, etc.
      let dayIndex = date.getDay() - 1;
      if (dayIndex < 0) dayIndex = 6; // Adjust Sunday to index 6
      weekdayActivity[dayIndex].completed++;
    });

    res.json({
      summary: {
        totalTasks,
        completedTasks,
        completionRate,
        totalGoals,
        averageGoalProgress,
        timeTelemetry: {
          estimated: totalEstimatedMinutes,
          actual: totalActualMinutes,
          ratio: totalEstimatedMinutes > 0 ? Number((totalActualMinutes / totalEstimatedMinutes).toFixed(2)) : 1
        }
      },
      statusDistribution: Object.keys(statusCounts).map(key => ({ name: key, value: statusCounts[key] })),
      priorityDistribution: Object.keys(priorityCounts).map(key => ({ name: key, value: priorityCounts[key] })),
      weeklyActivity: weekdayActivity
    });

  } catch (error) {
    next(error);
  }
});

export default router;
