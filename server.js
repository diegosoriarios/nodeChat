const express = require('express')
const bodyParser = require('body-parser')
const cors = require("cors")
const Chatkit = require("@pusher/chatkit-server")
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = express()

const chatkit = new Chatkit.default({
    instanceLocator: 'v1:us1:d8073837-2e02-4a2a-91fa-d82a8fead4b8',
    key: '67121f35-e969-4055-bc5a-d13dd8903e11:3CjGjE+ZLWIIJjNkLoOwkW21jPsFyqAZdtwxgqVmppk='
})

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())
app.use(cors())

app.post("/users", (req, res) => {
    const {username} = req.body
    chatkit
        .createUser({
            id: username,
            name: username
        })
        .then(() => {
            console.log(`User created: ${username}`)
            res.sendStatus(201)
        }) 
        .catch(err => {
            if(err.error === "services/chatkit/user_already_exists"){
                console.log(`User already exists: ${username}`)
                res.sendStatus(201)
            } else {
                const status = err.status;
                res.status(status).json(err)
            }
        })
})

app.post("/authenticate", (req, res) => {
    const authData = chatkit.authenticate({ userId: req.query.user_id })
    res.status(authData.status).send(authData.body)
})

const port = 3001
app.listen(port, err => {
    if(err){
        console.log(err)
    } else {
        console.log(`Running on port ${port}`)
    }
})