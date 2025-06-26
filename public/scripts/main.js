$(".add-nav").on("click", () => {
    $(".button-book").slideToggle();
});

$(document).ready(function() {
    $(".item").on("click", function() {
        const bookId = $(this).data("id");
        window.location.href = `/book/${bookId}`;
    });
});

$(".sidebar-item").on("click", () => {
    $(".button-book").slideUp();
    $(".sidebar").slideToggle();
});

$(".exit-side").on("click", () => {
    $(".sidebar").slideUp();
});

$(".exit-new").on("click", () => {
    $(".button-book").slideUp();
});

$(".add-side").on("click", () => {
    $(".button-book").delay(400).slideToggle();
});

$(".add-book-btn").on("click", () => {
    $(".sidebar").slideUp();
});
