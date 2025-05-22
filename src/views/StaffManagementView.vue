<template>
  <div class="staff-management-view">
    <h2>スタッフ管理</h2>

    <!-- スタッフ登録フォーム -->
    <el-form :inline="true" :model="newStaffForm" @submit.prevent="handleAddStaff" class="form-section">
      <el-form-item label="新しいスタッフ名">
        <el-input v-model="newStaffForm.name" placeholder="スタッフ名を入力" @keyup.enter="handleAddStaff"></el-input>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="handleAddStaff">登録</el-button>
      </el-form-item>
    </el-form>

    <!-- スタッフ一覧 -->
    <h3>スタッフ一覧</h3>
    <el-table :data="staffList" style="width: 100%" border class="table-section" empty-text="登録されているスタッフがいません">
      <el-table-column prop="name" label="氏名" sortable />
      <el-table-column label="操作" width="180" align="center">
        <template #default="scope">
          <el-button size="small" :icon="Edit" @click="handleEdit(scope.row)">編集</el-button>
          <el-button size="small" type="danger" :icon="Delete" @click="handleDelete(scope.row.id, scope.row.name)">削除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- スタッフ編集ダイアログ -->
    <el-dialog v-model="editDialogVisible" title="スタッフ情報編集" width="30%" :close-on-click-modal="false">
      <el-form :model="editingStaffForm" label-width="80px" @submit.prevent="handleSaveEdit">
        <el-form-item label="氏名" prop="name" :rules="[{ required: true, message: '氏名は必須です', trigger: 'blur' }]">
          <el-input v-model="editingStaffForm.name" @keyup.enter="handleSaveEdit"></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editDialogVisible = false">キャンセル</el-button>
          <el-button type="primary" @click="handleSaveEdit">保存</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useStaffStore } from '@/store/staff.store';
import { useTaskStore } from '@/store/task.store'; // taskStore をインポート
import type { Staff } from '@/core/models/staff.model';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Edit, Delete } from '@element-plus/icons-vue'; // アイコンをインポート

const staffStore = useStaffStore();
const taskStore = useTaskStore(); // taskStore をインスタンス化

// スタッフ一覧
const staffList = computed(() => staffStore.staffList);

// スタッフ登録フォーム
const newStaffForm = reactive({
  name: '',
});

const handleAddStaff = () => {
  if (!newStaffForm.name.trim()) {
    ElMessage.warning('スタッフ名を入力してください。');
    return;
  }
  const success = staffStore.addStaff(newStaffForm.name.trim());
  if (success) {
    ElMessage.success(`スタッフ「${newStaffForm.name.trim()}」を登録しました。`);
    newStaffForm.name = ''; // フォームをクリア
  } else {
    // ストアのaddStaff内でconsole.warnが出力されている
    const existingStaff = staffStore.getStaffByName(newStaffForm.name.trim());
    if (existingStaff) {
        ElMessage.error(`スタッフ名「${newStaffForm.name.trim()}」は既に存在するため、登録できませんでした。`);
    } else {
        ElMessage.error('スタッフの登録に失敗しました。'); // その他の予期せぬエラー
    }
  }
};

// スタッフ編集
const editDialogVisible = ref(false);
// 編集ダイアログ用のフォームデータ (元のeditingStaffとは分離して、入力バリデーションなどをしやすくする)
const editingStaffForm = reactive<{ id: string | null; name: string }>({
  id: null,
  name: '',
});

const handleEdit = (staff: Staff) => {
  editingStaffForm.id = staff.id;
  editingStaffForm.name = staff.name;
  editDialogVisible.value = true;
};

const handleSaveEdit = () => {
  if (!editingStaffForm.name.trim()) {
    ElMessage.warning('スタッフ名を入力してください。');
    return;
  }
  if (!editingStaffForm.id) {
    ElMessage.error('編集対象のスタッフIDが不明です。');
    return;
  }

  const success = staffStore.updateStaff({ id: editingStaffForm.id, name: editingStaffForm.name.trim() });
  if (success) {
    ElMessage.success(`スタッフ「${editingStaffForm.name.trim()}」の情報を更新しました。`);
    editDialogVisible.value = false;
  } else {
    // ストアのupdateStaff内でconsole.warnが出力されている
    const duplicateExists = staffStore.staffList.some(
        staff => staff.id !== editingStaffForm.id && staff.name === editingStaffForm.name.trim()
    );
    if (duplicateExists) {
        ElMessage.error(`スタッフ名「${editingStaffForm.name.trim()}」は他のスタッフによって既に使用されています。苗字が同じ場合は、名前も入力するなどして一意にしてください。`);
    } else if (!staffStore.getStaffById(editingStaffForm.id)) {
         ElMessage.error('対象のスタッフが見つからず、更新できませんでした。');
    }
    else {
        ElMessage.error('スタッフ情報の更新に失敗しました。'); // その他の予期せぬエラー
    }
  }
};

// スタッフ削除
const handleDelete = async (staffId: string, staffName: string) => { // staffName を引数に追加してメッセージに利用
  try {
    await ElMessageBox.confirm(
      `スタッフ「${staffName}」を削除します。このスタッフに割り当てられている全てのタスクも削除されます。本当によろしいですか？`,
      'スタッフ削除確認',
      {
        confirmButtonText: 'はい、削除します',
        cancelButtonText: 'キャンセル',
        type: 'warning',
        draggable: true,
      }
    );
    // 関連タスクを先に削除
    taskStore.removeTasksByStaffId(staffId);
    // スタッフと関連休日を削除
    staffStore.deleteStaff(staffId);

    ElMessage.success(`スタッフ「${staffName}」を削除しました。`);
  } catch (error: any) {
    if (error !== 'cancel' && (error.name !== 'ElMessageBoxCancelAction' && error.message !== 'cancel')) {
      console.error("スタッフ削除エラー:", error);
      ElMessage.error('スタッフの削除中にエラーが発生しました。');
    } else {
      ElMessage.info('スタッフの削除をキャンセルしました。');
    }
  }
};
</script>

<style scoped>
.staff-management-view {
  padding: 20px;
}
.form-section {
  margin-bottom: 20px;
}
.table-section {
  margin-top: 20px;
}
.dialog-footer {
  text-align: right;
}
</style>