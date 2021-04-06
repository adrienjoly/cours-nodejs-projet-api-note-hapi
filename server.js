/* SERVEUR HTTP  */
const Hapi          = require('@hapi/hapi');
const jwt           = require('jsonwebtoken');
const bcrypt        = require('bcrypt');
const MongoClient   = require("mongodb").MongoClient;
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

    await server.start();
    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {

    console.log(err);
    process.exit(1);
});

init();