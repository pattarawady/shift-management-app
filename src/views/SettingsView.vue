<template>
  <div class="settings-view">
    <h2>設定・データ管理</h2>

    <!-- データ管理セクション -->
    <el-card class="box-card section-card">
      <template #header>
        <div class="card-header">
          <span>データ管理 (インポート / エクスポート / リセット)</span>
        </div>
      </template>
      <div class="data-management-content">

                <!-- CSVインポート・エクスポート -->
                <div class="data-group">
          <h4 class="group-title">CSV形式でのシフトデータ管理</h4>
          <div class="button-row">
            <el-upload
              action="#"
              :show-file-list="false"
              :before-upload="handleBeforeCsvImport"
              accept=".csv, text/csv"
              class="upload-button"
            >
              <el-button type="primary" :icon="UploadFilled">CSVファイルからシフトをインポート</el-button>
            </el-upload>
            <el-button type="success" :icon="Download" @click="handleCsvExport" class="action-button">
              シフトをCSVファイルへエクスポート
            </el-button>
          </div>
          <p class="import-note">
            <el-icon><InfoFilled /></el-icon>
            CSVファイルは <strong>UTF-8エンコーディング、カンマ区切り形式</strong> のみ対応しています。
          </p>
          <el-alert
            title="CSVインポート時の注意"
            type="info"
            :closable="false"
            show-icon
            class="info-alert"
          >
            <ul style="margin-left: 20px; padding-left: 0;">
              <li>既存のシフト関連データ（割り当て済みタスク）は、CSVファイルの内容で上書きされます。</li>
              <li>CSVファイルに記載されたスタッフがシステムに存在しない場合は、新規スタッフとして自動的に登録されます。</li>
              <li>スタッフマスタ（既存スタッフの情報）や業務テンプレートは、このインポート処理では変更されません。</li>
              <li>CSVヘッダー: <code>日付,名前,開始時刻,終了時刻,休憩開始,休憩終了</code> (順不同可、ただしこれらの名称であること)</li>
            </ul>
          </el-alert>
        </div>

        <el-divider />

        <!-- JSONバックアップ・リストア -->
        <div class="data-group">
          <h4 class="group-title">JSON形式での全データバックアップ・リストア</h4>
          <div class="button-row">
            <el-upload
              action="#"
              :show-file-list="false"
              :before-upload="handleBeforeJsonImport"
              accept=".json, application/json"
              class="upload-button"
            >
              <el-button type="primary" :icon="UploadFilled">JSONファイルから全データをリストア</el-button>
            </el-upload>
            <el-button type="success" :icon="Download" @click="handleJsonExport" class="action-button">
              全データをJSONファイルへバックアップ
            </el-button>
          </div>
          <el-alert
            title="JSONリストアは既存の全てのアプリケーションデータ（スタッフ、業務テンプレート、シフト、休日設定など）を上書きします。"
            type="warning"
            :closable="false"
            show-icon
            class="info-alert"
          ></el-alert>
        </div>

        <el-divider />

        <!-- データリセット -->
        <div class="data-group">
          <h4 class="group-title">アプリケーションデータのリセット</h4>
          <el-button type="danger" :icon="Delete" @click="handleClearAllData" class="action-button">
            全アプリケーションデータをリセット
          </el-button>
          <el-alert
            title="この操作は元に戻せません。全てのスタッフ情報、業務テンプレート、割り当て済みシフト、休日設定が削除され、アプリケーションは初期状態に戻ります。"
            type="error"
            :closable="false"
            show-icon
            class="info-alert"
          ></el-alert>
        </div>
      </div>
    </el-card>

    <!-- 業務テンプレート管理セクション (既存) -->
    <el-card class="box-card section-card">
      <template #header>
        <div class="card-header">
          <span>業務テンプレート管理</span>
        </div>
      </template>
      <TaskTemplateManager />
    </el-card>

  </div>
</template>

<script setup lang="ts">
import { UploadFilled, Download, Delete } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox, UploadRawFile } from 'element-plus';
import { useStaffStore } from '@/store/staff.store';
import { useTaskStore } from '@/store/task.store';
import TaskTemplateManager from '@/components/settings/TaskTemplateManager.vue';

