import { AssignedTask } from '@/core/models/task.model';
import { Staff } from '@/core/models/staff.model'; // StaffHoliday はこのCSV形式では直接扱わない
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import 'dayjs/locale/ja';
import { v4 as uuidv4 } from 'uuid';

dayjs.extend(customParseFormat);
dayjs.locale('ja');

export interface ParsedCsvResult {
  newlyFoundStaff: Staff[];
  importedAssignedTasks: AssignedTask[];
  // importedHolidays はこのCSV形式では生成されない
}

// 新しいCSVの期待されるヘッダー (日本語)
const EXPECTED_CSV_HEADERS_NEW_FORMAT = ['日付', '名前', '開始時刻', '終了時刻', '休憩開始', '休憩終了'] as const;
type CsvHeaderNewFormat = typeof EXPECTED_CSV_HEADERS_NEW_FORMAT[number];

type CsvRecordNewFormat = {
  [key in CsvHeaderNewFormat]?: string;
} & { lineNumber: number };

export const parseCsvToInternalData = (
  csvString: string,
  existingStaffListFromStore: Staff[]
): ParsedCsvResult => {
  const lines = csvString.trim().replace(/\r\n|\r/g, '\n').split('\n');
  if (lines.length < 1) {
    console.warn('CSVファイルが空です。');
    return { newlyFoundStaff: [], importedAssignedTasks: [] };
  }
  if (lines.length === 1 && !lines[0].trim()) {
    console.warn('CSVファイルが空です。');
    return { newlyFoundStaff: [], importedAssignedTasks: [] };
  }

  const headerLine = lines[0];
  const actualHeaders = headerLine.split(',').map(h => h.trim());

  const headerMap: { [key in CsvHeaderNewFormat]?: number } = {};
  EXPECTED_CSV_HEADERS_NEW_FORMAT.forEach(expectedHeader => {
    const index = actualHeaders.findIndex(actualHeader => actualHeader.toLowerCase() === expectedHeader.toLowerCase());
    if (index !== -1) {
      headerMap[expectedHeader] = index;
    }
  });

  const missingRequiredHeaders = ['日付', '名前', '開始時刻', '終了時刻'].filter( // 「休憩開始」「休憩終了」はオプショナルとする
    (header: any) => headerMap[header as CsvHeaderNewFormat] === undefined
  );
  if (missingRequiredHeaders.length > 0) {
    throw new Error(`CSVヘッダーに必須の列が見つかりません: ${missingRequiredHeaders.join(', ')}。 「日付」「名前」「開始時刻」「終了時刻」は必須です。`);
  }

  const records: CsvRecordNewFormat[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = line.split(','); // TODO: より堅牢なCSVパーサー
    const record: any = { lineNumber: i + 1 };
    EXPECTED_CSV_HEADERS_NEW_FORMAT.forEach(expectedHeader => {
        const index = headerMap[expectedHeader];
        if (index !== undefined) {
            record[expectedHeader] = values[index]?.trim() ?? '';
        }
    });
    records.push(record as CsvRecordNewFormat);
  }

  const newlyFoundStaff: Staff[] = [];
  const importedAssignedTasks: AssignedTask[] = [];

  const existingStaffMapByName = new Map(existingStaffListFromStore.map(s => [s.name, s]));
  const newStaffCacheByName = new Map<string, Staff>();

  for (const record of records) {
    const dateVal = record['日付'];
    const nameVal = record['名前'];
    const workStartTimeVal = record['開始時刻']; // 業務の開始時刻
    const workEndTimeVal = record['終了時刻'];   // 業務の終了時刻
    const breakStartTimeVal = record['休憩開始'];
    const breakEndTimeVal = record['休憩終了'];

    if (!dateVal || !nameVal || !workStartTimeVal || !workEndTimeVal) {
      console.warn(`行 ${record.lineNumber}: 必須項目 (日付, 名前, 開始時刻, 終了時刻) のいずれかが空のためスキップします。`);
      continue;
    }

    let recordDate = dayjs(dateVal, "YYYY-MM-DD", true);
    if (!recordDate.isValid()) recordDate = dayjs(dateVal, "YYYY/MM/DD", true);
    if (!recordDate.isValid()) {
      console.warn(`行 ${record.lineNumber}: 無効な日付形式 "${dateVal}"。`);
      continue;
    }

    let staff: Staff | undefined = existingStaffMapByName.get(nameVal);
    if (!staff) {
      staff = newStaffCacheByName.get(nameVal);
      if (!staff) {
        staff = { id: uuidv4(), name: nameVal };
        newlyFoundStaff.push(staff);
        newStaffCacheByName.set(staff.name, staff);
      }
    }

    // 業務時間のパース
    const parseTime = (timeStr: string, fieldName: string): { hour: number, minute: number } | null => {
        const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
        if (!match) {
            console.warn(`行 ${record.lineNumber}, スタッフ "${staff?.name}", 日付 "${dateVal}": ${fieldName}の形式が不正です "${timeStr}"。HH:MM形式で入力してください。`);
            return null;
        }
        const hour = parseInt(match[1], 10);
        const minute = parseInt(match[2], 10);
        if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
            console.warn(`行 ${record.lineNumber}, スタッフ "${staff?.name}", 日付 "${dateVal}": ${fieldName}の値が不正です "${timeStr}"。`);
            return null;
        }
        return { hour, minute };
    };

    const workStartTimeParsed = parseTime(workStartTimeVal, "業務開始時刻");
    const workEndTimeParsed = parseTime(workEndTimeVal, "業務終了時刻");

    if (!workStartTimeParsed || !workEndTimeParsed) continue; // 必須時刻がパースできなければスキップ

    let workStartDateTime = recordDate.hour(workStartTimeParsed.hour).minute(workStartTimeParsed.minute).second(0);
    let workEndDateTime = recordDate.hour(workEndTimeParsed.hour).minute(workEndTimeParsed.minute).second(0);

    if (workEndDateTime.isBefore(workStartDateTime) || workEndDateTime.isSame(workStartDateTime)) {
      if (workEndTimeParsed.hour < workStartTimeParsed.hour || (workEndTimeParsed.hour === workStartTimeParsed.hour && workEndTimeParsed.minute < workStartTimeParsed.minute)) {
        workEndDateTime = workEndDateTime.add(1, 'day');
      } else {
        console.warn(`行 ${record.lineNumber}, スタッフ "${staff.name}", 日付 "${dateVal}": 業務終了時刻が業務開始時刻と同じか前です。`);
        continue;
      }
    }

    // 休憩時間の処理 (オプショナル)
    let breakNotes: string | undefined = undefined;
    if (breakStartTimeVal && breakEndTimeVal) {
        const breakStartTimeParsed = parseTime(breakStartTimeVal, "休憩開始時刻");
        const breakEndTimeParsed = parseTime(breakEndTimeVal, "休憩終了時刻");

        if (breakStartTimeParsed && breakEndTimeParsed) {
            // 休憩時間が業務時間内に収まっているかなどのバリデーションも可能
            breakNotes = `休憩: ${breakStartTimeVal} - ${breakEndTimeVal}`;
        } else {
            breakNotes = `休憩時間(形式不正): ${breakStartTimeVal} - ${breakEndTimeVal}`;
        }
    } else if (breakStartTimeVal || breakEndTimeVal) {
        breakNotes = `休憩時間(片方のみ指定): ${breakStartTimeVal || ''} - ${breakEndTimeVal || ''}`;
    }

    // このCSV形式では業務内容が不明なため、デフォルトのタスク名を設定
    const defaultTaskTitle = "勤務";

    importedAssignedTasks.push({
      id: uuidv4(),
      staffId: staff.id,
      title: defaultTaskTitle, // CSVに業務内容がないためデフォルト値を設定
      startTime: workStartDateTime.toISOString(),
      endTime: workEndDateTime.toISOString(),
      notes: breakNotes,
    });
  }

  return { newlyFoundStaff, importedAssignedTasks };
};


