export interface ArticleInfo {
  id: number;
  content_type: string;
  article_title: string;
  thumbnail: string;
  article_category_id: number;
  short_description: string;
  writter_id: number;
  article_slug: string;
  published_at: string; // ISO date string
  created_at: string; // ISO date string
  content_status: string;
  writter: { fullname: string };
  category: { id: number; article_category_name: string };
}

export interface ArticleContent extends ArticleInfo {
  url: string;
  first_content: {
    status: boolean;
    data: {
      id: null | number;
      first_content: string;
      blocked: boolean;
    };
    message: string;
  };
  second_content: {
    status: boolean;
    data: {
      id: null | number;
      second_content: string;
      blocked: boolean;
    };
    message: string;
  };
}
