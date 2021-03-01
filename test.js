const express = require('express'),
          multer  = require('multer'),
          multerS3 = require('multer-s3'),
          AWS      = require('aws-sdk'),
          fs          = require('fs');

const app = express();
require('dotenv').config();

const s3 = new AWS.S3({
    accessKeyId: process.env.AWSAccessKeyId,
    secretAccessKey: process.env.AWSSecretKey
});

// const uploadFile = (file, fileName) => {
//     // Read content from the file
//     const fileContent = fs.readFileSync(file);

//     // Setting S3 upload
//     const params = {
//         Bucket: process.env.S3BucketName,
//         Key: fileName,
//         Body: fileContent
//     };

//     // Uploading files to bucket
//     s3.upload(params, function (err, data) {
//         if(err) {
//             throw err;
//         }
//         console.log(`File Uploaded Successfully. ${data.location}`);
//     });
// }

// const storage = multer.diskStorage({
//     destination: './files',
//     filename(req, file, cb) {
//         cb(null, `${Date.now()}-${file.originalname}`);
//     },
// });

// const upload = multer({storage});

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.S3BucketName,
        acl: 'public-read',
        metadata: function (req, file, cb) {
            cb(null, {fieldName: file.fieldname});
        },
        key: function (req, file, cb) {
            cb(null, `${Date.now()}-${file.originalname}`)
        }
    })
})

app.post( '/post-img', upload.array('image', 1), async (req, res) => {

    console.log('Successfully uploaded ' + req.files.length + ' files!');
    
    const response = await s3.listObjectsV2({
        Bucket: process.env.S3BucketName
    }).promise();

    const latestUpload = response.KeyCount - 1;
    console.log(response.Contents[latestUpload].Key)
    
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log("Listening on port ", port);
});