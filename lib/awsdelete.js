var fs = require('fs');
var path = require('path');
var aws = require('aws-sdk');

var bucket = env.AWS && env.AWS.BUCKET_NAME;
var s3 = null;

if (bucket) {
  aws.config.update({
    secretAccessKey: env.AWS.SECRET_ACCESS_KEY,
    accessKeyId: env.AWS.SECRET_ACCESS_ID,
    region: env.AWS.REGION_NAME
  });
  s3 = new aws.S3();
}

module.exports.deleteFromAWS = (keyimage) => {
  var forimage = keyimage.split("/");
  var n = forimage.length;
  var raw = forimage[n - 1];
  var key = raw;
  try {
    key = decodeURIComponent(raw);
  } catch (e) {
    key = raw;
  }

  if (!bucket) {
    var localPath = path.join(__dirname, '..', 'public', 'uploads', key);
    return fs.unlink(localPath, function (err) {
      if (err) console.log(err);
      else console.log("success");
    });
  }

  var params = {
    Bucket: bucket,
    Key: key
  };
  s3.deleteObject(params, function (err, data) {
    if (err) {
      console.log(err, err.stack);
    } else {
      console.log("success");
    }
  });
}
