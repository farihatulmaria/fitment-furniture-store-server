const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' });
        }
        req.decoded = decoded;
        next();
    }) 
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.8gckp.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    await client.connect();
    const allProducts = client.db("fitmentDataBase").collection("Products");
    const userProducts = client.db("fitmentDataBase").collection("UserProducts");
    try{

        // for jwt
        app.post('/login',(req,res)=>{
            const user = req.body;
            const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1d'
            });
            res.send({ accessToken });
        })


        // loading all of the product on the inventory page
        app.get('/inventory' , async (req,res) => {
            const query = {};
            const cursor = allProducts.find(query);
            const products = await cursor.toArray();
            res.send(products);
        });
        
        // loading a single product (company's  i guess) on inventory
        app.get('/inventory/:id' , async (req,res)=>{
            const id =  req.params.id;
            const query = {_id:ObjectId(id)}; 
            const product = await allProducts.findOne(query);
            res.send(product);
        })

        // updating a single product from inventory
        app.put('/inventory/:id' , async (req,res)=>{
            const id = req.params.id;
            const quantity = req.body.quantity;
            const filler = {_id:ObjectId(id)};
            const options = { upsert: true }; 
            const updateDoc = {
                $set: {
                  "quantity": quantity, 
                },
              };
              const result = await allProducts.updateOne(filler,updateDoc,options)
              res.send(result);
        });

        // deleting a single product (company's i guess)
        app.delete('/inventory/:id' , async (req,res) =>{
            const id =  req.params.id;
            const query = {_id:ObjectId(id)};
            const deletedProduct = await allProducts.deleteOne(query);
            res.send(deletedProduct);
        })


        // getting all of the user's items on My items page
        app.get('/userItems' ,verifyJWT  ,async(req,res)=>{

            const decodedEmail = req.decoded.email;
            const email = req.query.email;
            if (email === decodedEmail) {
                const query = {email:email};
                const cursor = userProducts.find(query);
                const products = await cursor.toArray();
                res.send(products);
            }
            else{
                res.status(403).send({message: 'forbidden access'})
            }
        })

        // adding new products to the user's product(DB)
        app.post('/userItems' , async(req,res) => {
            const newProduct = req.body.items;
            const addedProduct = await userProducts.insertOne(newProduct);
            res.send(addedProduct);
        })

        // deleting a single product (user's)
        app.delete('/userItems/:id' , async (req,res) =>{
            const id =  req.params.id;
            const query = {_id:ObjectId(id)};
            const deletedProduct = await userProducts.deleteOne(query);
            res.send(deletedProduct);
        })

    }finally{

    }

}
run().catch(console.dir);


app.get('/',(req,res)=>{
    res.send('Fitment Server is connected and running')
})
app.listen(port,()=>console.log('listening to port' , port))