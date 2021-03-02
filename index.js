const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const cors = require("cors");
const morgan = require("morgan");
const fetch = require("node-fetch");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
// AWS
const AWS = require("aws-sdk");
const fs = require("fs");
const multer = require("multer");
const multerS3 = require("multer-s3");
// PAYPAL
const paypal = require("paypal-rest-sdk");

// Importing middleware
const checkAuth = require("./api/middleware/check-auth");

// Bringing in database Models
const saveVideo = require("./api/models/saveVideo");
const Posts = require("./api/models/Posts");
const User = require("./api/models/newUser");
const Event = require("./api/models/newEvent");

require("dotenv").config();

// Start express
const app = express();

// Setting bodyParser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware
app.use(cookieParser());
app.use(morgan("tiny"));

const whitelist = [
  `${process.env.FRONT_URL}`,
  "https://ebenezer-virtual.herokuapp.com",
  "http://localhost:3000",
  "https://iglesiaebenezer.netlify.app",
];
app.use(
  cors({
    origin: function (origin, callback) {
      if (whitelist.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// URL to connect to MongoDB
const uri = `mongodb+srv://Orlando:${process.env.ORLANDOPASSWORD}@testcluster-tter6.mongodb.net/ebenezer?retryWrites=true&w=majority`;

// configure the keys for accessing AWS
AWS.config.update({
  accessKeyId: process.env.AWSAccessKeyId,
  secretAccessKey: process.env.AWSSecretKey,
});

// Create S3 instance
const s3 = new AWS.S3();

// Upload to AWS S3
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3BucketName,
    acl: "public-read",
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  }),
});

// Configuring PAYPAL
paypal.configure({
  mode: "sandbox", //sandbox or live
  client_id: process.env.PAYPALClientID,
  client_secret: process.env.PAYPALClientSecret,
});

// Getting the date
var myDate = new Date();
var day = myDate.getDate();
var month = myDate.getMonth();
var year = myDate.getFullYear();
// var hours = myDate.getHours();
// var minutes = myDate.getMinutes();
// var seconds = myDate.getSeconds();
switch (month) {
  case 0:
    month = "Jan";
    break;
  case 1:
    month = "Feb";
    break;
  case 2:
    month = "March";
    break;
  case 3:
    month = "April";
    break;
  case 4:
    month = "May";
    break;
  case 5:
    month = "June";
    break;
  case 6:
    month = "July";
    break;
  case 7:
    month = "Aug";
    break;
  case 8:
    month = "Sep";
    break;
  case 9:
    month = "Oct";
    break;
  case 10:
    month = "Nov";
    break;
  case 11:
    month = "Dec";
    break;
}

// Getting live video --------------------------------------------------------------------------------------
const liveUrl =
  "https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=UC1h3zwfeST-fRIrZGGJfJig&maxResults=5&order=date";
app.get("/live", async (req, res) => {
  fetch(`${liveUrl}&key=${process.env.GOOGLE_API_KEY}`)
    .then((response) => response.json())
    .then(async (json) => {
      // connecting to database
      await mongoose
        .connect(uri, { useUnifiedTopology: true, useNewUrlParser: true })
        .then(() => {
          // check if it connected
          mongoose.connection.on("connected", () => {});
        });

      // Checking the latest entry
      const latestInDB = await saveVideo.findOne({}).sort({ $natural: -1 });

      const videoData = json.items;

      // starting variables for information about video
      var liveVidId;
      var publishedDate;
      var title;
      var description;
      var i = 0;

      for (i = 1; i < videoData.length; i++) {
        // initiating going through data

        if (videoData[i].snippet.liveBroadcastContent === "live") {
          // check if any itteration has live video

          // setting variables to data
          liveVidId = videoData[i].id.videoId;
          publishedDate = videoData[i].snippet.publishedAt;
          title = videoData[i].snippet.title;
          description = videoData[i].snippet.description;
          console.log("Live Broadcast");
          break; // leave if live video found and data assigned
        }
      }

      if (liveVidId !== undefined) {
        // checking if data was assigned

        if (liveVidId !== latestInDB.videoid) {
          // checking if the data is already saved

          // Saving the new entry
          saveVideo.create({
            videoid: liveVidId,
            publishedData: publishedDate,
            title: title,
            description: description,
            saved: `${month}/${day}/${year}`,
          });
          res.status(200).send("We saved video.ID:" + liveVidId);
          console.log("We saved video. ID:" + liveVidId);
        } else {
          // Rejecting request
          res.send(422).send("Video is already in database");
          console.log("Video is already in databse");
        }
      } else {
        // Assigning data from latest YouTube video
        liveVidId = videoData[0].id.videoId;
        publishedDate = videoData[0].snippet.publishedAt;
        title = videoData[0].snippet.title;
        description = videoData[0].snippet.description;
        console.log("No Live Video. This is the latest entry: " + liveVidId);

        if (liveVidId !== latestInDB.videoid) {
          // checking if already in database
          // Saving the new entry
          saveVideo.create({
            videoid: liveVidId,
            publishedData: publishedDate,
            title: title,
            description: description,
            saved: `${month}/${day}/${year}`,
          });
          res.status(200).send("We saved video.ID:" + liveVidId);
          console.log("We saved video. ID:" + liveVidId);
        } else {
          // Rejecting request
          res.status(422).send("Video is already in database");
          console.log("Video is already in databse");
        }
      }
    });
});

// Getting all the video information -------------------------------------------------------------------------
app.get("/videos", async (req, res) => {
  // connecting to database
  await mongoose
    .connect(uri, { useUnifiedTopology: true, useNewUrlParser: true })
    .then(() => {
      // check if it connected
      mongoose.connection.on("connected", () => {
        console.log("Databse has been connected");
      });
    });
  // saving data to a variable
  const data = await saveVideo.find({}).sort({ $natural: -1 }).skip(1).limit(3);
  console.log(data);
  await res.json(data);

  mongoose.connection.close();
});

// Getting latest video information -------------------------------------------------------------------------
app.get("/latestvideo", async (req, res) => {
  // connecting to database
  await mongoose
    .connect(uri, { useUnifiedTopology: true, useNewUrlParser: true })
    .then(() => {
      // check if it connected
      mongoose.connection.on("connected", () => {
        console.log("Databse has been connected");
      });
    });
  // saving data to a variable
  const data = await saveVideo.findOne({}).sort({ $natural: -1 });
  console.log(data);
  await res.json(data);

  mongoose.connection.close();
});

// New Post POST Request
// ------- upload.array() ------// makes FormData Objects readable ------- //
app.post(
  "/posts/store",
  checkAuth,
  upload.array("file", 1),
  async (req, res) => {
    // Connect to DB
    await mongoose
      .connect(uri, { useUnifiedTopology: true, useNewUrlParser: true })
      .then(async () => {
        // check if it connected
        await mongoose.connection.once("open", () => {});
      });

    if (req.body.title !== "" && req.body.body !== "" && req.body.file !== "") {
      var imageUrl = null;

      // Getting objects from S3
      const response = await s3
        .listObjectsV2({
          Bucket: process.env.S3BucketName,
        })
        .promise();

      // Getting the latest upload URL
      const latestUploadNumber = response.KeyCount - 1;
      const latestUpload = response.Contents[latestUploadNumber].Key;
      imageUrl = `https://ebenezerimages.s3.us-east-2.amazonaws.com/${latestUpload}`;

      // Save all files to database
      await Posts.create({
        title: req.body.title,
        body: req.body.body,
        image: imageUrl,
        date: `${month} ${day}, ${year}`,
      });
      // send back response
      await res.send({ status: "SUCCESS" });
    }

    // Closing the connection with the database
    mongoose.connection.close();
  }
);

// Getting the saved Posts ---------------------------------------------------------------------------
app.get("/posts", async (req, res) => {
  // connecting to database
  await mongoose
    .connect(uri, { useUnifiedTopology: true, useNewUrlParser: true })
    .then(() => {
      // check if it connected
      mongoose.connection.on("connected", () => {});
    });

  // saving data to a variable
  const data = await Posts.find({}).sort({ $natural: -1 }).limit(3);
  console.log(data);
  await res.json(data);

  mongoose.connection.close();
});

// @Create New Event
app.post("/event/store", async (req, res) => {
  // Connect to DB
  await mongoose
    .connect(uri, { useUnifiedTopology: true, useNewUrlParser: true })
    .then(async () => {
      // check if it connected
      await mongoose.connection.once("open", () => {});
    });

  if (
    req.body.title !== undefined &&
    req.body.description !== undefined &&
    req.body.dateStart !== undefined &&
    req.body.dateEnd !== undefined
  ) {
    // Save the event in MongoDB
    await Event.create({
      title: req.body.title,
      description: req.body.description,
      date: [
        {
          start: req.body.dateStart,
          end: req.body.dateEnd,
        },
      ],
      madedate: `${month} ${day}, ${year}`,
    });
    // send back response
    await res.send({ status: "SUCCESS" });
  }

  // Closing the connection with the database
  mongoose.connection.close();
});

// Payment
// @Sending the payment to paypal -------------------------------------------------------
app.post("/give", async (req, res) => {
  const giveType = req.body.type,
    giveDollars = req.body.dollars,
    giveCents = req.body.cents,
    giveFirstName = req.body.firstName,
    giveLastName = req.body.lastName;

  var amount = giveDollars + "." + giveCents,
    sku = null;

  if (giveType !== null) {
    // Managing the SKU
    switch (giveType) {
      case "Ofrenda":
        sku = 001;
        break;
      case "Diezmo":
        sku = 002;
        break;
      case "Missiones":
        sku = 003;
        break;
    }

    // Create payment json object
    const create_payment_json = {
      intent: "sale",
      payer: {
        payment_method: "paypal",
      },
      redirect_urls: {
        return_url: "http://localhost:3000/success",
        cancel_url: "http://localhost:3000/cancel",
      },
      transactions: [
        {
          item_list: {
            items: [
              {
                name: giveType,
                sku: sku,
                price: amount,
                currency: "USD",
                quantity: 1,
              },
            ],
          },
          amount: {
            currency: "USD",
            total: amount,
          },
          description: `Dinero para ${giveType}.`,
        },
      ],
    };

    await paypal.payment.create(create_payment_json, function (error, payment) {
      if (error) {
        throw error;
      } else {
        for (let i = 0; i < payment.links.length; i++) {
          if (payment.links[i].rel === "approval_url") {
            res.send(payment.links[i].href);
          }
        }
      }
    });

    // Saving info on Diezmo in the database for later use
    // if( giveType === 'Diezmo' && giveFirstName !== null && giveLastName !== null) {
    //     nameType = req.body.type

    // } else {
    //     // Condition for not Diezmos
    //     nameType = req.body.type
    // }
  } else {
    console.log("An error has occured");
  }
});

// Paypal Give Success ---------------------------------------------
app.get("/success", (req, res) => {
  const query = req.query[0];
  const PaymentId = query.substring(query.indexOf("=") + 1, query.indexOf("&"));
  const PayerID = query.substring(query.indexOf("PayerID=") + 8);

  const payerId = { payer_id: PayerID };
  const paymentId = PaymentId;

  paypal.payment.execute(paymentId, payerId, function (error, payment) {
    if (error) {
      console.log(JSON.stringify(error));
    } else {
      if (payment.state == "approved") {
        res.sendStatus(200);
      } else {
        console.log("payment not successful");
      }
    }
  });
});

// Creating New User ---------------------------------------------
app.post("/signup", upload.array("file", 1), async (req, res) => {
  // Connect to DB
  await mongoose
    .connect(uri, { useUnifiedTopology: true, useNewUrlParser: true })
    .then(async () => {
      // check if it connected
      await mongoose.connection.once("open", () => {});
    });

  // To check if email is in user
  User.find({ email: req.body.email })
    .select("email -_id")
    .exec()
    .then((user) => {
      // If email is not in use
      if (user[0] === undefined) {
        bcrypt.hash(req.body.password, 10, async (err, hash) => {
          if (err) {
            return res.status(500).json({
              error: err,
            });
          } else if (hash) {
            // Checking if there was an image provided
            // if( req.file ) {

            var imageUrl = null;

            // Getting objects from S3
            const response = await s3
              .listObjectsV2({
                Bucket: process.env.S3BucketName,
              })
              .promise();

            // Getting the latest upload URL
            const latestUploadNumber = response.KeyCount - 1;
            const latestUpload = response.Contents[latestUploadNumber].Key;
            imageUrl = `https://ebenezerimages.s3.us-east-2.amazonaws.com/${latestUpload}`;

            await User.create({
              email: req.body.email,
              password: hash,
              fullName: req.body.fullName,
              role: req.body.role,
              image: imageUrl,
              date: Date.now(),
            });

            // send back response
            await res.send({ status: "SUCCESS" });
            mongoose.connection.close();

            // } else {
            //     await User.create({
            //         email: req.body.email,
            //         password: hash,
            //         fullName: req.body.fullName,
            //         image: imageUrl,
            //         date: Date.now()
            //     });

            //     // send back response
            //     await res.send({ status: 'SUCCESS' });
            //     mongoose.connection.close();
            // }
          } else {
            console.log(error);
          }
        });

        // If email is in use
      } else {
        return res.status(409).json({
          message: "Email already in use",
        });
      }
    });
});

// LogIn users -------------------------------------
app.post("/login", async (req, res) => {
  console.log(req.body);
  // Connect to DB
  await mongoose
    .connect(uri, { useUnifiedTopology: true, useNewUrlParser: true })
    .then(async () => {
      // check if it connected
      await mongoose.connection.once("open", () => {});
    });

  // Check the email
  User.find({ email: req.body.email })
    .exec()
    .then((user) => {
      // Check if email is in database
      if (user.length < 1) {
        return res.status(401).json({
          message: "Auth Failed",
        });
        mongoose.connection.close();
      }
      // Comapre the if the passwords match
      bcrypt.compare(req.body.password, user[0].password, (err, result) => {
        if (err) {
          return res.status(401).json({
            message: "Auth failed",
          });
          mongoose.connection.close();
        }
        if (result) {
          // Generating the JWT
          const token = jwt.sign(
            {
              // email: user[0].email, REMOVED FOR THE TIME BEING
              id: user[0]._id,
              fullName: user[0].fullName,
              role: user[0].role,
              avatar: user[0].image,
            },
            process.env.JWT_KEY,
            {
              expiresIn: "1h",
            }
          );

          // Storing JWT into a cookie
          res.cookie("token", token, {
            expires: new Date(Date.now() + 3600000),
            httpOnly: false, // WHEN THIS IS SET TO TRUE, AND UPLOADED TO PRODUCTION, CLIENT SIDE WILL NOT BE ABLE TO READ THE COOKIE
          });
          return res.status(200).json({
            message: "User authenticated",
            token: token,
          });

          mongoose.connection.close();
        }
        res.status(401).json({
          message: "Auth failed",
        });
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({
        error: err,
      });
      mongoose.connection.close();
    });
});

// -----------------------------FIX----------------------------------
// Delete user
app.delete("/user/:userId", (req, res) => {
  User.remove({ _id: req.params.userId })
    .exec()
    .then((result) => {
      res.status(200).json({
        message: "User deleted",
      });
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
    });
});

app.get("/getUserInfo", async (req, res) => {
  console.log("You are getting a user");

  // Connect to DB
  await mongoose
    .connect(uri, { useUnifiedTopology: true, useNewUrlParser: true })
    .then(async () => {
      var id = "5f496463622b62236838349c";
      User.findById(id, function (err, result) {
        if (err) {
          res.json("nothing happened");
        }
        res.json(result);
      });
    });
});

app.get("/getUsers", async (req, res) => {
  console.log("You are getting all the users");

  await mongoose
    .connect(uri, { useUnifiedTopology: true, useNewUrlParser: true })
    .then(async () => {
      User.find({ role: { $nin: "admin" } }, function (err, result) {
        if (err) {
          res.status(404).json({
            error: err,
          });
        }
        res.json(result);
      }).sort({ fullName: 1 });
    });
});

// Not Found
function notFound(req, res, next) {
  res.status(404);
  const error = new Error("Not Found");
  next(error);
}
// Handle the error
function errorHandler(error, req, res, next) {
  res.status(res.statusCode || 500);
  res.json({
    message: error.message,
  });
}

// assigning new error and not found middleware
app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log("Listening on port ", port);
});
