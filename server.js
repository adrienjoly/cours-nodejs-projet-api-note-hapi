require('dotenv').config()

/* SERVEUR HTTP  */
const Hapi = require('@hapi/hapi');

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
        host: '0.0.0.0'
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
            var userId = "606b0233b814fd06e19e35a1"; //l'id user de mongodb. Variable temporaire.

            //the user is not connected
            if(request.pre.auth.output){
                response.error = "Utilisateur non connecté";
                return h.response(response).code(401);
            }
            try{
                const collectionNotes = client.db(dbName).collection('notes');
                const docs = await collectionNotes.find({_id: { $eq: userId}}).toArray();
                response.note = docs;
                return h.response(response).code(200);
            }catch(err){
                //response.error = "Error in Database"; //TODO
                response.error = err;
                return h.response(response).code(401);
            }
        }
    });

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
            var userId = "606b0233b814fd06e19e35a1"; //l'id user de mongodb. Variable temporaire.
            console.log(userId);

            //the user is not connected
            if(request.pre.auth.output){
                response.error = "Utilisateur non connecté";
                return h.response(response).code(401);
            }
            //the user didn't give a content in the body request
            if(!request.payload && !request.payload.content){
                response.error = "Pas de content fourni";
                return h.response(response).code(401);
            }
            try{
                const collectionNotes = client.db(dbName).collection('notes');
                await collectionNotes.insertOne({
                    userId: userId, //TODO trouver à quel moment recuperer l'id d'utilisateur??
                    content: request.payload.content,
                    createdAt: Date().now(),
                    lastUpdatedAt: null
                });
                const docs = await collectionNotes.find({_id: { $eq: userId}}).toArray();
                response.note = docs;
                return h.response(response).code(200);
            }catch(err){
                //response.error = "Error in Database"; //TODO
                response.error = err;
                return h.response(response).code(401);
            }
        }
    });

    server.route({
        method: 'POST',
        path: '/login',
        handler: (request, h) => {
            var response = {};
            if(!request.payload){
                response.error = 'No username given';
                response.accessToken = null;
                return h.response(response).code(401);
            }
            const username = request.payload.username;
            const user = { name: username }

            const accessToken = jwt.sign(user, process.env.JWT_KEY, { expiresIn: "2m"});
            response.error = null;
            response.accessToken = accessToken;
            //TODO: connection mongodb et récupération de l'id de l'utilisateur connecté
            return h.response(response).code(200);

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