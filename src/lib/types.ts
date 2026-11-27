export interface Post {
  slug: string;
  title: string;
  description: string;
  date: string | Date;
  draft: boolean;
  body: string;
  tags?: string[];
  cover?: string;
  coverCaption?: string;
}
