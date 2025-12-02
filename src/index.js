import dotenv from "dotenv";
dotenv.config({
  path: "../.env",
});
import connectDB from "./db/connection.js";

import { Server } from "./app.js";

const Port = process.env.PORT || 3000;

connectDB()
  .then(() => {
    Server.listen(Port, () =>
      console.log(`Server is Running on Port http://localhost:${Port}/ And PID is ${process.pid}` )
    );
  })
  .catch((e) => console.log(`Something went wrong while connecting to DB`, e , process.exit(1)));
