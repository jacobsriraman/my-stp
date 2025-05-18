// static/js/script.js

document.addEventListener('DOMContentLoaded', function () {
    console.log("Script loaded. Ready to add interactivity!");

    // Example: Autofocus the input field on page load
    const inputField = document.getElementById('user_input');
    if (inputField) {
        inputField.focus();
    }
});
