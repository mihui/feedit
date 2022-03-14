var assert = require('assert');
const feedIt = require('../index');

describe('Test Data Streaming', () => {

  it('Should be good', (done) => {
    feedIt.stream({ url: 'https://vjs.zencdn.net/v/oceans.mp4', range: 'bytes=0-1' }, (data, meta) => {
      assert.strictEqual(meta.status, 206);
      assert.strictEqual(data.headers['content-length'], '2');
      done();
    }).catch(err => {
      console.log('### ERROR.1 ###');
      console.error(err);
      done();
    });
  });

  it('Should be header', (done) => {
    feedIt.stream({ url: 'https://vjs.zencdn.net/v/oceans.mp4', range: 'bytes=0-1', method: 'HEAD' }, (data, meta) => {
      assert.strictEqual(meta.status, 200);
      assert.strictEqual(data, null);
      done();
    }).catch(err => {
      console.log('### ERROR.2 ###');
      done();
    });
  });
});
