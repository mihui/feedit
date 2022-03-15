import http from 'http';

export interface FeedItOptions {
  url: string;
  range: string;
  method: string;
  max_buffer_size?: Number;
  min_buffer_size?: Number;
  cache_dir?: string;
}

export interface FeedItMetadata {
  status: Number;
  headers: Record<string, any>;
}

export function stream(opts: FeedItOptions, callback: (data: http.IncomingMessage, meta: FeedItMetadata) => void): Promise<any>;
