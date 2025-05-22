// CSVインポート/エクスポート用のデータ構造 (参考)
export interface CsvShiftRecord {
    date: string; // YYYY-MM-DD
    day_of_week: string; // 例: 月曜日
    employee_name: string;
    status: string; // 例: 公休, 指定休, 勤務
    tasks: string; // HH:MM-HH:MM タスク内容; ...
  }
  
  // アプリケーション内部で日ごとの情報を集約するイメージ (必要に応じて調整)
  export interface DailyShiftInfo {
    date: string; // YYYY-MM-DD
    tasks: AssignedTask[]; // その日に割り当てられた全タスク
    // その日の特記事項など
  }