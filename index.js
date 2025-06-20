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
    cookie: { maxAge: 1000 * 60 * 60 }
}));

let users = [];
let books = [];
let notes = [];

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

async function getCurrentUser(req){
    const result = await db.query("SELECT * FROM users;");
    users = result.rows;
    const currentUserId = req.session.userId;
    return users.find((user) => user.id == currentUserId);
}

app.get("/login", async (req, res) => {
    res.render("login.ejs",  { error: null });
});

app.get("/logout", (req, res) => {
    req.session.destroy(error => {
        if(error) {
            console.log(error);
            return res.status(500).redirect("/");
        }
        res.clearCookie("connect.sid");
        res.redirect("/login");
    });
});

app.get("/createAccount", async (req, res) => {
    res.render("createAccount.ejs", { error: null });
});

app.get("/book/:id", requireLogin, async (req, res) => {
    const bookId = req.params.id;
    const currentUserId = req.session.userId;

    try {
        const result = await db.query("SELECT * FROM books WHERE id = $1 AND user_id = $2;", [
            bookId, currentUserId
        ]);
        const book = result.rows[0];

        if(!book){
            return res.status(404).send("Not found.");
        }

        const resultNotes = await db.query("SELECT * FROM notes WHERE book_id = $1 AND user_id = $2;", [
            bookId, currentUserId
        ]);
        notes = resultNotes.rows;

        res.render("book.ejs", { 
            book,
            listNotes: notes
        });
    } catch (error) {
        console.error("Error fetching book page:", error);
        res.status(500).send("Internal Server Error");
    }
    
})

app.get("/", requireLogin, async (req, res) => {
    const currentUser = await getCurrentUser(req);
    const result = await db.query("SELECT * FROM books WHERE user_id = $1 ORDER BY id ASC", [currentUser.id]);
    books = result.rows;
    res.render("index.ejs", {
        listItems: books,
        user: currentUser
    });
});

app.post("/login", async (req, res) => {
    const user = await checkAccount(req);
    if(user){
        req.session.userId = user.id;
        req.session.loggedInAt = new Date();
        await db.query("UPDATE users SET last_login = NOW() WHERE id = $1", [user.id]);
        res.redirect("/");
    } else {
        res.status(400).render("login.ejs", { error : "Invalid email or password." });
    }
});

app.post("/createAccount", async (req, res) => {
    const {username, email, fPassword, lPassword} = req.body;

    const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    if(result.rows.length > 0) {
        return res.status(409).render("createAccount.ejs", { error : "Email is already in use." });
    }

    if(fPassword !== lPassword){
        return res.status(422).render("createAccount.ejs", { error : "Passwords do not match." });
    }

    const hashedPassword = await bcrypt.hash(fPassword, saltRounds);

    await db.query(
        "INSERT INTO users (username, email, password) VALUES ($1, $2, $3);", 
        [username, email, hashedPassword]
    );
    res.redirect("/login");
});

app.post("/addBook", requireLogin, async (req, res) => {
    const {bookTitle, bookAuthor, bookDescription, bookRate} = req.body;
    
    const currentUserId = req.session.userId;

    const rating = parseInt(bookRate);

    const result = await db.query("SELECT * FROM books WHERE user_id = $1", [currentUserId]);
    books = result.rows;
    const findBook = books.find((book) => book.title == bookTitle);
    if(findBook){
        return res.status(409).render("index.ejs", { error: "Book has already been added!" });
    }
    await db.query("INSERT INTO books (user_id, title, author, description, rating) VALUES ($1, $2, $3, $4, $5);", 
        [currentUserId, bookTitle, bookAuthor, bookDescription, rating]);

    res.redirect("/");
})

app.post("/newNote/:id", requireLogin, async (req, res) => {
    const note = req.body.note;
    const bookId = req.params.id;
    const currentUserId = req.session.userId;
    const result = await db.query("SELECT * FROM books WHERE user_id = $1", [currentUserId]);
    books = result.rows;
    const findBook = books.find((book) => book.id == bookId)
    if(findBook){
        try{
            await db.query("INSERT INTO notes (book_id, user_id, content) VALUES ($1, $2, $3);", [findBook.id, currentUserId, note]);
            res.redirect(`/book/${bookId}`);
        }catch(error){
            console.error("Error inserting note:", error);
            res.status(500).send("Internal Server Error");
        }
    } else {
        res.status(404).send("Not found.");
    }
});

app.post("/book/:bookId/deleteNote/:noteId", requireLogin, async (req, res) => {
    const { bookId, noteId } = req.params;
    const currentUserId = req.session.userId;

    try{
        await db.query("DELETE FROM notes WHERE id = $1 AND user_id = $2 AND book_id = $3", [noteId, currentUserId, bookId]);
        res.redirect(`/book/${bookId}`);
    } catch(error) {
        console.error("Error deleting note:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.post("/deleteBook/:bookId", requireLogin, async (req, res) => {
    const bookId = req.params.bookId;
    const currentUserId = req.session.userId;

    try{
        await db.query("DELETE FROM books WHERE id = $1 AND user_id = $2", [bookId, currentUserId]);
        res.redirect("/");
    } catch(error) {
        console.error("Error deleting book:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});