// Core document types
export interface Document {
  id: string;
  title: string;
  content: string;
  section: string;
  path: string;
  metadata: PageMetadata;
}

// Re-export bug types
export * from './bug';

export interface PageMetadata {
  wordCount?: number;
  headings?: string[];
  tags?: string[];
  author?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Search types
export interface SearchResult {
  document: Document;
  score: number;
  matches: TextMatch[];
}

export interface TextMatch {
  text: string;
  start: number;
  end: number;
  context: string;
}

export interface SearchFilters {
  sections?: string[];
  contentTypes?: string[];
}

// Search index types
export interface SearchIndex {
  documents: IndexedDocument[];
  invertedIndex: InvertedIndex;
  metadata: IndexMetadata;
}

export interface IndexedDocument {
  id: string;
  title: string;
  content: string;
  section: string;
  path: string;
  tokens: string[];
  metadata: {
    wordCount: number;
    headings: string[];
    tags: string[];
  };
}

export interface InvertedIndex {
  [token: string]: PostingsList;
}

export interface PostingsList {
  documentIds: string[];
  positions: {
    [docId: string]: number[]; // Positions of token in document
  };
  idf: number; // Inverse Document Frequency
}

export interface IndexMetadata {
  totalDocuments: number;
  totalTokens: number;
  lastIndexed: string;
}

// Bug tracker types
export interface BugEntry {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
  tags: string[];
  assignee?: string;
  markdownFile: string;
}

export interface BugDetail extends BugEntry {
  description: string;
  stepsToReproduce?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  attachments?: string[];
}

export interface BugFormData {
  title: string;
  description: string;
  priority: BugEntry['priority'];
  status: BugEntry['status'];
  tags?: string[];
  stepsToReproduce?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
}

// Configuration types
export interface AppConfig {
  version: string;
  sections: SectionConfig[];
  theme: ThemeConfig;
  search: SearchConfig;
  animations: AnimationConfig;
}

export interface SectionConfig {
  id: string;
  title: {
    ru: string;
    en: string;
  };
  description: {
    ru: string;
    en: string;
  };
  path: string;
  icon: string;
  children?: SectionConfig[];
}

export interface ThemeConfig {
  defaultTheme: 'light' | 'dark';
  colors: {
    light: ColorScheme;
    dark: ColorScheme;
  };
}

export interface ColorScheme {
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  accent: string;
  muted: string;
  border: string;
  card: string;
  cardForeground: string;
}

export interface SearchConfig {
  debounceMs: number;
  maxResults: number;
  minQueryLength: number;
  indexingEnabled: boolean;
}

export interface AnimationConfig {
  enabled: boolean;
  duration: {
    fast: number;
    normal: number;
    slow: number;
  };
  easing: string;
}

// Component prop types
export interface CodeBlockProps {
  code: string;
  language: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  showCopyButton?: boolean;
  fileName?: string;
  diff?: boolean;
}

export interface TableProps {
  data: any[];
  columns: Column[];
  sortable?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  exportable?: boolean;
  stickyHeader?: boolean;
  pageSize?: number;
}

export interface Column {
  key: string;
  title: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

export interface DiagramProps {
  chart: string;
  zoomable?: boolean;
  pannable?: boolean;
  exportable?: boolean;
  theme?: 'light' | 'dark';
}

export interface ChartProps {
  data: ChartData[];
  type: 'line' | 'bar' | 'area' | 'pie';
  xKey: string;
  yKey: string;
  title?: string;
  zoomable?: boolean;
  exportable?: boolean;
}

export interface ChartData {
  [key: string]: any;
}

// API endpoint types
export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  description: string;
  parameters?: ApiParameter[];
  requestExample?: string;
  responseFormat?: string;
  responseExample?: string;
  authentication?: string;
}

export interface ApiParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

// Theme and language types
export type Theme = 'light' | 'dark';
export type Language = 'ru' | 'en';

export interface Translations {
  [key: string]: {
    ru: string;
    en: string;
  };
}

// Navigation types
export interface TOCItem {
  id: string;
  title: string;
  level: number;
  children?: TOCItem[];
}

export interface Breadcrumb {
  label: string;
  path: string;
}
