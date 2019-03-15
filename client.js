const {ChatManager, TokenProvider} = require("@pusher/chatkit")
const {JSDOM} = require('jsdom')
const util = require('util')
const prompt = require('prompt')
const axios = require('axios')
const readline = require('readline')
const ora = require('ora')
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'


const makeChatKitNodeCompatible = () => {
    const {window} = new JSDOM()
    global.window = window
    global.navigator = {}
}

makeChatKitNodeCompatible()

const createUser = async username => {
    try {
        await axios.post('http://localhost:3001/users', {username})
    } catch ({message}) {
        throw new Error(`Failed to create a user, ${message}`)
    }
}

const main = async () => {
    const spinner = ora()
    try {
        prompt.start()
        prompt.message = ""
        const get = util.promisify(prompt.get)
        const usernameSchema = [
            {
                description: "Enter your username",
                name: "username",
                type: "string",
                pattern: /^[a-zA-Z0-9\-]+$/,
                message: "Username must be only letters, numbers, or dashes",
                required: true
            }
        ]
        const {username} = await get(usernameSchema)
        spinner.start('Authenticating...')
        await createUser(username)
        spinner.succeed(`Authenticated as ${username}`)

        const chatManager = new ChatManager({
            instanceLocator: 'v1:us1:d8073837-2e02-4a2a-91fa-d82a8fead4b8',
            userId: username,
            tokenProvider: new TokenProvider({url: 'http://localhost:3001/authenticate'})
        })
        
        spinner.start('Connection to Pusher...')
        const currentUser = await chatManager.connect()
        spinner.succeed("Connected")

        spinner.start("Fetching Rooms...")
        const joinableRooms = await currentUser.getJoinableRooms()
        spinner.succeed("Fetched Rooms")

        const availableRooms = [...currentUser.rooms, ...joinableRooms]

        console.log("Available Rooms: ")
        availableRooms.forEach((room, index) => {
            console.log(`${index} - ${room.name}`)
        })

        const roomSchema = [
            {
                description: 'Select a room:',
                name: 'room',
                conform: v => {
                    if(v >= availableRooms.length){
                        return false
                    }
                    return true
                },
                message: 'Room must only be numbers',
                required: true
            }
        ]

        const { room: chosenRoom } = await get(roomSchema)
        const room = availableRooms[chosenRoom]

        spinner.start(`Joining room ${chosenRoom}...`)
        await currentUser.subscribeToRoom({
            roomId: room.id,
            hooks: {
                onNewMessage: message => {
                    const {senderId, text} = message
                    if(senderId === username) return
                    console.log(`${senderId}: ${text}`)
                }
            },
            messageLimit: 0
        })
        spinner.succeed(`Joined ${room.name} sucessfully`)

        const input = readline.createInterface({input: process.stdin})
        input.on('line', async text => {
            await currentUser.sendMessage({roomId: room.id, text})
        })
    } catch(err){
        spinner.fail()
        console.log(`Failed with ${err}`)
        process.exit(1)
    }
}

main()