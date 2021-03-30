/* SERVEUR HTTP  */
const Hapi = require('@hapi/hapi');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const init = async () => {
    const PORT = process.env.PORT || 3000;

    const server = Hapi.server({
        port: PORT,
        host: '0.0.0.0'
    });

    /**
     * MongoDB connection
     */
    const MongoClient = require("mongodb").MongoClient;
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    await client.connect();

    server.route({
        method: 'GET',
        path: '/',
        handler: (request, h) => {

            return 'Hello World!';
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
            const userCollection = client.db("nodejs-project").collection("users");

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
                     * PS: For test purposes we use testENCODE as passphrase for JWT instead of JWT_KEY
                     * TODO: Remove before production
                    */
                    token = jwt.sign({ "id":  user._id}, process.env.JWT_KEY || "testENCODE", {
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