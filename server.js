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


if (uri === undefined) {
    console.error("please provide MONGODB_URI");
    process.exit(1);
}

const Boom = require('@hapi/boom');

/* SERVEUR MONGODB */
const { ObjectId } = require('bson');
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



    /**
     * ROUTE /SINGIN POST
     */
    server.route({
        method: 'POST',
        path: '/singin',
        handler: async (request, h) => {
            //Getting users collection from mongodb
            const userCollection = client.db("notes-api").collection("users");

            //getting username and password from POST body
            const username = request.payload.username;
            const password = request.payload.password;

            //setting REGEX to check username with, see later on
            var usernameRegex = /^[a-z]+$/;

            /**
             * initializing code to 200 and errorMessage to null (if none of the if below are met they will stay on success) 
             * and token to empty string
             */
            let errorMessage = null;
            let code = 200;
            let token = "";

            //get user document from users collection to use later on to check if it exists
            const user = collection.find({"username": username}).limit(1).toArray()[0];

            
            if(password.length < 4){
                /**
                 * if password is shorter than 4 characters return code will be 404 
                 * and errorMessage will be "Le mot de passe doit contenir au moins 4 caractères"
                */
                code = 404;
                errorMessage = "Le mot de passe doit contenir au moins 4 caractères";
            }else if(!usernameRegex.test(username)){
                /**
                 * if username does not match the regex, return code will be 400 
                 * and errorMessage will be "Votre identifiant ne doit contenir que des lettres minuscules non accentuées"
                */
                code = 400;
                errorMessage = "Votre identifiant ne doit contenir que des lettres minuscules non accentuées";
            }else if(username.length < 2 || username.length > 20){
                /**
                 * if username is shorter than 2 characters or longer than 20 characters, return code will be 400 
                 * and errorMessage will be "Votre identifiant doit contenir entre 2 et 20 caractères"
                */
                code = 400;
                errorMessage = "Votre identifiant doit contenir entre 2 et 20 caractères";
            }else if(!user){
                /**
                 * if user document contains element username that does not match the username from POST body, return code will be 403 
                 * and errorMessage will be "Cet identifiant est inconnu"
                */
                code = 403;
                errorMessage = "Cet identifiant est inconnu";
            }else{
                //Compare POST body password to mongodb passsword of user using bcrypt.compare()
                const match = await bcrypt.compare(password, user.password);
                if(match){
                    /**
                     * if passwords match, generate token using users id and the JWT_KEY env variable
                    */
                    token = jwt.sign({ "id":  user._id}, process.env.JWT_KEY, {
                        expiresIn: 86400 // expires in 24 hours
                    });
                }
            }

            const data = {
                "error": errorMessage,
                "token": token
            };
            
            return h.response(data).code(code);
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