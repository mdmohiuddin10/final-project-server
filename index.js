const express = require('express')
const app = express()
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORT || 5000;


// middleware
app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3gsgkud.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    // collections name
    const usersCollection = client.db('weddingDB').collection('users')
    const bioDataCollection = client.db('weddingDB').collection('biodata')
    const FavouriteDataCollection = client.db('weddingDB').collection('favourite')
    const requestDataCollection = client.db('weddingDB').collection('request')
    const reviewDataCollection = client.db('weddingDB').collection('review')

    // jwt token
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_tOKEN_SECRET, { expiresIn: '2h' });
      res.send({ token });
    })


    // middleware
    // verify token
    const verifyToken = (req, res, next) => {
      // console.log('inside verify token',req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'forbidden access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_tOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'forbidden access' });
        }
        req.decoded = decoded;
        next()
      })
    }

    // verify Admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollectionCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        res.status(403).send({ message: 'forbodden access' })
      }
      next()
    }




    // users Collection and post operation
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await usersCollection.insertOne(user)
      res.send(result)
    })

    // get users
    app.get('/users', verifyToken, async (req, res) => {
      const result = await usersCollection.find().toArray()
      res.send(result)
    })

    // get users with specific email
    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query)
      let admin = false;
      if (user) {
        admin = user.role === 'admin';
      }
      res.send({ admin })
    })

    // patch users to make admin
    app.patch('/users/admin/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc)
      res.send(result)

    })


    // biodata collection
    app.post('/biodata', verifyToken, async (req, res) => {
      const lastBiodata = await bioDataCollection.find().sort({ biodataId: -1 }).limit(1).toArray();
      const lastId = lastBiodata.length > 0 ? lastBiodata[0].biodataId : 0;
      const newId = lastId + 1;

      const biodataInfo = {
        ...req.body, // Spread operator to include all fields from req.body
        biodataId: newId,
      };
      const result = await bioDataCollection.insertOne(biodataInfo)
      res.send(result)
    })

    // patch [manage user]
    app.patch('/biodata/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
       const updatedDoc = {
        $set: {
          status: 'premium'
        }
      }
      const result = await bioDataCollection.updateOne(filter, updatedDoc)
      console.log(result);
      res.send(result)

    })

    // patch to make premium member[approve premium]
    app.patch('/biodata/:email', async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      console.log(filter);
      const updatedDoc = {
        $set: {
          status: 'premium'
        }
      }
      const result = await bioDataCollection.updateOne(filter, updatedDoc)
      console.log('for premium', result);
      res.send(result)

    })



    app.get('/biodata/:email', verifyToken, async (req, res) => {
      const qurey = { email: req.params.email }
      const result = await bioDataCollection.findOne(qurey)
      res.send(result)
    })

    app.get('/biodata/:id', async (req, res) => {
      const id = req.params.id;
      const qurey = { _id: new ObjectId(id) }
      const result = await bioDataCollection.findOne(qurey)
      res.send(result)
    })

    // get all data
    app.get('/biodata', async (req, res) => {
      const result = await bioDataCollection.find().toArray()
      res.send(result)
    })


    // get data for details page
    app.get('/biodata/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { email: email };
      const user = await bioDataCollection.findOne(query)
      let admin = false;
      if (user) {
        admin = user.status === 'premium';
      }
      res.send({ admin })
    })


    // Favourite data collection
    app.post('/favourite', async (req, res) => {
      const user = req.body;
      const query = { favbiodataId: user.favbiodataId }
      const existingUser = await FavouriteDataCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await FavouriteDataCollection.insertOne(user)
      res.send(result)
    })

    // get operation
    app.get('/favourite', async (req, res) => {
      const result = await FavouriteDataCollection.find().toArray()
      res.send(result)
    })


    // delete
    app.delete('/favourite/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await FavouriteDataCollection.deleteOne(query);
      res.send(result)
    })

    // request collection
    app.post('/requset', async (req, res) => {
      const user = req.body;
      const query = { requestedBiodataId: user.requestedBiodataId }
      const existingUser = await requestDataCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await requestDataCollection.insertOne(user)
      res.send(result)
    })

    // 
    app.get('/requset', async (req, res) => {
      const result = await requestDataCollection.find().toArray()
      res.send(result)
    })

    // petch opreation
    app.patch('/requset/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      console.log(filter);
      const updatedDoc = {
        $set: {
          status: 'approved'
        }
      }
      const result = await requestDataCollection.updateOne(filter, updatedDoc)
      res.send(result)

    })

    // delete
    app.delete('/requset/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await requestDataCollection.deleteOne(query);
      res.send(result)
    })

    // review
    app.post('/review', async (req, res) => {
      const item = req.body;
      const result = await reviewDataCollection.insertOne(item)
      res.send(result)
    })

    app.get('/review', async (req, res) => {
      const result = await reviewDataCollection.find().toArray()
      res.send(result)
    })




    // payment-intent
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = (price * 100)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ['card'],
      })

      res.send({
        clientSecret: paymentIntent.client_secret,
      });

    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('server is running speedly...');
})

app.listen(port, () => {
  console.log(`final project is running speedly ${port}`);
})