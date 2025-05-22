<template>
  <div class="daily-view">
    <h2>日次シフトビュー ({{ displayDate }})</h2>
    <div class="navigation-header">
      <el-button :icon="ArrowLeft" @click="goToPreviousDay">前日</el-button>
      <el-button :icon="ArrowRight" @click="goToNextDay">翌日</el-button>
    </div>

    <g-gantt-chart
      v-if="ganttRows.length > 0"
      :chart-start="chartStart"
      :chart-end="chartEnd"
      precision="hour"
      bar-start="barStart"
      bar-end="barEnd"
      row-label-width="150px"
      :grid="true"
      :highlighted-units="highlightedHours"
      @dragend-bar="handleBarDragEnd"
      @dragend-bar-resize="handleBarResizeEnd"
      @click-bar="handleClickBar"
      @contextmenu-bar="handleContextmenuBar"
      :sticky-labels="true"
    >
      <g-gantt-row
        v-for="row in ganttRows"
        :key="row.staffId"
        :label="row.staffName"
        :bars="row.bars"
        :highlight-on-hover="true"
      />
    </g-gantt-chart>
    <el-empty v-else description="表示できるスタッフまたはシフトデータがありません。" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStaffStore } from '@/store/staff.store';
import { useTaskStore } from '@/store/task.store';
import type { AssignedTask } from '@/core/models/task.model';
import dayjs from 'dayjs';
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';

// vue-ganttastic のバーオブジェクトの型 (ドキュメントに合わせて調整)
// GanttBarObject はライブラリがエクスポートしていればそれを使う。なければ自前定義。
interface GanttBarConfig {
  id: string;
  label?: string;
  html?: string;
  hasHandles?: boolean;
  immobile?: boolean;
  bundle?: string;
  pushOnOverlap?: boolean;
  dragLimitLeft?: number;
  dragLimitRight?: number;
  style?: Record<string, string>;
  class?: string;
}

interface MyGanttBar {
  barStart: string; // GGanttChart の bar-start prop と同じ名前にする
  barEnd: string;   // GGanttChart の bar-end prop と同じ名前にする
  ganttBarConfig: GanttBarConfig;
  originalTask: AssignedTask; // 元のAssignedTaskへの参照
  [key: string]: any; // ライブラリの柔軟性のためのインデックスシグネチャ
}

interface GanttRow {
  staffId: string;
  staffName: string;
  bars: MyGanttBar[];
}

// @dragend-bar イベントの型 (ドキュメントに合わせて調整)
interface DragEndBarEventValue {
  oldStart: Date; // Dateオブジェクト
  oldEnd: Date;   // Dateオブジェクト
}
interface DragEndBarEvent {
  bar: MyGanttBar; // ドラッグされたメインのバー
  e: MouseEvent;
  movedBars: Map<MyGanttBar, DragEndBarEventValue>; // 移動した全バーの情報
}
// @dragend-bar-resize イベントの型 (同様にドキュメント確認)
interface ResizeEndBarEvent {
    bar: MyGanttBar;
    e: MouseEvent;
    newStart: Date; // Dateオブジェクト
    newEnd: Date;   // Dateオブジェクト
}


const route = useRoute();
const router = useRouter();
const staffStore = useStaffStore();
const taskStore = useTaskStore();

const currentDate = ref(dayjs(route.params.date as string || undefined).isValid() ? dayjs(route.params.date as string).toDate() : new Date());
const displayDate = computed(() => dayjs(currentDate.value).format('YYYY年MM月DD日 (ddd)'));

const chartStart = computed(() => dayjs(currentDate.value).startOf('day').format('YYYY-MM-DD HH:mm'));
const chartEnd = computed(() => dayjs(currentDate.value).endOf('day').add(1,'hour').format('YYYY-MM-DD HH:mm')); // 24時まで表示
const highlightedHours = ref([0, 6, 12, 18]);

