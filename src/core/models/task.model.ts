export interface TaskTemplate {
    id: string; // 一意のID
    name: string; // 例: "フロント業務", "客室清掃A"
    defaultDurationMinutes?: number; // デフォルトの所要時間（分単位）
    category?: string; // 色分け用などのカテゴリ名
    // 備考など追加可能
  }
  
  export interface AssignedTask {
    id: string; // 一意のID (割り当てごとに生成)
    templateId?: string; // TaskTemplateのID (テンプレートから作成された場合)
    title: string; // 業務内容のテキスト (テンプレート名または直接入力)
    startTime: string; // YYYY-MM-DDTHH:mm (ISO 8601形式を推奨、または日付と時刻を分離)
    endTime: string;   // YYYY-MM-DDTHH:mm
    staffId?: string; // 担当スタッフのID (未割り当ての場合はnull/undefined)
    location?: string; // 場所 (任意)
    notes?: string;    // 備考 (任意)
    // 実際の表示に必要な情報 (例: 色) などもここ、またはストアのgetterで派生させる
  }