// require express, cors, mongodb, jwt and dotenv to secure database pass
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt')


// declare app and port
const app = express();
const port = process.env.PORT || 5000;


// use middleware
app.use(cors());
app.use(express.json());


// connect with mongo database

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.eaoeh.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


// set connection function
async function run() {
    try {
        await client.connect();


        // create user collection
        const userCollection = client.db("power_hack").collection("users")

        // create bill collection
        const billCollection = client.db("power_hack").collection("bills")



        /* ========= User Collection API ==============
        =============================================== */


        // user registration api

        app.post('/api/registration', async (req, res) => {
            console.log(req.body);
            const { name, email, password } = req.body;

            if (!name || typeof name !== 'string') {
                return res.json({ status: 'error', error: 'Invalid username' })
            }

            if (!password || typeof password !== 'string') {
                return res.json({ status: 'error', error: 'Invalid password' })
            }

            if (password.length < 5) {
                return res.json({
                    status: 'error',
                    error: 'Password too small. Should be atleast 6 characters'
                })
            }

            const encryptedPassword = await bcrypt.hash(password, 10)

            try {
                const response = await userCollection.insertOne({
                    name,
                    email,
                    password: encryptedPassword
                })
                console.log('User created successfully: ', response)
            } catch (error) {
                if (error.code === 11000) {
                    // duplicate key
                    return res.json({ status: 'error', error: 'Username already in use' })
                }
                throw error
            }

            res.json({ status: 'ok' })
        })


        // user login api

        app.post('/api/login', async (req, res) => {
            // console.log(req.body);
            const { email, password } = req.body;

            const user = await userCollection.findOne({ email });

            if (!user) {
                return res.json({ status: 'error', error: 'Invalid email/password' })
            }

            if (await bcrypt.compare(password, user.password)) {
                // the username, password combination is successful

                // token issue
                const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' });

                // res.send({ result, token });

                /* const token = jwt.sign(
                    {
                        id: user._id,
                        username: user.username
                    },
                    JWT_SECRET
                ) */

                return res.json({ status: 'ok', data: token })
            }

            res.json({ status: 'error', error: 'Invalid username/password' })
        })



        /* ========= Bill Collection API ==============
        =============================================== */


        // get bills
        app.get('/api/billing-list', async (req, res) => {
            console.log('query', req.query)
            const page = parseInt(req.query.existPage)
            const size = parseInt(req.query.pageSize)

            const query = {};
            const cursor = billCollection.find(query);

            let bills;
            if (page || size) {
                bills = await cursor.skip(page * size).limit(size).toArray();
            }

            else {
                bills = await cursor.toArray();
            }


            res.send(bills);
        });


        // to create pagination
        app.get('/billCount', async (req, res) => {
            const count = await billCollection.estimatedDocumentCount();
            res.send({ count })
        })


        // add billing
        app.post('/api/add-billing', async (req, res) => {
            const bill = req.body;
            const result = await billCollection.insertOne(bill);
            res.send({ success: true, result });
        });


        // update billing

        app.put('/api/update-billing/:id', async (req, res) => {

            const id = req.params.id;
            const updatedItem = req.body;

            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };

            const updatedDoc = {
                $set: updatedItem
            };

            const result = await billCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        })


        // delete data : delete a specific bill
        app.delete('/api/delete-billing/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await billCollection.deleteOne(query);
            res.send(result);
        })


    }

    finally {
        // client.close();
    }
}


run().catch(console.dir);



// Make API : check server root
app.get('/', (req, res) => {
    res.send('Power is Distribuiting Power')
})



// listening port
app.listen(port, () => {
    console.log('Power Distributor Port listen', port);
})