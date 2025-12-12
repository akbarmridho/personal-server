export interface Document {
  date: string;
  content: string;
  symbols: string[];
  urls: string[];
  title: string | null;
  subsectors: string[];
  subindustries: string[];
  indices: string[];
}
