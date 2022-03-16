const axios = require('axios');
const http = require('http'), 
      https = require('https');
const crypto = require('crypto');
const fs = require('fs'),
      path = require('path');
const ffprobe = require('@ffprobe-installer/ffprobe').path;
const { exec } = require('child_process');

const STATUS_OK = 200;
const STATUS_PARTIAL_CONTENT = 206;
const FILE_HASH_SECRET = 'badges';
const DEFAULT_BUFFER_SIZE = ;
const MIN_BUFFER_SIZE = 1024 * 1000 * 1;
const MAX_BUFFER_SIZE = 1024 * 1000 * 10;
const DEFAULT_CACHE_DIR = '.feedit';

class FeedIt {

  constructor() {
    this.bufferSize = DEFAULT_BUFFER_SIZE;
    this.hashedName = '';  
  }

  getBufferSize() { return this.bufferSize; }
  getHashedName() { return this.hashedName; }

  /**
   * Calculate buffer size and cache it
   * 
   * @param {string} url URL
   * @param {number} max_buffer_size Maximum buffer size of the file
   * @param {number} min_buffer_size Minimize buffer size of the file
   * @param {string} cache_dir Directory for storing cached files
   * @param {boolean} debug Debug
   */
  calculateBufferSize(url, max_buffer_size, min_buffer_size, cache_dir, debug) {
    const md5Hasher = crypto.createHmac('md5', FILE_HASH_SECRET);
    this.hashedName = `${md5Hasher.update(url).digest('hex')}`;
    const cacheDir = path.resolve(cache_dir);
    try {
      if(fs.existsSync(cacheDir) === false) {
        fs.mkdirSync(cacheDir);
        if(debug) {
          console.warn('CREATED CACHE FOLDER');
        }
      }
    }
    catch (err) {
      if(debug) {
        console.warn('NO VIDEO PROBE FOLDER, PLEASE CHECK IF YOU HAVE ACCESS TO THIS FOLDER');
        console.warn(cacheDir);
      }
      return;
    }
    const detectedFile = path.resolve(cache_dir, this.getHashedName());
    try {
      if(fs.statSync(detectedFile).isFile()) {
        const data = fs.readFileSync(detectedFile, { flag: 'r' });
        const rawBitrate = data.toString('utf-8');
        this.bufferSize = Math.min(max_buffer_size, Math.max((Number(rawBitrate) === NaN ? 0 : Number(rawBitrate)), min_buffer_size)); // bps
        return;
      }
    }
    catch(err) {
      if(debug) {
        console.warn('NO VIDEO PROBE CACHE');
      }
    }
    try {
      // Next time the file will be read
      exec([
        ffprobe,
        '-v', 'error',
        '-show_entries', 'format=bit_rate',
        '-of', 'csv="p=0"',
        url
      ].join(' '), (err, stdout, stderr) => {
        if(err) { return; }
        fs.writeFile(detectedFile, stdout, (err) => {
          if(err) return console.warn(err);
          if(debug) {
            console.warn('CREATED VIDEO PROBE CACHE');
          }
        });
      });
    }
    catch(err) {
      if(debug) {
        console.warn('NO VIDEO PROBE RESULT');
      }
    }
  }

  /**
   * Get HTTP(s) client
   * 
   * @param {string} url URL
   * @returns {http | https} Returns HTTP(s) instance
   */
  httpClient (url) {
    const analyzedUrl = new URL(url);
    if(analyzedUrl.protocol === 'https:') { return https; }
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
      end = partialEnd ? partialEnd : Math.min(start + this.getBufferSize(), size - 1);
    }
    else {
      end = Math.min(start + this.getBufferSize(), size - 1);
    }
    return { start, end };
  }

  /**
   * Stream resource
   * 
   * @param {{ url: string, range: string, method: string, max_buffer_size: number, min_buffer_size: number, cache_dir: string, debug: boolean }} opts Options
   * @param {(data: http.IncomingMessage, { status: number, headers: object }) => void} callback 
   * @returns {Promise<any>} Returns callback's return value
   */
  async stream(opts, callback) {

    const { url, range, method = 'GET', max_buffer_size = MAX_BUFFER_SIZE, min_buffer_size = MIN_BUFFER_SIZE, cache_dir = DEFAULT_CACHE_DIR, debug = false } = opts;
    // Determine the HTTP client
    const httpClient = this.httpClient(url);
    // TODO: Replace with the native HttpClient
    const response = await axios({ url, method: 'HEAD' });
    const fileHeaders = response.headers;
    const size = Object.prototype.hasOwnProperty.call(fileHeaders, 'content-length') ? fileHeaders['content-length'] : 1;
    const contentType = Object.prototype.hasOwnProperty.call(fileHeaders, 'content-type') ? fileHeaders['content-type'] : 'application/octet-stream';
    let status = STATUS_OK;
    let headers = { 'accept-ranges': 'bytes', 'connection': 'keep-alive', 'content-type': contentType };

    if (method === 'HEAD') {
      headers['content-length'] = size;
      return callback(null, { status, headers });
    }

    this.calculateBufferSize(url, max_buffer_size, min_buffer_size, cache_dir, debug);
    status = STATUS_PARTIAL_CONTENT;
    const { start, end } = this.getRange(range, size);
    let chunkSize = end - start + 1;

    headers['content-range'] = `bytes ${start}-${end}/${size}`;
    headers['content-length'] = chunkSize;

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