const ganttRows = computed<GanttRow[]>(() => {
  const dateStr = dayjs(currentDate.value).format('YYYY-MM-DD');
  return staffStore.staffList.map(staff => {
    const tasksForStaff = taskStore.getTasksByStaffAndDate(staff.id, dateStr);
    const isStaffHoliday = staffStore.isStaffOnHoliday(staff.id, dateStr);

    const bars: MyGanttBar[] = tasksForStaff.map(task => {
      const barStyle: Record<string, string> = {};
      if (task.templateId) {
        const template = taskStore.getTaskTemplateById(task.templateId);
        if (template?.category) {
          let hash = 0;
          for (let i = 0; i < template.category.length; i++) {
            hash = template.category.charCodeAt(i) + ((hash << 5) - hash);
          }
          const color = (hash & 0x00FFFFFF).toString(16).toUpperCase();
          barStyle.background = "#" + "00000".substring(0, 6 - color.length) + color + 'CC';
          // 簡単な輝度計算で文字色を決定 (より正確な方法はライブラリ検討)
          const r = parseInt(color.substring(0,2),16);
          const g = parseInt(color.substring(2,4),16);
          const b = parseInt(color.substring(4,6),16);
          barStyle.color = (r*0.299 + g*0.587 + b*0.114) > 186 ? '#000000' : '#ffffff';
        }
      }
      if (isStaffHoliday) { // 休日の場合はタスクバーを半透明にするなど
        barStyle.opacity = '0.5';
      }

      return {
        barStart: dayjs(task.startTime).format('YYYY-MM-DD HH:mm'), // GGanttChart の bar-start prop と一致
        barEnd: dayjs(task.endTime).format('YYYY-MM-DD HH:mm'),     // GGanttChart の bar-end prop と一致
        ganttBarConfig: {
          id: task.id,
          label: task.title,
          style: barStyle,
          hasHandles: !isStaffHoliday, // 休日のタスクはリサイズ不可
          immobile: isStaffHoliday,   // 休日のタスクは移動不可
        },
        originalTask: task,
      };
    });
    return {
      staffId: staff.id,
      staffName: staff.name,
      bars: bars,
    };
  });
});

// --- イベントハンドラ ---
const handleBarDragEnd = (event: DragEndBarEvent) => {
  console.log("Bar dragged event:", event);
  // movedBars Map を使って、移動した各バーの情報を更新
  // 注意: event.bar はドラッグ操作の起点となったバー。event.movedBars には実際に移動した全てのバーが含まれる。
  // バンドルされていない場合、event.movedBars には event.bar と同じものが1つだけ入るはず。

  let allUpdatesSuccessful = true;
  event.movedBars.forEach((newTimes, movedBar) => {
    const originalTask = movedBar.originalTask;
    if (!originalTask) {
      console.warn("Original task not found for moved bar:", movedBar);
      allUpdatesSuccessful = false;
      return;
    }

    // newTimes.oldStart, newTimes.oldEnd は Date オブジェクト
    // バーの新しい開始/終了時刻は、movedBar.barStart と movedBar.barEnd から取得するか、
    // ライブラリが新しいDateオブジェクトを提供していればそれを使う。
    // vue-ganttastic の @dragend-bar イベントは、バーの新しい位置を直接提供するのではなく、
    // バーオブジェクト自体が更新された状態で渡されることが多い。
    // そのため、movedBar.barStart と movedBar.barEnd (文字列) を dayjs でパースして使う。
    const newStartTime = dayjs(movedBar.barStart, 'YYYY-MM-DD HH:mm');
    const newEndTime = dayjs(movedBar.barEnd, 'YYYY-MM-DD HH:mm');

    if (!newStartTime.isValid() || !newEndTime.isValid()){
        console.error("Invalid new times after drag for task:", originalTask.title, movedBar);
        allUpdatesSuccessful = false;
        // 元に戻す処理が必要な場合もある (ライブラリが自動で戻さなければ)
        // ここでは一旦エラーとして、ストアは更新しない
        return;
    }

    const updatedTask: AssignedTask = {
      ...originalTask,
      startTime: newStartTime.toISOString(),
      endTime: newEndTime.toISOString(),
      // TODO: もしドラッグで別のスタッフの行に移動した場合、staffId も更新する必要がある。
      // ライブラリが新しい行(リソース)の情報を提供するか確認。
      // 提供しない場合、スタッフ間のドラッグ移動は別途UIで対応するか、このライブラリでは不可と判断。
    };
    taskStore.updateAssignedTask(updatedTask);
  });

  if (allUpdatesSuccessful) {
    ElMessage.success(`タスクの時間を更新しました。`);
  } else {
    ElMessage.error('一部タスクの更新に失敗しました。コンソールを確認してください。');
  }
};

