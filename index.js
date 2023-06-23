const express = require("express");
const socketIO = require("socket.io");
const http = require("http");

const cors = require("cors");
const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const dotenv = require("dotenv");

dotenv.config({
  path: "./.env",
});

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("<h1>hello Nirjus!</h1>");
});

let users = [];
const addUser = (userId, socketId) => {
  !users.some((user) => user.userId === userId) &&
    users.push({ userId, socketId });
};
const removeUser = (socketId) => {
  users = users.filter((user) => user.socketId !== socketId);
};
const getUser = (receiverId) => {
  return users.find((user) => user.userId === receiverId);
};
//       Defined a message object with a property
const createMessage = ({ senderId, receiverId, text, images }) => ({
  senderId,
  receiverId,
  text,
  images,
  seen: false,
});

io.on("connection", (socket) => {
  // when two user are connected
  console.log(`a user is connected`);
  // take user Id and socketId from user
  socket.on("addUser", (userId) => {
    addUser(userId, socket.id);
    socket.emit("getUsers", users);
  });

  //  send and get message
  const messages = {}; //  object to track message for every user
  socket.on("sendMessage", ({ senderId, receiverId, text, images }) => {
    const message = createMessage({ senderId, receiverId, text, images });

    const user = getUser(receiverId);

    //   store the messges inthe messages object
    if (!messages[receiverId]) {
      messages[receiverId] = [message];
    } else {
      messages[receiverId].push(message);
    }
    //  send the message to the recever
    io.to(user?.socketId).emit("getMessage", message);
  });

  socket.on("messageSeen", ({ senderId, receiverId, messageId }) => {
    const user = getUser(senderId);

    //   update the seen flag for the message
    if (messages[senderId]) {
      const message = messages[senderId].find(
        (message) =>
          message.receiverId === receiverId && message.id === messageId
      );
      if (message) {
        message.seen = true;

        //   send a message seen event to the sender
        io.to(user?.socketId).emit("messageSeen", {
          senderId,
          receiverId,
          messageId,
        });
      }
    }
  });
//  update and get last message
  socket.on("updateLastMessage", ({lastMessage,lastMessageId }) => {
      io.emit("getLastMessage", {
        lastMessage,
        lastMessageId,
      })
  });

  //  when user is disconnected
  socket.on("disconnect", () => {
    console.log(`a user disconnected!`);
    removeUser(socket.id);
    io.emit("getUser", users);
  })
});


server.listen(process.env.PORT || 5000, () => {
  console.log(`Server is running on port: ${process.env.PORT || 5000}`);
});
