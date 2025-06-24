import express from "express";
import axios from "axios";
import pg from "pg";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";

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
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 }
}));
app.use(passport.initialize());
app.use(passport.session());

let users = [];
let books = [];
let notes = [];

function requireLogin(req, res, next) {
    if(req.isAuthenticated()) return next();
    res.redirect("/login");
}

app.get("/login", async (req, res) => {
    res.render("login.ejs", { error: null });
});

app.get("/logout", (req, res, next) => {
    req.logout(function(error) {
        if (error) return next(error);
        res.redirect("/login");
    });
});

app.get("/createAccount", async (req, res) => {
    res.render("createAccount.ejs", { error: null });
});

app.get("/book/:id", async (req, res) => {
    if (req.isAuthenticated()) {
        const bookId = req.params.id;
        const currentUserId = req.user.id;

        try {
            const result = await db.query("SELECT * FROM books WHERE id = $1 AND user_id = $2;", [
                bookId, currentUserId
            ]);
            const book = result.rows[0];

            if (!book) {
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
    } else {
        res.redirect("/login");
    }
})

app.get("/", requireLogin, async (req, res) => {
    const currentUser = req.user;
    const result = await db.query("SELECT * FROM books WHERE user_id = $1 ORDER BY id ASC", [currentUser.id]);
    books = result.rows;
    res.render("index.ejs", {
        listItems: books,
        user: req.user
    });
});

app.post("/login", (req, res, next) => {
    passport.authenticate("local", (error, user, info) => {
        if(error) return next(error);

        if(!user) {
            return res.status(401).render("login.ejs", {
                error: info.message
            });
        }
        req.login(user, async (error) => {
            if (error) return next(error);
            await db.query("UPDATE users SET last_login = NOW() WHERE id = $1", [user.id]);
            return res.redirect("/");
        });
    })(req, res, next);
});

app.post("/createAccount", async (req, res) => {
    const { username, email, fPassword, lPassword } = req.body;

    const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length > 0) {
        return res.status(409).render("createAccount.ejs", { error: "Email is already in use." });
    }

    if (fPassword !== lPassword) {
        return res.status(422).render("createAccount.ejs", { error: "Passwords do not match." });
    }

    const hashedPassword = await bcrypt.hash(fPassword, saltRounds);

    await db.query(
        "INSERT INTO users (username, email, password) VALUES ($1, $2, $3);",
        [username, email, hashedPassword]
    );
    res.redirect("/login");
});

app.post("/addBook", requireLogin, async (req, res) => {
    const { bookTitle, bookAuthor, bookDescription, bookRate } = req.body;

    const currentUserId = req.user.id;

    const rating = parseInt(bookRate);

    const result = await db.query("SELECT * FROM books WHERE user_id = $1", [currentUserId]);
    books = result.rows;
    const findBook = books.find((book) => book.title == bookTitle);
    if (findBook) {
        return res.status(409).render("index.ejs", { error: "Book has already been added!" });
    }
    await db.query("INSERT INTO books (user_id, title, author, description, rating) VALUES ($1, $2, $3, $4, $5);",
        [currentUserId, bookTitle, bookAuthor, bookDescription, rating]);

    res.redirect("/");
});

app.post("/newNote/:id", requireLogin, async (req, res) => {
    const note = req.body.note;
    const bookId = req.params.id;
    const currentUserId = req.user.id;
    const result = await db.query("SELECT * FROM books WHERE user_id = $1", [currentUserId]);
    books = result.rows;
    const findBook = books.find((book) => book.id == bookId)
    if (findBook) {
        try {
            await db.query("INSERT INTO notes (book_id, user_id, content) VALUES ($1, $2, $3);", [findBook.id, currentUserId, note]);
            res.redirect(`/book/${bookId}`);
        } catch (error) {
            console.error("Error inserting note:", error);
            res.status(500).send("Internal Server Error");
        }
    } else {
        res.status(404).send("Not found.");
    }
});

app.post("/book/:bookId/deleteNote/:noteId", requireLogin, async (req, res) => {
    const { bookId, noteId } = req.params;
    const currentUserId = req.user.id;

    try {
        await db.query("DELETE FROM notes WHERE id = $1 AND user_id = $2 AND book_id = $3", [noteId, currentUserId, bookId]);
        res.redirect(`/book/${bookId}`);
    } catch (error) {
        console.error("Error deleting note:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.post("/deleteBook/:bookId", requireLogin, async (req, res) => {
    const bookId = req.params.bookId;
    const currentUserId = req.user.id;

    try {
        await db.query("DELETE FROM books WHERE id = $1 AND user_id = $2", [bookId, currentUserId]);
        res.redirect("/");
    } catch (error) {
        console.error("Error deleting book:", error);
        res.status(500).send("Internal Server Error");
    }
});

passport.use(new Strategy({
    usernameField: 'email',
    passwordField: 'password'
},
async function verify(email, password, cb) {
    try{
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (result.rows.length === 0) {
            return cb(null, false, { message: "Incorrect email or password."});
        }
        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return cb(null, false, {message: "Incorrect email or password."});
        }
        return cb(null, user);
    } catch(error) {
        return cb(error);
    }
        
}));

passport.serializeUser((user, cb) => {
    cb(null, user.id);
});

passport.deserializeUser(async (id, cb) => {
    try{
        const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
        const user = result.rows[0];
        cb(null, user);
    } catch (error) {
        cb(error);
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});