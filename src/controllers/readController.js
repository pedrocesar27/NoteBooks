import { getRecommendation } from "../services/openLibraryAPI.js";

export const getReadPage = (req, res) => {
    res.render("read.ejs", {
        bookTitle: null,
        bookAuthor: null,
        book: null,
        error: null
    });
};

export const postReadPage = async (req,res) => {
    const genre = req.body.genre;

    try{
        const data = await getRecommendation(genre);

        res.render("read.ejs", {
            bookTitle: data.bookTitle,
            bookAuthor: data.bookAuthor,
            book: data.book,
            error: data.error
        });
    } catch (error) {
        console.error("Read Controller Error:", error);
        res.status(500).render("read.ejs", {
            bookTitle: null,
            bookAuthor: null,
            book: null,
            error: "Something went wrong. Please try again."
        });
    }
};