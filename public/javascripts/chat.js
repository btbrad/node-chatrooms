const Chat = function (socket) {
  this.socket = socket
}

Chat.prototype.sendMessage = function (room, text) {
  const message = {
    room: room,
    text: text
  }
  this.socket.emit('message', message)
}

Chat.prototype.changeRoom = function (room) {
  this.socket.emit('join', {
    newRoom: room
  })
}

Chat.prototype.processCommand = function (command) {
  const words = command.split(' ')
  command = words[0].substring(1, words[0].length).toLowerCase()
  let message = false

  switch (command) {
    case 'join':
      words.shift()
      this.changeRoom(words.join(' '))
      break

    case 'nick':
      words.shift()
      this.socket.emit('nameAttempt', words.join(' '))
      break

    default:
      message = 'unrecognized command.'
      break
  }

  return message
}
