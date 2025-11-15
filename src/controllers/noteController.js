import { db } from "../config/db.js";

export const addNote = async (req, res) => {
    const note = req.body.note;
    const bookId = req.params.id;
    const currentUserId = req.user.id;
    const result = await db.query("SELECT * FROM books WHERE user_id = $1", [currentUserId]);
    const books = result.rows;
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
}

export const deleteNote = async (req, res) => {
    const { bookId, noteId } = req.params;
    const currentUserId = req.user.id;

    try {
        await db.query("DELETE FROM notes WHERE id = $1 AND user_id = $2 AND book_id = $3", [noteId, currentUserId, bookId]);
        res.redirect(`/book/${bookId}`);
    } catch (error) {
        console.error("Error deleting note:", error);
        res.status(500).send("Internal Server Error");
    }
}