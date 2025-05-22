export interface Staff {
  id: string; // 一意のID (UUIDなどを想定)
  name: string;
  // 今後の拡張用: 例: 役職、連絡先など
}

export interface StaffHoliday {
  staffId: string;
  date: string; // YYYY-MM-DD 形式
  type: 'public_holiday' | 'paid_holiday' | 'specified_day_off'; // 公休、有給、指定休など
  // 備考など追加可能
}