require('dotenv').config()

/* SERVEUR HTTP  */
const Hapi          = require('@hapi/hapi');
const jwt           = require('jsonwebtoken');
const bcrypt        = require('bcrypt');
const MongoClient   = require("mongodb").MongoClient;
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});
/**
     * MongoDB connection
     */
     
 await client.connect();

if (uri === undefined) {
    console.error("please provide MONGODB_URI");
    process.exit(1);
}

const Boom = require('@hapi/boom');

const jwt = require('jsonwebtoken');

/* SERVEUR MONGODB */
const MongoClient = require('mongodb').MongoClient;
const { ObjectId } = require('bson');

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
const dbName = 'notes-api';


const init = async () => {
    await client.connect();

    const PORT = process.env.PORT || 3000;

    const server = Hapi.server({
        port: PORT,
        host: 'localhost'
    });

     
    const handleAuthenticateToken = async function (request, h) {
        //const authHeader = request.headers.authorization;
        const authHeader = request.headers['x-access-token'];
        const token = authHeader && authHeader.split(' ')[1];

        //have we found a token?
        if (token == null) {
            throw Boom.badRequest('Token not found');
        }
        try{
            //is the token still valid?
            const user = jwt.verify(token, process.env.JWT_KEY);
            return user;
        } catch(err){
            throw Boom.badRequest('Token invalid');
        }
        
    };

    server.route({
        method: 'GET',
        path: '/notes',
        options: {
            pre: [
                { method: handleAuthenticateToken, assign: 'auth', failAction: 'log'}
            ]
        },
        handler: async (request, h) => {
            var response = {};
            response.error = null;
            response.note = [];

            //the user is not connected
            if(request.pre.auth.output){
                response.error = 'Utilisateur non connecté';
                return h.response(response).code(401);
            }
            try{
                const collectionNotes = client.db(dbName).collection('notes');
                const docs = await collectionNotes.find({userId: { $eq: userId1}}).toArray();
                response.note = docs;
                return h.response(response).code(200);
            }catch(err){
                response.error = 'Error in Database';
                return h.response(response).code(401);
            }
        }
    });

    server.route({
        method : "POST",
        path: "/signup",
        handler : async (request, h) => {
            try{
                const username = request.payload.username ? request.payload.username : null;
                const password = request.payload.password ? request.payload.password : null;

            

                let success         = true;
                let code            = 200;
                let errorMessage    = null;
                let token           = null;

                const userCollection    = await client.db("nodejs-project").collection("users");
                const user              = await userCollection.find({"username": username}).toArray();

                //Contrôle des paramètres envoyés

                if(!username || !password)
                {
                    success         = false;
                    code            = 400;
                    errorMessage    = "Un nom d'utilisateur ainsi qu'un mot de passe sont requis."
                }

                else if(username.length < 2 || username.length > 20)
                {
                    success         = false;
                    code            = 400;
                    errorMessage    = "Votre identifiant doit contenir entre 2 et 20 caractères."
                }            

                //Contrôle de la longueur du mot de passe
                else if(password.length < 4)
                {
                    success         = false;
                    code            = 400;
                    errorMessage    = "Le mot de passe doit contenir au moins 4 catactères."
                    
                }

                else if (user.length > 0)
                {
                    success         = false;
                    code            = 400;
                    errorMessage    = "Cet identifiant est déjà associé à un compte";
                }

                else{
                    for(let i = 0; i < username.length; i++)
                    {
                        if(username[i] < "a" || username[i] > "z")
                        {
                            success          = false;
                            code             = 400;
                            errorMessage     = "Votre identifiant ne doit contenir que des lettres minuscules non accentuées";
                        }
                    } 
                }

                if(success){
                    //Si les 2 paramètres sont valides -> hashage du mot de passe et insertion des données
                        const saltRound = 10;
                        let hashedPw = await bcrypt.hash(password,saltRound)
                        await userCollection.insertOne({
                            "username" : username,
                            "password" : hashedPw
                        });

                        //Récupératon du nouvel user crée
                        const newUser              =  await userCollection.find({"username": username}).limit(1).toArray();

                        token = jwt.sign({ "id":  newUser._id}, process.env.JWT_KEY || "testENCODE", {
                            expiresIn: 86400 // expires in 24 hours
                        });
                }
            

                const data = {
                    "error": errorMessage,
                    "token" : token
                };
                
                return h.response(data).code(code);
            }

            catch(err){
                return err;
            }
        }
    })
    server.route({
        method: 'PUT',
        path: '/notes',
        options: {
            pre: [
                { method: handleAuthenticateToken, assign: 'auth', failAction: 'log'}
            ]
        },
        handler: async (request, h) => {
            var response = {};
            response.error = null;
            response.note = {};

            //the user is not connected
            if(request.pre.auth.output){
                response.error = 'Utilisateur non connecté';
                return h.response(response).code(401);
            }
            //the user didn't give a content in the body request
            if(!request.payload && !request.payload.content){
                response.error = 'Pas de content fourni';
                return h.response(response).code(401);
            }
            //is the data in the token have the user id?
            if(!request.pre.auth.id){
                response.error = 'Pas d\'id trouvé';
                return h.response(response).code(401);
            }
            try{
                const collectionNotes = client.db(dbName).collection('notes');
                await collectionNotes.insertOne({
                    userId: request.pre.auth.id,
                    content: request.payload.content,
                    createdAt: Date(),
                    lastUpdatedAt: null
                });
                const docs = await collectionNotes.find({}, {sort: {_id: -1}, limit: 1 }).toArray(); //trouver le dernier document de note venant d'être créé
                response.note = docs;
                return h.response(response).code(200);
            }catch(err){
                response.error = 'Error in Database';
                return h.response(response).code(401);
            }
        }
    });



    await server.start();
    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {

    console.log(err);
    process.exit(1);
});

init();