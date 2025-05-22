import { ElMessage } from 'element-plus'; // ElMessage はここでは直接使わない方針に変更
import { Staff, StaffHoliday } from '@/core/models/staff.model'; // StaffStateの具体的な型のためにインポート
import { TaskTemplate, AssignedTask } from '@/core/models/task.model'; // TaskStateの具体的な型のためにインポート

// ストアの状態の型を直接参照する代わりに、具体的なデータ構造の型を定義
interface StaffModuleState {
  staffList: Staff[];
  staffHolidays: StaffHoliday[];
}

interface TaskModuleState {
  taskTemplates: TaskTemplate[];
  assignedTasks: AssignedTask[];
}

export interface AppBackupData { // exportしてSettingsView.vueなどから型を参照できるようにする
  staffModule: StaffModuleState;
  taskModule: TaskModuleState;
  // 他のストアが増えたらここに追加
  timestamp: string;
  version: string; // アプリバージョンなど
}

const APP_VERSION = '1.0.1'; // package.jsonのバージョンと連動させても良い (適宜更新)

/**
 * アプリケーションの全関連データをJSON文字列としてエクスポートします。
 * @param staffState - 現在のスタッフストアの状態。
 * @param taskState - 現在のタスクストアの状態。
 * @returns 整形されたJSON文字列。
 */
export const exportAllDataToJsonString = (
  staffState: StaffModuleState, // 引数の型を具体的に
  taskState: TaskModuleState   // 引数の型を具体的に
): string => {
  const dataToExport: AppBackupData = {
    staffModule: staffState,
    taskModule: taskState,
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
  };
  return JSON.stringify(dataToExport, null, 2); // null, 2 で整形して出力
};

/**
 * JSON文字列をパースし、アプリケーションのバックアップデータ構造に変換します。
 * データの基本的な構造と型の検証も行います。
 * @param jsonString - インポートするJSON文字列。
 * @returns パースおよび検証済みの AppBackupData オブジェクト、またはエラー時は null。
 */
export const parseJsonToInternalData = (jsonString: string): AppBackupData | null => {
  try {
    const parsed = JSON.parse(jsonString);

    // より厳密な型ガード/バリデーション
    if (
      typeof parsed !== 'object' || parsed === null || // まずオブジェクトであること
      typeof parsed.staffModule !== 'object' || parsed.staffModule === null ||
      !Array.isArray(parsed.staffModule.staffList) ||
      !Array.isArray(parsed.staffModule.staffHolidays) ||
      typeof parsed.taskModule !== 'object' || parsed.taskModule === null ||
      !Array.isArray(parsed.taskModule.taskTemplates) ||
      !Array.isArray(parsed.taskModule.assignedTasks) ||
      typeof parsed.timestamp !== 'string' ||
      typeof parsed.version !== 'string' // versionもチェック対象に含める
    ) {
      console.error('JSONデータの形式が不正です。必要なキーまたは型が一致しません。', parsed);
      // ElMessage.error('インポートしようとしたJSONファイルの形式が正しくありません。'); // 呼び出し元で表示
      return null;
    }

    // ここでさらに各配列の要素の型チェックを行うことも可能だが、複雑になるため省略。
    // (例: staffListの各要素がStaffインターフェースの主要プロパティを持っているかなど)

    // バリデーションを通過したら、型アサーションして返す
    return parsed as AppBackupData;

  } catch (error) {
    console.error('JSONデータのパースに失敗しました:', error);
    // ElMessage.error('JSONファイルの読み込みに失敗しました。ファイルが破損している可能性があります。'); // 呼び出し元で表示
    return null;
  }
};