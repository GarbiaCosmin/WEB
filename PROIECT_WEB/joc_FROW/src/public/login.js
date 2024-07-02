 // login.js
document.addEventListener('DOMContentLoaded', function() {
    var togglePassword = document.querySelector('.toggle-password');
    var passwordInput = document.getElementById('password-login');

    togglePassword.addEventListener('click', function() {
        var type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.textContent = type === 'password' ? 'SHOW' : 'HIDE';
    });

    var loginForm = document.getElementById('login-form');
    var messageBox = document.getElementById('message-box');
    var messageText = document.getElementById('message-text');
    var closeMessageBtn = document.getElementById('close-message');

    loginForm.addEventListener('submit', function(event) {
        event.preventDefault();
        var formData = new FormData(loginForm);
        var plainFormData = Object.fromEntries(formData.entries());
        var formDataJsonString = JSON.stringify(plainFormData);

        fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: formDataJsonString
        })
        .then(response => response.json())
        .then(data => {
            if (data.message === 'Successfully Logged In!') {
                messageBox.className = 'success';
                messageText.textContent = data.message;
                messageBox.style.display = 'block';
                localStorage.setItem('userEmail', plainFormData['email-login']);
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000); 
            } else if (data.message === 'Incorrect Email/Password Combination!') {
                messageBox.className = 'error';
                messageText.textContent = data.message;
                messageBox.style.display = 'block';
            } else if (data.message === 'This FROW Account Doesn\'t Exist!') {
                messageBox.className = 'error';
                messageText.textContent = data.message;
                messageBox.style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            messageBox.className = 'error';
            messageText.textContent = 'Login Failed!';
            messageBox.style.display = 'block';
        });
    });

    closeMessageBtn.addEventListener('click', function() {
        messageBox.style.display = 'none';
    });
});