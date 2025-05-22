import { defineStore } from 'pinia';
import { Staff, StaffHoliday } from '@/core/models/staff.model';
import { v4 as uuidv4 } from 'uuid';
// import { useTaskStore } from './task.store'; // Staff削除時の連携のため (呼び出し元で対応推奨)

interface StaffState {
  staffList: Staff[];
  staffHolidays: StaffHoliday[];
}

export const useStaffStore = defineStore('staff', {
  state: (): StaffState => ({
    staffList: [],
    staffHolidays: [],
  }),
  getters: {
    getStaffById: (state) => (id: string): Staff | undefined => {
      return state.staffList.find(staff => staff.id === id);
    },
    getStaffByName: (state) => (name: string): Staff | undefined => {
      return state.staffList.find(staff => staff.name === name);
    },
    getHolidaysByStaffId: (state) => (staffId: string): StaffHoliday[] => {
      return state.staffHolidays.filter(holiday => holiday.staffId === staffId);
    },
    getHolidaysByDate: (state) => (date: string): StaffHoliday[] => { // YYYY-MM-DD
      return state.staffHolidays.filter(holiday => holiday.date === date);
    },
    isStaffOnHoliday: (state) => (staffId: string, date: string): boolean => {
      return state.staffHolidays.some(holiday => holiday.staffId === staffId && holiday.date === date);
    }
    // 他にも必要なゲッター
  },
  actions: {
    // --- Staff CRUD ---
    /**
     * 新しいスタッフを登録します。
     * @param name 登録するスタッフの名前。
     * @returns 登録に成功した場合は true、名前が空または重複している場合は false。
     */
    addStaff(name: string): boolean {
      if (!name.trim()) {
        console.warn('スタッフ名は空にできません。');
        return false;
      }
      const trimmedName = name.trim();
      const existingStaff = this.staffList.find(s => s.name === trimmedName);
      if (existingStaff) {
        console.warn(`スタッフ "${trimmedName}" は既に存在します。`);
        return false;
      }
      const newStaff: Staff = { id: uuidv4(), name: trimmedName };
      this.staffList.push(newStaff);
      return true;
    },

    /**
     * 既存のスタッフ情報を更新します。
     * @param updatedStaff 更新するスタッフの情報。
     * @returns 更新に成功した場合は true、名前が空、他のスタッフと重複、または対象が見つからない場合は false。
     */
    updateStaff(updatedStaff: Staff): boolean {
      if (!updatedStaff.name?.trim()) {
        console.warn('スタッフ名は空にできません。');
        return false;
      }
      const trimmedName = updatedStaff.name.trim();
      const duplicateExists = this.staffList.some(
        staff => staff.id !== updatedStaff.id && staff.name === trimmedName
      );
      if (duplicateExists) {
        console.warn(`スタッフ名 "${trimmedName}" は他のスタッフによって既に使用されています。`);
        return false;
      }

      const index = this.staffList.findIndex(staff => staff.id === updatedStaff.id);
      if (index !== -1) {
        this.staffList[index] = { ...updatedStaff, name: trimmedName };
        return true;
      }
      console.warn(`更新対象のスタッフ (ID: ${updatedStaff.id}) が見つかりません。`);
      return false;
    },

    deleteStaff(staffId: string) {
      this.staffHolidays = this.staffHolidays.filter(holiday => holiday.staffId !== staffId);
      this.staffList = this.staffList.filter(staff => staff.id !== staffId);
      console.log(`スタッフID: ${staffId} の削除処理完了。関連タスクの処理は呼び出し元 (コンポーネント等) で行ってください。`);
    },

    // --- Staff Holiday Management (F-SM-004 関連) ---
    setStaffHoliday(holidayData: StaffHoliday) {
      if (!holidayData.staffId || !holidayData.date || !holidayData.type) {
        console.warn('休日の設定に必要な情報が不足しています。', holidayData);
        return;
      }
      const existingHolidayIndex = this.staffHolidays.findIndex(
        h => h.staffId === holidayData.staffId && h.date === holidayData.date
      );
      if (existingHolidayIndex !== -1) {
        this.staffHolidays[existingHolidayIndex] = { ...holidayData };
      } else {
        this.staffHolidays.push({ ...holidayData });
      }
    },
    removeStaffHoliday(staffId: string, date: string) {
      this.staffHolidays = this.staffHolidays.filter(
        holiday => !(holiday.staffId === staffId && holiday.date === date)
      );
    },

    // --- Data Import/Export related Actions ---
    replaceAllStaffAndHolidays(allStaffData: { staffList: Staff[], staffHolidays: StaffHoliday[] }) {
      this.staffList = allStaffData.staffList || [];
      this.staffHolidays = allStaffData.staffHolidays || [];
    },
    importStaffAndHolidaysFromCsv(newStaffFromCsv: Staff[], newHolidaysFromCsv: StaffHoliday[]) {
      newStaffFromCsv.forEach(csvStaff => {
        if (!this.staffList.some(existingStaff => existingStaff.name === csvStaff.name)) {
          this.staffList.push({ ...csvStaff });
        }
      });
      const staffIdsInCsvHolidays = Array.from(new Set(newHolidaysFromCsv.map(h => h.staffId)));
      staffIdsInCsvHolidays.forEach(staffId => {
        if (staffId) {
            this.staffHolidays = this.staffHolidays.filter(h => h.staffId !== staffId);
        }
      });
      newHolidaysFromCsv.forEach(csvHoliday => {
        if (csvHoliday.staffId && csvHoliday.date && csvHoliday.type) {
            if (this.staffList.some(s => s.id === csvHoliday.staffId) || newStaffFromCsv.some(ns => ns.id === csvHoliday.staffId)) {
                this.staffHolidays.push({ ...csvHoliday });
            } else {
                console.warn(`休日情報に対応するスタッフが見つかりません (staffId: ${csvHoliday.staffId})。休日情報は無視されます。`, csvHoliday);
            }
        } else {
            console.warn('CSVからの休日データに必要な情報が不足しています。無視されます。', csvHoliday);
        }
      });
    },
  },
  persist: true,
});