$("#add-book-btn").on("click", () => {
    $(".button-book").slideToggle();
});

$(document).ready(function() {
    $(".item").on("click", function() {
        const bookId = $(this).data("id");
        window.location.href = `/book/${bookId}`;
    });
});

