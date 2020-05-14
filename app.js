const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override')


const app = express();

// Middleware
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');

// create mongo connection
const conn = mongoose.createConnection('mongodb://localhost:27017/MongoUploads')

// Init gfs 
let gfs;

conn.once('open', () => {
    // Init stream
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads');
});


// create storage engine
const storage = new GridFsStorage({
    url: 'mongodb://localhost:27017/MongoUploads',
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if(err) {
                    reject(err);
                }
                const filename = buf.toString('hex') + path.extname(file.originalname);
                const fileInfo = {
                    filename,
                    bucketName: 'uploads' // bucket name should match the collection name
                };
                resolve(fileInfo);
            });
        })
    }    
});
const upload = multer({storage});


app.get('/', (req, res) => {
    res.render('index');
});

// @route POST /upload
// @desc Uploads file to db
app.post('/upload', upload.single('file'), (req, res) => {
    //res.json({file: req.file});
    res.redirect('/');
});

// @route GET /file
// @desc Display all files in JSON
app.get('/files' , (req, res) => {
    gfs.files.find().toArray((err, files) => {
        if(!files || !files.length) {
            return res.status(404).json({
                err: 'No files found'
            });
        }

        return res.json(files);
    })
});

app.get('/file/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename}, (err, file) => {
        if(!file) {
            return res.status(404).json({
                err: 'No files found'
            });
        }

        const readstream = gfs.createReadStream(file.filename);
        readstream.pipe(res);
    })
})

const port = 5000;

app.listen(port, () => {console.log('Server listening on '+ port)});


