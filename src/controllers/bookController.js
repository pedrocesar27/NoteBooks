import { db } from "../config/db.js";

export const getDashboard = async (req,res) => {
    const currentUser = req.user;
    try{
        const result = await db.query("SELECT * FROM books WHERE user_id = $1 ORDER BY id ASC", [currentUser.id]);
        const books = result.rows;
        res.render("index.ejs", {
            listItems: books,
            user: req.user,
            noFound: false
        });
    } catch (error) {
        console.error("Error fetching dashboard:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getBookById = async (req, res) => {
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
        const notes = resultNotes.rows;

        res.render("book.ejs", {
            book,
            listNotes: notes
        });
    } catch (error) {
        console.error("Error fetching book page:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const searchBook = async (req, res) => {
    const currentUser = req.user;
    const searchTitle = req.query.search.toLowerCase();

    try{
        const result = await db.query("SELECT * FROM books WHERE user_id = $1 ORDER BY id ASC", [currentUser.id]);
        const books = result.rows;
        const filteredBooks = books.filter(book =>
            book.title.toLowerCase().includes(searchTitle)
        )
        res.render("index.ejs", {
            listItems: filteredBooks.length > 0 ? filteredBooks : books,
            user: req.user,
            noFound: filteredBooks.length === 0,
            error: filteredBooks.length === 0 ? "No results" : null
        });
    } catch (error) {
        console.error("Search error: ", error);
        res.status(500).render("index.ejs", {
            listItems: [],
            user: req.user,
            noFound: true,
            error: "Something went wrong while searching."
        });
    }
};

export const addBook = async (req, res) => {
    const { bookTitle, bookAuthor, bookDescription, bookRate } = req.body;

    const currentUserId = req.user.id;

    const rating = parseInt(bookRate);

    const result = await db.query("SELECT * FROM books WHERE user_id = $1", [currentUserId]);
    const books = result.rows;
    const findBook = books.find((book) => book.title == bookTitle);
    if (findBook) {
        return res.status(409).render("index.ejs", { error: "Book has already been added!" });
    }

    if (findBook) {
        return res.status(409).render("index.ejs", { error: "Book has already been added!" });
    }

    await db.query("INSERT INTO books (user_id, title, author, description, rating) VALUES ($1, $2, $3, $4, $5);",
        [currentUserId, bookTitle, bookAuthor, bookDescription, rating]);

    res.redirect("/");
};

export const deleteBook = async (req, res) => {
    const bookId = req.params.bookId;
    const currentUserId = req.user.id;

    try {
        await db.query("DELETE FROM books WHERE id = $1 AND user_id = $2", [bookId, currentUserId]);
        res.redirect("/");
    } catch (error) {
        console.error("Error deleting book:", error);
        res.status(500).send("Internal Server Error");
    }
};
