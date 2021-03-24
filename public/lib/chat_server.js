const socketio = require('socket.io')
let io
let guestNumber = 1
const nickNames = {}
const namesUsed = []
const currentRoom = {}

exports.listen = function (server) {
  io = socketio.listen(server)

  io.set('log level', 1)

  io.sockets.on('connection', (socket) => {
    guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed)
    console.log('连接了', guestNumber)

    joinRoom(socket, 'Lobby')

    handleMessageBroadcasting(socket, nickNames)

    handleNameChangeAttempts(socket, nickNames, namesUsed)

    handleRoomJoining(socket)

    socket.on('room', () => {
      socket.emit('rooms', io.sockets.manager.rooms)
    })

    handleClientDisconnection(socket, nickNames, namesUsed)
  })
}

// 分配用户昵称
function assignGuestName (socket, guestNumber, nickNames, namesUsed) {
  const name = 'Guest' + guestNumber
  nickNames[socket.id] = name
  socket.emit('nameResult', {
    success: true,
    name: name
  })
  namesUsed.push(name)
  console.log('已使用了的nickname', namesUsed)
  return guestNumber + 1
}

// 进入聊天室
function joinRoom (socket, room) {
  socket.join(room)
  currentRoom[socket.id] = room
  socket.emit('joinResult', { room: room })
  socket.broadcast.to(room).emit('message', {
    text: nickNames[socket.id] + ' has joined ' + room + '.'
  })

  const usersInRoom = io.sockets.clients(room)
  if (usersInRoom.length > 1) {
    let usersInRoomSummary = 'Users currently in ' + room + ': '
    for (const index in usersInRoom) {
      const userSocketId = usersInRoom[index].id
      if (userSocketId !== socket.id) {
        if (index > 0) {
          usersInRoomSummary += ', '
        }
        usersInRoomSummary += nickNames[userSocketId]
      }
    }
    usersInRoomSummary += '.'
    socket.emit('message', { text: usersInRoomSummary })
  }
}

// 昵称变更请求
function handleNameChangeAttempts (socket, nickNames, namesUsed) {
  socket.on('nameAttempt', name => {
    if (name.indexOf('Guest') === 0) {
      socket.emit('nameResult', {
        success: false,
        message: 'Names cannot begin with "Guest"'
      })
    } else {
      if (namesUsed.indexOf(name) === -1) {
        const previousName = nickNames[socket.id]
        const previousNameIndex = namesUsed.indexOf(previousName)
        namesUsed.push(name)
        nickNames[socket.id] = name
        delete namesUsed[previousNameIndex]
        socket.emit('nameResult', {
          success: true,
          name: name
        })
        socket.broadcast.to(currentRoom[socket.id]).emit('message', {
          text: previousName + ' is now known as ' + name + '.'
        })
      } else {
        socket.emit('nameResult', {
          success: false,
          message: 'That name is already in use'
        })
      }
    }
  })
}

// 发送聊天消息
function handleMessageBroadcasting (socket) {
  socket.on('message', message => {
    socket.broadcast.to(message.room).emit('message', {
      text: nickNames[socket.id] + ': ' + message.text
    })
  })
}

// 创建房间
function handleRoomJoining (socket) {
  socket.on('join', room => {
    socket.leave(currentRoom[socket.id])
    joinRoom(socket, room.newRoom)
  })
}

// 用户断开连接
function handleClientDisconnection (socket) {
  socket.on('disconnect', () => {
    const nameIndex = namesUsed.indexOf(nickNames[socket.id])
    delete namesUsed[nameIndex]
    delete nickNames[socket.id]
  })
}
