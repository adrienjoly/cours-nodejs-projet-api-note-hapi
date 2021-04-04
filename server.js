require('dotenv').config()

/* SERVEUR HTTP  */
const Hapi = require('@hapi/hapi');

const Boom = require('@hapi/boom');

const jwt = require('jsonwebtoken');

const init = async () => {
    const PORT = process.env.PORT || 3000;

    const server = Hapi.server({
        port: PORT,
        host: '0.0.0.0'
    });

    const handleAuthenticateToken = async function (request, h) {
        //const authHeader = request.headers.authorization;
        const authHeader = request.headers['x-access-token'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token == null) {
            throw Boom.badRequest('Token not found');
        }
        try{
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
        handler: (request, h) => {
            var response = {};
            if(request.pre.auth.output){
                //response.error = request.pre.auth.output.payload;
                response.error = "Utilisateur non connecté"; //TODO
                response.notes = [];
                return h.response(response).code(401);
            }
            else{
                response.error = null;
                //response.user = request.pre.auth.name;
                response.notes = ['note 1', 'note 2'];
                return h.response(response).code(200);
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

            const accessToken = jwt.sign(user, process.env.JWT_KEY, { expiresIn: "1m"});
            response.error = null;
            response.accessToken = accessToken;
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