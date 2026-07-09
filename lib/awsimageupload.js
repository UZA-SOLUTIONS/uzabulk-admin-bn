var fs = require('fs');
var path = require('path');
var multer = require('multer');
var multerS3 = require('multer-s3');
var aws = require('aws-sdk');

var bucket = env.AWS && env.AWS.BUCKET_NAME;

if (bucket) {
  aws.config.update({
    secretAccessKey: env.AWS.SECRET_ACCESS_KEY,
    accessKeyId: env.AWS.SECRET_ACCESS_ID,
    region: env.AWS.REGION_NAME
  });
}

var s3 = bucket ? new aws.S3() : null;

function localPublicUploadStorage() {
  var uploadRoot = path.join(__dirname, '..', 'public', 'uploads');
  var port = process.env.PORT || 3090;
  var baseUrl = (process.env.LOCAL_UPLOAD_BASE_URL || '').replace(/\/$/, '') || ('http://127.0.0.1:' + port);

  return {
    _handleFile: function (req, file, cb) {
      fs.mkdir(uploadRoot, { recursive: true }, function (mkdirErr) {
        if (mkdirErr) return cb(mkdirErr);
        var key = Date.now().toString() + file.originalname.replace(/[^\w.\-]/g, '_');
        var dest = path.join(uploadRoot, key);
        var out = fs.createWriteStream(dest);
        file.stream.pipe(out);
        out.on('error', cb);
        out.on('finish', function () {
          cb(null, {
            size: out.bytesWritten,
            bucket: 'local',
            key: key,
            acl: 'public-read',
            contentType: file.mimetype,
            metadata: { fieldName: file.fieldname },
            path: dest,
            location: baseUrl + '/uploads/' + encodeURIComponent(key)
          });
        });
      });
    },
    _removeFile: function (req, file, cb) {
      if (file && file.path) {
        return fs.unlink(file.path, cb);
      }
      cb(null);
    }
  };
}

var storage;
if (bucket) {
  storage = multerS3({
    s3: s3,
    bucket: bucket,
    contentLength: 500000000,
    acl: 'public-read',
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      cb(null, Date.now().toString() + file.originalname);
    }
  });
} else {
  console.warn('[awsimageupload] S3_BUCKET_NAME is not set; using public/uploads (local). Set S3_BUCKET_NAME for S3.');
  storage = localPublicUploadStorage();
}

var upload = multer({
  storage: storage
});

module.exports = upload;
