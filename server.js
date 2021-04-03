/* SERVEUR HTTP  */
const Hapi      = require('@hapi/hapi');
const jwt       = require('jsonwebtoken');
const bcrypt    = require('bcrypt');

const uri = "mongodb+srv://admin:admin123@cluster0.qpzcs.mongodb.net/notes-api?retryWrites=true&w=majority";
const MongoClient = require("mongodb").MongoClient;
//const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

if (uri === undefined) {
    console.error("please provide MONGODB_URI");
    process.exit(1);
}

const init = async () => {
    const PORT = process.env.PORT || 3000;

    const server = Hapi.server({
        port: PORT,
        host: 'localhost'
    });

     /**
     * MongoDB connection
     */
     
      await client.connect();

    server.route({
        method: 'GET',
        path: '/',
        handler: (request, h) => {

            return 'Hello!';
        }
    });

    server.route({
        method : "POST",
        path: "/signup",
        handler : (request, h) => {
        
            const username = request.payload.username ? request.payload.username : null;
            const password = request.payload.password ? request.payload.password : null;

           

            let success         = null;
            let code            = null;
            let errorMessage    = null;

            const userCollection    = client.db("nodejs-project").collection("users");
            const user              = userCollection.find({"username": username}).limit(1).toArray()[0];


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

            else if (user)
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
            //Si les 2 paramètres sont valides -> hashage du mot de passe et insertion des données
            const saltRound = 10;
            bcrypt.hash(password,saltRound)
            .then(hashedPassword => {
                userCollection.insertOne({
                    "username" : username,
                    "password" : hashedPassword
                });
            })
            .catch(err => console.error(err.message));

            //Récupératon du nouvel user crée
            const newUser              = userCollection.find({"username": username}).limit(1).toArray()[0];

            token = jwt.sign({ "id":  newUser._id}, process.env.JWT_KEY || "testENCODE", {
                expiresIn: 86400 // expires in 24 hours
            });

            const data = {
                "success" : success,
                "error": errorMessage,
                "token": token
            };
            
            return h.response(data).code(code);
            
        }
    })

    await server.start();
    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {

    console.log(err);
    process.exit(1);
});

init();