const handleBarResizeEnd = (event: ResizeEndBarEvent) => {
  console.log("Bar resized event:", event);
  const originalTask = event.bar.originalTask;
  if (!originalTask) {
      console.warn("Original task not found for resized bar:", event.bar);
      ElMessage.error('リサイズされたタスクの元データが見つかりません。');
      return;
  }

  // event.newStart と event.newEnd は Date オブジェクト
  const newStartTime = dayjs(event.newStart);
  const newEndTime = dayjs(event.newEnd);

   if (!newStartTime.isValid() || !newEndTime.isValid()){
        console.error("Invalid new times after resize for task:", originalTask.title, event);
        ElMessage.error('タスク期間の更新に失敗しました（不正な日時）。');
        return;
    }

  const updatedTask: AssignedTask = {
    ...originalTask,
    startTime: newStartTime.toISOString(),
    endTime: newEndTime.toISOString(),
  };
  taskStore.updateAssignedTask(updatedTask);
  ElMessage.success(`タスク「${originalTask.title}」の期間を更新しました。`);
};

const handleClickBar = (event: { bar: MyGanttBar, e: MouseEvent, datetime?: Date }) => {
  console.log("Bar clicked:", event.bar, "Click datetime:", event.datetime);
  const originalTask = event.bar.originalTask;
  if (originalTask) {
    ElMessageBox.alert(
      `<strong>タスク名:</strong> ${originalTask.title}<br>
       <strong>開始:</strong> ${dayjs(originalTask.startTime).format('YYYY-MM-DD HH:mm')}<br>
       <strong>終了:</strong> ${dayjs(originalTask.endTime).format('YYYY-MM-DD HH:mm')}<br>
       ${originalTask.notes ? `<strong>備考:</strong> ${originalTask.notes}` : ''}`,
      'タスク詳細',
      { dangerouslyUseHTMLString: true }
    );
  }
};

const handleContextmenuBar = (event: { bar: MyGanttBar, e: MouseEvent, datetime?: Date }) => {
    event.e.preventDefault();
    console.log("Bar context menu:", event.bar, "Datetime:", event.datetime);
    const originalTask = event.bar.originalTask;
    if (originalTask) {
        // TODO: 右クリックメニュー実装
        ElMessage.info(`タスク「${originalTask.title}」で右クリック (削除/複製は未実装)`);
    }
};

// --- ナビゲーション ---
const goToPreviousDay = () => {
  const prevDate = dayjs(currentDate.value).subtract(1, 'day').format('YYYY-MM-DD');
  router.push(`/daily/${prevDate}`);
};
const goToNextDay = () => {
  const nextDate = dayjs(currentDate.value).add(1, 'day').format('YYYY-MM-DD');
  router.push(`/daily/${nextDate}`);
};

watch(() => route.params.date, (newDateParam) => {
  const newDate = dayjs(newDateParam as string || undefined).isValid() ? dayjs(newDateParam as string).toDate() : new Date();
  if (dayjs(currentDate.value).format('YYYY-MM-DD') !== dayjs(newDate).format('YYYY-MM-DD')) {
      currentDate.value = newDate;
  }
}, { immediate: true });

</script>

<style scoped>
.daily-view {
  padding: 20px;
}
.navigation-header {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
}
.navigation-header h2 {
  margin: 0 20px;
  min-width: 250px;
  text-align: center;
}
/* vue-ganttastic のデフォルトスタイルを上書きしたり、追加したりする場合 */
:deep(.g-gantt-bar-label) {
  color: inherit !important; /* バーの背景色に応じて文字色が変わるように */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 5px;
}
:deep(.g-gantt-row-label) {
  font-weight: bold;
}
</style>