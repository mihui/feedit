# Stream It

Stream file from a place to your target

## Usage

It shows you how to install the package, and how to use it from your projects.

### Installation

```bash
npm install streamit
```

### Samples

#### Stream video with Express

```javascript

streamIt.stream({ url: 'https://vjs.zencdn.net/v/oceans.mp4', range: req.headers.range, method: req.method }, (data, meta) => {
  if(meta.status === 200) {
    res.writeHead(meta.headers);
    return res.end();
  }
  res.writeHead(meta.status, meta.headers);
  data?.pipe(res);
}).catch(err => {

});

```
