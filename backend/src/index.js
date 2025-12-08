import dotenv from "dotenv";
dotenv.config({
  path: "../.env",
});
import connectDB from "./db/connection.js";
import http from "http";
import { Server as ExpressApp } from "./app.js";
import { initializeSocket } from "./socket/socket.js";

const Port = process.env.PORT || 3000;

// Create HTTP server
const httpServer = http.createServer(ExpressApp);

// Initialize Socket.IO
initializeSocket(httpServer);

// to do cluster configration for production

connectDB()
  .then(() => {
    httpServer.listen(Port, () =>
      console.log(`Server is Running on Port http://localhost:${Port}/ And PID is ${process.pid}` )
    );
  })
  .catch((e) => console.log(`Something went wrong while connecting to DB`, e , process.exit(1)));