// サービスとユーティリティのインポート
import { parseCsvToInternalData, exportInternalDataToCsv, ParsedCsvResult } from '@/core/services/csv.service'; // ParsedCsvResult もインポート
import { exportAllDataToJsonString, parseJsonToInternalData, AppBackupData } from '@/core/services/json.service';
import { downloadFile } from '@/utils/fileDownloader';


const staffStore = useStaffStore();
const taskStore = useTaskStore();

// --- CSV ---
const handleBeforeCsvImport = async (rawFile: UploadRawFile): Promise<boolean> => {
  ElMessage.info(`CSVファイル [${rawFile.name}] のインポート処理を開始します...`);
  try {
    const csvString = await readFileAsText(rawFile);
    if (!csvString.trim()) {
      ElMessage.error('選択されたCSVファイルが空です。');
      return false;
    }

    // CSVパース処理 (既存スタッフリストを渡す)
    const parsedResult: ParsedCsvResult = parseCsvToInternalData(csvString, staffStore.staffList);

    // ユーザーにインポート内容の確認を求める (任意だが推奨)
    // 例: 新規スタッフX名、休日Y件、タスクZ件
    const confirmMessage = `以下の内容でインポートしますか？\n- 新規スタッフ: ${parsedResult.newlyFoundStaff.length}名\n- 休日情報: ${parsedResult.importedHolidays.length}件\n- 割り当てタスク: ${parsedResult.importedAssignedTasks.length}件\n既存のシフト関連データは上書きされます。`;

    await ElMessageBox.confirm(confirmMessage, 'CSVインポート確認', {
      confirmButtonText: 'はい、インポートします',
      cancelButtonText: 'キャンセル',
      type: 'info',
      dangerouslyUseHTMLString: true, // \n を改行として表示
    });

    // ストアにデータを反映
    staffStore.importStaffAndHolidaysFromCsv(parsedResult.newlyFoundStaff, parsedResult.importedHolidays);
    taskStore.importAssignedTasksFromCsv(parsedResult.importedAssignedTasks);

    ElMessage.success(`CSVファイル [${rawFile.name}] のインポートが完了しました。`);

  } catch (error: any) {
     if (error !== 'cancel' && (error.name !== 'ElMessageBoxCancelAction' && error.message !== 'cancel')) {
      console.error("CSVインポートエラー:", error);
      ElMessage.error(`CSVインポートに失敗しました: ${error.message || '不明なエラー'}`);
    } else {
      ElMessage.info('CSVインポートをキャンセルしました。');
    }
  }
  return false; // ElUploadの自動アップロードを抑制
};

const handleCsvExport = () => {
  ElMessage.info('CSVエクスポート処理を開始します...');
  try {
    if (taskStore.assignedTasks.length === 0 && staffStore.staffHolidays.length === 0) {
      ElMessage.warning('エクスポートするシフトデータまたは休日データがありません。');
      return;
    }

    const csvOutput = exportInternalDataToCsv(
      taskStore.assignedTasks,
      staffStore.staffList,
      staffStore.staffHolidays // staffHolidays を渡す
    );

    if (!csvOutput.trim() || csvOutput.split('\n').length <= 1) { // ヘッダー行のみ、または空の場合
        ElMessage.warning('生成されたCSVデータが空か、ヘッダーのみです。');
        return;
    }

    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    downloadFile(
      csvOutput,
      `シフトデータ_${timestamp}.csv`,
      'text/csv;charset=utf-8;'
    );
    ElMessage.success('CSVファイルのエクスポートが完了しました。');
  } catch (error: any) {
    console.error("CSVエクスポートエラー:", error);
    ElMessage.error(`CSVエクスポートに失敗しました: ${error.message || '不明なエラー'}`);
  }
};

