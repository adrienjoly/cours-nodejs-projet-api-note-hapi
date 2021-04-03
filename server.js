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
        const authHeader = request.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (token == null) {
            throw Boom.badRequest('Token not found');
        }
        jwt.verify(token, process.env.JWT_KEY, (err, user) => {
            if(err){
                throw Boom.badRequest('Token invalid');
            }
            console.log("here");
            return user;
        });
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
            //console.log(request.pre.auth.output.payload.error);
            if(request.pre.auth.output.payload.error){
                response.error = "Utilisateur non connecté";
                response.notes = [];
                return h.response(response).code(401);
            }
            else{
                response.error = null;
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

            const accessToken = jwt.sign(user, process.env.JWT_KEY, { expiresIn: "60"});
            response.error = null;
            response.accessToken = accessToken;
            return h.response(response).code(200);

        }
    });
    // server.route({
    //     method: 'GET',
    //     path: '/hello/{name}',
    //     handler: (request, h) => {
    //         const name = request.params.name;
    //         return 'Hello ' + name;
    //     }
    // });

    await server.start();
    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {

    console.log(err);
    process.exit(1);
});

init();