import http from 'http';

export interface FeedItOptions {
  url: string;
  range: string | string[];
  method: string;
  max_buffer_size?: number;
  min_buffer_size?: number;
  cache_dir?: string;
}

export interface FeedItMetadata {
  status: number;
  headers: http.OutgoingHttpHeaders;
}

export function stream(opts: FeedItOptions, callback: (data: http.IncomingMessage, meta: FeedItMetadata) => void): Promise<any>;
