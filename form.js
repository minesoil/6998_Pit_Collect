// Updated form.js
function createForm() {
    const form = document.createElement('form');
    form.innerHTML = `
        <label for='name'>Name:</label>
        <input type='text' id='name' name='name' required />
        <label for='email'>Email:</label>
        <input type='email' id='email' name='email' required />
        <button type='submit'>Submit</button>
    `;
    return form;
}
const formContainer = document.getElementById('form-container');
formContainer.appendChild(createForm());