// --- CSV Export ---
// こちらも新しいヘッダー形式に合わせて修正
export const exportInternalDataToCsv = (
  assignedTasks: AssignedTask[],
  staffList: Staff[]
  // staffHolidays はこのCSV形式では使用しない
): string => {
  const csvRows: string[] = [];
  const headers = ['日付', '名前', '開始時刻', '終了時刻', '休憩開始', '休憩終了'];
  csvRows.push(headers.join(','));

  assignedTasks
    .sort((a, b) => {
      const dateComparison = dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf();
      if (dateComparison !== 0) return dateComparison;
      const staffA = staffList.find(s => s.id === a.staffId)?.name || '';
      const staffB = staffList.find(s => s.id === b.staffId)?.name || '';
      const nameComparison = staffA.localeCompare(staffB, 'ja');
      if (nameComparison !== 0) return nameComparison;
      return dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf();
    })
    .forEach(task => {
      const staff = staffList.find(s => s.id === task.staffId);
      if (!staff) return;

      const date = dayjs(task.startTime).format('YYYY-MM-DD');
      const workStartTime = dayjs(task.startTime).format('HH:mm');
      const workEndTime = dayjs(task.endTime).format('HH:mm');

      // 休憩時間をnotesから抽出 (簡易的な例)
      let breakStartTime = '';
      let breakEndTime = '';
      if (task.notes && task.notes.startsWith('休憩: ')) {
        const اوقاتMatch = task.notes.substring('休憩: '.length).match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
        if (اوقاتMatch) {
          breakStartTime = اوقاتMatch[1];
          breakEndTime = اوقاتMatch[2];
        }
      }
      // このCSV形式では業務内容がヘッダーにないので、task.title は出力しない
      // (もし task.title を「業務内容」として出力したいならヘッダーに追加が必要)

      csvRows.push([
        date,
        staff.name,
        workStartTime,
        workEndTime,
        breakStartTime,
        breakEndTime
      ].map(field => `"${String(field ?? '').replace(/"/g, '""')}"`).join(',')); // field が undefined の場合も考慮
    });

  return csvRows.join('\n');
};