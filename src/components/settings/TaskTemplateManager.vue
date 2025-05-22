<template>
  <div class="task-template-manager">
    <!-- テンプレート登録フォーム -->
    <el-form :inline="true" :model="newTaskTemplateForm" @submit.prevent="handleAddTaskTemplate" class="form-section">
      <el-form-item label="テンプレート名">
        <el-input v-model="newTaskTemplateForm.name" placeholder="例: フロント業務"></el-input>
      </el-form-item>
      <el-form-item label="所要時間(分)">
        <el-input-number v-model="newTaskTemplateForm.defaultDurationMinutes" :min="0" :step="15" placeholder="任意"></el-input-number>
      </el-form-item>
      <el-form-item label="カテゴリ">
        <el-input v-model="newTaskTemplateForm.category" placeholder="任意 (例: 清掃)"></el-input>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="handleAddTaskTemplate">登録</el-button>
      </el-form-item>
    </el-form>

    <!-- テンプレート一覧 -->
    <el-table :data="taskTemplates" style="width: 100%" border class="table-section">
      <el-table-column prop="name" label="テンプレート名" />
      <el-table-column prop="defaultDurationMinutes" label="所要時間(分)" width="120" />
      <el-table-column prop="category" label="カテゴリ" />
      <el-table-column label="操作" width="180">
        <template #default="scope">
          <el-button size="small" @click="handleEdit(scope.row)">編集</el-button>
          <el-button size="small" type="danger" @click="handleDelete(scope.row.id)">削除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- テンプレート編集ダイアログ -->
    <el-dialog v-model="editDialogVisible" title="業務テンプレート編集" width="40%">
      <el-form :model="editingTaskTemplate" label-width="100px">
        <el-form-item label="テンプレート名">
          <el-input v-model="editingTaskTemplate.name"></el-input>
        </el-form-item>
        <el-form-item label="所要時間(分)">
          <el-input-number v-model="editingTaskTemplate.defaultDurationMinutes" :min="0" :step="15"></el-input-number>
        </el-form-item>
        <el-form-item label="カテゴリ">
          <el-input v-model="editingTaskTemplate.category"></el-input>
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
import { useTaskStore } from '@/store/task.store';
import type { TaskTemplate } from '@/core/models/task.model';
import { ElMessage, ElMessageBox } from 'element-plus';

const taskStore = useTaskStore();

// テンプレート一覧
const taskTemplates = computed(() => taskStore.taskTemplates);

// テンプレート登録フォーム
const newTaskTemplateForm = reactive<Omit<TaskTemplate, 'id'>>({
  name: '',
  defaultDurationMinutes: undefined, // 初期値はundefinedでプレースホルダー表示
  category: '',
});

const handleAddTaskTemplate = () => {
  if (!newTaskTemplateForm.name.trim()) {
    ElMessage.warning('テンプレート名を入力してください。');
    return;
  }
  // defaultDurationMinutes が undefined の場合はストアに渡さないか、0として扱うなどを検討
  // ここではそのまま渡すが、ストア側でよしなに処理する想定
  taskStore.addTaskTemplate({
    name: newTaskTemplateForm.name.trim(),
    defaultDurationMinutes: newTaskTemplateForm.defaultDurationMinutes,
    category: newTaskTemplateForm.category?.trim() || undefined, // 空文字ならundefined
  });
  ElMessage.success('業務テンプレートを登録しました。');
  // フォームリセット
  newTaskTemplateForm.name = '';
  newTaskTemplateForm.defaultDurationMinutes = undefined;
  newTaskTemplateForm.category = '';
};

// テンプレート編集
const editDialogVisible = ref(false);
const editingTaskTemplate = reactive<Partial<TaskTemplate>>({}); // 初期値は空

const handleEdit = (template: TaskTemplate) => {
  Object.assign(editingTaskTemplate, { ...template }); // スプレッド構文でコピー
  editDialogVisible.value = true;
};

const handleSaveEdit = () => {
  if (!editingTaskTemplate.name?.trim() || !editingTaskTemplate.id) {
    ElMessage.warning('テンプレート名を入力してください。');
    return;
  }
  // taskStore に updateTaskTemplate アクションを実装する必要がある
  taskStore.updateTaskTemplate(editingTaskTemplate as TaskTemplate); // 型アサーション
  ElMessage.success('業務テンプレートを更新しました。');
  editDialogVisible.value = false;
};

// テンプレート削除
const handleDelete = async (templateId: string) => {
  try {
    await ElMessageBox.confirm(
      'この業務テンプレートを削除します。よろしいですか？',
      '確認',
      {
        confirmButtonText: 'はい、削除します',
        cancelButtonText: 'キャンセル',
        type: 'warning',
      }
    );
    // taskStore に deleteTaskTemplate アクションを実装する必要がある
    taskStore.deleteTaskTemplate(templateId);
    ElMessage.success('業務テンプレートを削除しました。');
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('削除中にエラーが発生しました。');
    } else {
      ElMessage.info('削除をキャンセルしました。')
    }
  }
};
</script>

<style scoped>
.task-template-manager {
  /* 必要に応じてスタイル追加 */
}
.form-section {
  margin-bottom: 20px;
}
.table-section {
  margin-top: 20px;
}
</style>