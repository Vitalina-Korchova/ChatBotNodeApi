export interface NewsArticle {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
}

export interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: {
    source: { id: string | null; name: string };
    author: string | null;
    title: string;
    description: string;
    url: string;
    urlToImage: string | null;
    publishedAt: string;
    content: string | null;
  }[];
}
