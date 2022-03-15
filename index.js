const axios = require('axios');
const http = require('http'), 
      https = require('https');
const STATUS_OK = 200;
const STATUS_PARTIAL_CONTENT = 206;
const BUFFER_SIZE = 1024 * 1000 * 1;

class FeedIt {

  /**
   * Get HTTP(s) client
   * 
   * @param {string} url URL
   * @returns {http | https} Returns HTTP(s) instance
   */
  httpClient (url) {
    const analyzedUrl = new URL(url);
    if(analyzedUrl.protocol === 'https:') {
      return https;
    }
    return http;
  };

  /**
   * Get range
   * 
   * @param {string} range Range in request headers
   * @param {*} size Content length
   * @returns {{start: number, end: number}} Positions
   */
  getRange(range, size) {
    let start = 0;
    let end = 0;

    if(range) {
      const parts = range.replace(/bytes=/, '').split('-');
      start = parts[0] ? parseInt(parts[0], 10) : 0;
      const partialEnd = parts[1] ? parseInt(parts[1], 10) : undefined;
      end = partialEnd ?? Math.min(start + BUFFER_SIZE, size - 1);
    }
    else {
      end = Math.min(start + BUFFER_SIZE, size - 1);
    }
    return { start, end };
  }

  /**
   * Stream resource
   * 
   * @param {{ url: string, range: string, method: string }} opts Options
   * @param {(data: http.IncomingMessage, { status: number, headers: object }) => void} callback 
   * @returns {Promise<any>} Returns callback's return value
   */
  async stream(opts, callback) {

    const { url, range, method = 'GET' } = opts;

    const httpClient = this.httpClient(url);

    const response = await axios({ url, method: 'HEAD' });
    const fileHeaders = response.headers;
    const size = fileHeaders['content-length'];
    const contentType = fileHeaders['content-type'] ?? 'application/octet-stream';
    let status = STATUS_OK;
    let headers = { 'accept-ranges': 'bytes', 'connection': 'keep-alive', 'content-type': contentType };

    if (method === 'HEAD') {
      headers['content-length'] = size;
      return callback(null, { status, headers });
    }

    status = STATUS_PARTIAL_CONTENT;

    const { start, end } = this.getRange(range, size);
    let chunkSize = end - start + 1;

    headers['content-range'] = `bytes ${start}-${end}/${size}`;
    headers['content-length'] = chunkSize;
    headers['x-range'] = `${start}-${end}`;

    httpClient.get(url, {
      headers: { Range: `bytes=${start}-${end}`, connection: 'keep-alive' }
    }).on('response', (data) => {
      return callback(data, { status, headers });
    }).on('error', err => {
      throw err;
    });
  }
}

module.exports = new FeedIt();
