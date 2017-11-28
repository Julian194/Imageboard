const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const spicedPg = require('spiced-pg');
const db = spicedPg("postgres:juliankaiser:password@localhost:5432/images");
const multer = require('multer');
const uidSafe = require('uid-safe');
const path = require('path');
const toS3 = require('./toS3').toS3;

var diskStorage = multer.diskStorage({
  destination: function(req, file, callback) {
    callback(null, __dirname + '/uploads');
  },
  filename: function(req, file, callback) {
    uidSafe(24).then(function(uid) {
      callback(null, uid + path.extname(file.originalname));
    });
  }
});

var uploader = multer({
  storage: diskStorage,
  limits: {
    fileSize: 2097152
  }
});

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({
  extended: false
}))
app.use(bodyParser.json());

// ******* ROUTES ****** //

app.get('/images', (req, res)  => {
  const q = 'SELECT * FROM images ORDER BY created_at DESC '
  db.query(q).then((result) => {
    res.json({
      images: result.rows
    })
  })
})

app.get('/image/:id', (req,res) => {
  const qImage = `SELECT * FROM images WHERE id = $1`
  const qComments = `SELECT comment_text, username FROM comments WHERE img_id = $1 ORDER BY created_at DESC`
  const params = [req.params.id]
  Promise.all([
    db.query(qImage, params),
    db.query(qComments, params)
  ]).then((result) => {
    res.json({
      imageData: result[0].rows,
      commentData: result[1].rows
    })
  }).catch((err) => console.log(err));
})

app.post('/uploadComment', (req, res) => {
  const params = [req.body.id, req.body.username ,req.body.comment]
  const q = `INSERT INTO comments (img_id, username, comment_text) VALUES ($1,$2,$3)`
  db.query(q).then(() => {
    console.log("saved in comments")
    res.json({
      success: true
    });
  })
})

app.put('/uploadComment', (req,res) => {
  const params = [req.body.id, req.body.username ,req.body.comment]
  const q = `INSERT INTO comments (img_id, username, comment_text) VALUES ($1,$2,$3)`
  if(!req.body.username || !req.body.comment ){
    res.json({success:false})
  } else{
    db.query(q,params).then(() => {
      console.log("saved in comments")
      res.json({
        success: true
      });
    })
  }
})

app.post('/uploadPic', uploader.single('file'), (req, res) => {
  if (!req.body.username||!req.body.title||!req.body.description) {
    res.json({
      success: false
    });
  } else {
    if (req.file) {
      toS3(req.file).then(() => {
        const imgURL = [req.file.filename, req.body.username, req.body.title, req.body.description]
        const q = `INSERT INTO images (image,username,title, description) VALUES ($1,$2,$3,$4)`
        db.query(q, imgURL).then(() => {
          console.log("saved in db")
          res.json({
            success: true
          });
        })
      })
    } else {
      res.json({
        success: false
      });
    }
  }
});

// ******* SET UP PORT ****** //

const port = (8090);
app.listen(port, () => {
  console.log(`Listening on port ${port}`)
});
