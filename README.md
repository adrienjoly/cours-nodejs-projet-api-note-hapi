# api-node-projet
Projet Node ESGI


For local test use http://0.0.0.0:3000

# authentication
curl -X POST --header "Content-Type: application/json" --data "{\"username\":\"ludovic\"}" "http://0.0.0.0:3000/login"

# access notes
curl -X GET --header "Content-Type: application/json" "http://localhost:3000/notes"

# Generate key for JWT
    ->open terminal and make command "node". 
    ->Then in the shell node, make the command "require('crypto').randomBytes(64).toString('hex')" and obtain the key.

# test to generate id with ObjectId()
606b0233b814fd06e19e35a1