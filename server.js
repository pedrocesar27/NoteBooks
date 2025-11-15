import express from "express";
import dotenv from "dotenv";
import session from "express-session";
import passport from "passport";
import configurePassport from "./src/config/passport.js";

import authRoutes from "./src/routes/auth.js";
import bookRoutes from "./src/routes/book.js";
import noteRoutes from "./src/routes/note.js";
import readRoutes from "./src/routes/read.js";

dotenv.config();

const app = express();
const port = 3001;

configurePassport(passport);

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {maxAge: 1000 * 60 * 60}
}));
app.use(passport.initialize());
app.use(passport.session());

app.use("/", authRoutes);
app.use("/", bookRoutes);
app.use("/", noteRoutes);
app.use("/", readRoutes);

app.listen(port, () => {
    console.log(`Server running on port ${port}`)
});