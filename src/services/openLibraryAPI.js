import axios from "axios";

const API_URL = "https://openlibrary.org";

export const getRecommendation = async (genre) => {
    try{
        const result = await axios.get(`${API_URL}/subjects/${genre}.json`)
        const recommendedBooks = result.data.works;

        if(!recommendedBooks || recommendedBooks.length === 0) {
            throw new Error("Gender not found");
        }

        const randomBook = Math.floor(Math.random() * recommendedBooks.length);
        const book = recommendedBooks[randomBook]

        return {
            bookTitle: book.title,
            bookAuthor: book.authors[0].name,
            book: book,
            error: null
        };
    } catch(error) {
        console.error("Error: ", error);
        if(error.message === "Gender not found") {
            return {book: null, error: "Gender not found"}
        }
        throw new Error("Internal Server Error");
    }
}
