import express from "express";
import axios from "axios";
import pg from "pg";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import session from "express-session";

dotenv.config();

const saltRounds = 10;
const app = express();
const port = 3001;
const db = new pg.Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});
db.connect();

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 10 }
}));

let users = [];
let books = [];
let currentUserId;

async function checkAccount(req){
    const inputEmail = req.body.email;
    const inputPassword = req.body.password;

    const result = await db.query("SELECT * FROM users WHERE email = $1", [inputEmail]);
    if (result.rows.length === 0){
        return null;
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(inputPassword, user.password);

    if(isMatch){
        return user;
    }else{
        return null;
    }
}

function requireLogin(req, res, next){
    if(!req.session.userId){
        return res.redirect("/login");
    }
    next();
}

async function getCurrentUser(){
    const result = await db.query("SELECT * FROM users;");
    users = result.rows;
    return users.find((user) => user.id == currentUserId);
}

app.get("/login", async (req, res) => {
    res.render("login.ejs",  { error: null });
});

app.get("/createAccount", async (req, res) => {
    res.render("createAccount.ejs", { error: null });
})

app.get("/", requireLogin, async (req, res) => {
    try{
        const currentUser = await getCurrentUser();
        const result = await db.query("SELECT * FROM books WHERE user_id = $1 ORDER BY id ASC", [currentUser.id]);
        books = result.rows;
        res.render("index.ejs", {
            listItems: books,
            ratingStars: books.ratings,
            user: currentUser
        });
    } catch(error) {

    }
});

app.post("/login", async (req, res) => {
    const user = await checkAccount(req);
    if(user){
        req.session.userId = user.id;
        currentUserId = req.session.userId
        req.session.loggedInAt = new Date();
        await db.query("UPDATE users SET last_login = NOW() WHERE id = $1", [user.id]);
        res.redirect("/");
    } else {
        res.render("login.ejs", { error : "Invalid email or password." });
    }
});

app.post("/createAccount", async (req, res) => {
    const {username, email, fPassword, lPassword} = req.body;

    const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    if(result.rows.length > 0) {
        return res.render("createAccount.ejs", { error : "Email is already in use" });
    }

    if(fPassword !== lPassword){
        return res.render("createAccount.ejs", { error : "Passwords do not match." });
    }

    const hashedPassword = await bcrypt.hash(fPassword, saltRounds);

    await db.query(
        "INSERT INTO users (username, email, password) VALUES ($1, $2, $3);", 
        [username, email, hashedPassword]
    );
    res.redirect("/login");
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});