// --- JSON ---
const handleBeforeJsonImport = async (rawFile: UploadRawFile): Promise<boolean> => {
  ElMessage.info(`JSONファイル [${rawFile.name}] のインポート処理を開始します...`);
  try {
    const jsonString = await readFileAsText(rawFile);
    if (!jsonString.trim()) {
      ElMessage.error('選択されたJSONファイルが空です。');
      return false;
    }
    const importedData: AppBackupData | null = parseJsonToInternalData(jsonString);

    if (importedData) {
      await ElMessageBox.confirm(
        '現在の全てのデータをインポートファイルの内容で上書きします。よろしいですか？',
        'JSONデータリストア確認',
        {
          confirmButtonText: 'はい、リストアします',
          cancelButtonText: 'キャンセル',
          type: 'warning',
          draggable: true,
        }
      );

      staffStore.$reset();
      taskStore.$reset();
      staffStore.replaceAllStaffAndHolidays(importedData.staffModule);
      taskStore.replaceAllTaskData(importedData.taskModule);

      ElMessage.success(`JSONファイル [${rawFile.name}] からのリストアが完了しました。ページをリロードすると変更が完全に反映される場合があります。`);
    } else {
      ElMessage.error('JSONファイルの読み込みに失敗しました。ファイル形式が正しくないか、ファイルが破損している可能性があります。');
    }
  } catch (error: any) {
    if (error !== 'cancel' && (error.name !== 'ElMessageBoxCancelAction' && error.message !== 'cancel')) {
      console.error("JSONインポートエラー:", error);
      ElMessage.error(`JSONインポートに失敗しました: ${error.message || '不明なエラー'}`);
    } else {
      ElMessage.info('JSONインポートをキャンセルしました。');
    }
  }
  return false;
};

const handleJsonExport = () => {
  ElMessage.info('JSONバックアップ処理を開始します...');
  try {
    const jsonOutput = exportAllDataToJsonString(staffStore.$state, taskStore.$state);
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    downloadFile(
      jsonOutput,
      `宿のシフト管理アプリ_バックアップ_${timestamp}.json`,
      'application/json;charset=utf-8;'
    );
    ElMessage.success('JSONファイルのバックアップが完了しました。');
  } catch (error: any) {
    console.error("JSONエクスポートエラー:", error);
    ElMessage.error(`JSONエクスポートに失敗しました: ${error.message || '不明なエラー'}`);
  }
};

// --- データリセット ---
const handleClearAllData = async () => {
  try {
    await ElMessageBox.confirm(
      '本当に全てのアプリケーションデータをリセットしますか？この操作は元に戻せません。スタッフ情報、業務テンプレート、割り当て済みシフト、休日設定が全て削除されます。',
      '警告: 全データリセット',
      {
        confirmButtonText: 'はい、リセットします',
        cancelButtonText: 'キャンセル',
        type: 'error',
        draggable: true,
      }
    );
    staffStore.$reset();
    taskStore.$reset();
    ElMessage.success('全てのアプリケーションデータをリセットしました。ページをリロードすると完全に反映される場合があります。');
  } catch (error: any) { // ★この catch ブロックの開始
    if (error !== 'cancel' && (error.name !== 'ElMessageBoxCancelAction' && error.message !== 'cancel')) {
      console.error("データリセットエラー:", error);
      ElMessage.error('データリセット中にエラーが発生しました。');
    } else {
      ElMessage.info('データリセットをキャンセルしました。');
    }
  } // ★この catch ブロックの終了
};

// --- ヘルパー関数 ---
const readFileAsText = (rawFile: UploadRawFile): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target && typeof event.target.result === 'string') {
        resolve(event.target.result);
      } else {
        reject(new Error('ファイルの読み込みに失敗しました。テキスト形式ではありません。'));
      }
    };
    reader.onerror = (error) => {
      reject(new Error(`ファイル読み込みエラー: ${error}`));
    };
    reader.readAsText(rawFile, 'UTF-8'); // 文字コードを指定 (Shift_JISなども考慮する場合は別途処理が必要)
  });
};

</script>

<style scoped>
.settings-view {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}
.section-card {
  margin-bottom: 30px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1.1em;
  font-weight: bold;
}
.data-management-content {
  padding: 10px 0;
}
.data-group {
  margin-bottom: 25px;
}
.group-title {
  font-size: 1em;
  font-weight: 600;
  margin-bottom: 15px;
  color: #303133;
}
.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 10px;
}
.upload-button, .action-button {
  /* スタイル */
}
.info-alert {
  margin-top: 15px;
}
</style>