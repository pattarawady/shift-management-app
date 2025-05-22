<template>
  <div class="home-view">
    <h2>月次シフトカレンダー</h2>
    <el-calendar v-model="currentDate">
      <template #dateCell="{ data }">
        <div class="calendar-cell" @click="goToDailyView(data.day)">
          <p class="solar-date">{{ getSolarDate(data.day) }}</p>
          <div v-if="getShiftInfoForDate(data.day)" class="shift-summary">
            <p v-if="getShiftInfoForDate(data.day)!.workingStaffCount > 0" class="staff-count">
              <el-icon><UserFilled /></el-icon>
              勤務: {{ getShiftInfoForDate(data.day)!.workingStaffCount }}名
            </p>
            <ul v-if="getShiftInfoForDate(data.day)!.staffNames.length > 0 && showStaffNamesInCell" class="staff-list">
              <li v-for="name in getShiftInfoForDate(data.day)!.staffNames.slice(0, 2)" :key="name">{{ name }}</li>
              <li v-if="getShiftInfoForDate(data.day)!.staffNames.length > 2">...他</li>
            </ul>
            <p v-if="getShiftInfoForDate(data.day)!.workingStaffCount === 0 && !isHoliday(data.day)" class="no-shift">
              シフトなし
            </p>
            <p v-if="isHoliday(data.day)" class="holiday-marker">
              <el-tag type="info" size="small">休日設定あり</el-tag>
            </p>
          </div>
        </div>
      </template>
    </el-calendar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useTaskStore } from '@/store/task.store';
import { useStaffStore } from '@/store/staff.store';
import dayjs from 'dayjs';
import { UserFilled } from '@element-plus/icons-vue'; // アイコン

interface DailyShiftSummary {
  date: string;
  workingStaffCount: number;
  staffIds: Set<string>; // その日勤務したスタッフのIDセット (重複なし)
  staffNames: string[]; // 表示用のスタッフ名リスト
}

const router = useRouter();
const taskStore = useTaskStore();
const staffStore = useStaffStore();

const currentDate = ref(new Date()); // ElCalendar の v-model
const showStaffNamesInCell = ref(true); // セルにスタッフ名を表示するかのフラグ (任意)

// カレンダーに表示する月のシフトサマリーを計算
const monthlyShiftSummary = computed<Map<string, DailyShiftSummary>>(() => {
  const summaryMap = new Map<string, DailyShiftSummary>();
  const year = dayjs(currentDate.value).year();
  const month = dayjs(currentDate.value).month(); // 0-indexed

  // 今月の日付範囲
  const startDate = dayjs(currentDate.value).startOf('month');
  const endDate = dayjs(currentDate.value).endOf('month');

  // タスクストアから関連する月のタスクを取得 (パフォーマンスのため絞り込みたい)
  // 現状は全タスクを取得してフィルタリング
  taskStore.assignedTasks.forEach(task => {
    const taskDate = dayjs(task.startTime);
    if (taskDate.year() === year && taskDate.month() === month && task.staffId) {
      const dateStr = taskDate.format('YYYY-MM-DD');
      if (!summaryMap.has(dateStr)) {
        summaryMap.set(dateStr, { date: dateStr, workingStaffCount: 0, staffIds: new Set(), staffNames: [] });
      }
      const summary = summaryMap.get(dateStr)!;
      // このスタッフがこの日に休日設定されていないか確認
      const isOnHoliday = staffStore.isStaffOnHoliday(task.staffId, dateStr);
      if (!isOnHoliday) {
        summary.staffIds.add(task.staffId); // スタッフIDをセットに追加して重複カウントを防ぐ
      }
    }
  });

  // staffIds から workingStaffCount と staffNames を設定
  summaryMap.forEach(summary => {
    summary.workingStaffCount = summary.staffIds.size;
    summary.staffIds.forEach(staffId => {
        const staff = staffStore.getStaffById(staffId);
        if (staff) {
            summary.staffNames.push(staff.name);
        }
    });
  });

  return summaryMap;
});

// 特定の日付のシフト情報を取得するヘルパー関数
const getShiftInfoForDate = (dateString: string): DailyShiftSummary | undefined => {
  const formattedDate = dayjs(dateString).format('YYYY-MM-DD'); // YYYY-MM-DD 形式に統一
  return monthlyShiftSummary.value.get(formattedDate);
};

// 日付セルの日付部分のみを抽出 (例: "1", "15")
const getSolarDate = (dateString: string): string => {
  return dayjs(dateString).format('D');
};

// 特定の日が休日設定されているか (スタッフ個別の休日)
const isHoliday = (dateString: string): boolean => {
  const formattedDate = dayjs(dateString).format('YYYY-MM-DD');
  // この日に休日が設定されているスタッフがいるかどうかで判断 (より詳細な表示も可能)
  return staffStore.staffHolidays.some(h => h.date === formattedDate);
};


const goToDailyView = (dateString: string) => {
  const formattedDate = dayjs(dateString).format('YYYY-MM-DD');
  router.push(`/daily/${formattedDate}`);
};

// currentDate が変わったら monthlyShiftSummary が再計算される
watch(currentDate, (newDate) => {
  console.log("Calendar date changed to:", dayjs(newDate).format("YYYY-MM"));
  // 必要であれば、ここで月が変わった際の追加処理
});

</script>

<style scoped>
.home-view {
  padding: 20px;
}
.calendar-cell {
  padding: 8px;
  height: 100px; /* セルの高さを調整 */
  display: flex;
  flex-direction: column;
  cursor: pointer;
}
.calendar-cell:hover {
  background-color: #f5f7fa;
}
.solar-date {
  font-size: 0.9em;
  text-align: center;
  margin-bottom: 5px;
}
.shift-summary {
  font-size: 0.8em;
  flex-grow: 1;
}
.staff-count {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: bold;
  color: #409EFF;
}
.staff-list {
  list-style: none;
  padding: 0;
  margin: 2px 0 0 0;
  color: #606266;
}
.no-shift {
  color: #909399;
  font-style: italic;
}
.holiday-marker {
    margin-top: 5px;
}
</style>