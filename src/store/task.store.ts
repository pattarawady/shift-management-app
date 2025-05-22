import { defineStore } from 'pinia';
import { TaskTemplate, AssignedTask } from '@/core/models/task.model';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

interface TaskState {
  taskTemplates: TaskTemplate[];
  assignedTasks: AssignedTask[];
}

export const useTaskStore = defineStore('task', {
  state: (): TaskState => ({
    taskTemplates: [],
    assignedTasks: [],
  }),
  getters: {
    getTasksByDate: (state) => (date: string): AssignedTask[] => {
      return state.assignedTasks.filter(task => dayjs(task.startTime).format('YYYY-MM-DD') === date);
    },
    getTasksByStaffAndDate: (state) => (staffId: string, date: string): AssignedTask[] => {
      return state.assignedTasks.filter(task =>
        task.staffId === staffId && dayjs(task.startTime).format('YYYY-MM-DD') === date
      );
    },
    getTaskTemplateById: (state) => (id: string): TaskTemplate | undefined => {
      return state.taskTemplates.find(template => template.id === id);
    },
    getAssignedTaskById: (state) => (id: string): AssignedTask | undefined => {
      return state.assignedTasks.find(task => task.id === id);
    },
    getTasksByDateRange: (state) => (startDate: string, endDate: string): AssignedTask[] => {
      const start = dayjs(startDate);
      const end = dayjs(endDate);
      return state.assignedTasks.filter(task => {
        const taskDate = dayjs(task.startTime);
        return !taskDate.isBefore(start, 'day') && !taskDate.isAfter(end, 'day');
      });
    },
  },
  actions: {
    // --- Task Template Actions ---
    addTaskTemplate(template: Omit<TaskTemplate, 'id'>) {
      const newTemplate: TaskTemplate = {
        id: uuidv4(),
        name: template.name.trim(),
        defaultDurationMinutes: template.defaultDurationMinutes ?? undefined,
        category: template.category?.trim() ? template.category.trim() : undefined,
      };
      this.taskTemplates.push(newTemplate);
    },
    updateTaskTemplate(updatedTemplate: TaskTemplate) {
      const index = this.taskTemplates.findIndex(t => t.id === updatedTemplate.id);
      if (index !== -1) {
        this.taskTemplates[index] = {
          ...this.taskTemplates[index],
          ...updatedTemplate,
          name: updatedTemplate.name.trim(),
          defaultDurationMinutes: updatedTemplate.defaultDurationMinutes ?? undefined,
          category: updatedTemplate.category?.trim() ? updatedTemplate.category.trim() : undefined,
        };
      }
    },
    deleteTaskTemplate(templateId: string) {
      this.taskTemplates = this.taskTemplates.filter(t => t.id !== templateId);
      // TODO: このテンプレートを使用している割り当て済みタスクがあれば、それらの扱いを検討
    },

    // --- Assigned Task Actions ---
    assignTask(taskDetails: Omit<AssignedTask, 'id' | 'staffId'>, staffId?: string) {
      if (!taskDetails.title.trim()) {
        console.warn("タスクタイトルが空です。タスクは追加されません。");
        return;
      }
      if (!dayjs(taskDetails.startTime).isValid() || !dayjs(taskDetails.endTime).isValid() || dayjs(taskDetails.endTime).isBefore(dayjs(taskDetails.startTime))) {
          console.error("無効な開始時刻または終了時刻です。タスクは追加されません。", taskDetails);
          return;
      }
      const newAssignedTask: AssignedTask = {
        ...taskDetails,
        id: uuidv4(),
        staffId: staffId,
        title: taskDetails.title.trim(),
      };
      this.assignedTasks.push(newAssignedTask);
    },
    updateAssignedTask(updatedTask: AssignedTask) {
      const index = this.assignedTasks.findIndex(task => task.id === updatedTask.id);
      if (index !== -1) {
        if (!dayjs(updatedTask.startTime).isValid() || !dayjs(updatedTask.endTime).isValid() || dayjs(updatedTask.endTime).isBefore(dayjs(updatedTask.startTime))) {
            console.error("更新時に無効な開始時刻または終了時刻です。タスクは更新されません。", updatedTask);
            return;
        }
        this.assignedTasks[index] = {
            ...this.assignedTasks[index],
            ...updatedTask,
            title: updatedTask.title.trim(),
        };
      }
    },
    deleteAssignedTask(taskId: string) {
      this.assignedTasks = this.assignedTasks.filter(task => task.id !== taskId);
    },
    removeTasksByStaffId(staffId: string) {
      this.assignedTasks = this.assignedTasks.filter(task => task.staffId !== staffId);
    },

    // --- Data Import/Export related Actions ---
    replaceAllTaskData(allTaskData: { taskTemplates: TaskTemplate[], assignedTasks: AssignedTask[] }) {
      this.taskTemplates = allTaskData.taskTemplates || []; // null/undefined の場合を考慮
      this.assignedTasks = allTaskData.assignedTasks || [];   // null/undefined の場合を考慮
    },
    importAssignedTasksFromCsv(newAssignedTasksFromCsv: AssignedTask[]) {
      // CSVからのデータで既存の割り当て済みタスクを全て置き換える
      // newAssignedTasksFromCsv が null や undefined の場合は空配列で置き換える
      this.assignedTasks = newAssignedTasksFromCsv || [];
      console.log(`${this.assignedTasks.length} 件の割り当て済みタスクがCSVからインポートされました。`);
    },
  },
  persist: true,
});