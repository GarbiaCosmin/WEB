 // forgot-password.js
document.getElementById('reset-password-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    var newPassword = document.getElementById('new-password');
    var confirmPassword = document.getElementById('confirm-password');
  
    if (newPassword.value !== confirmPassword.value) {
        confirmPassword.setCustomValidity("Passwords do not match. Please re-enter your password.");
    } else {
        confirmPassword.setCustomValidity("");
        const email = document.getElementById('email-forgot-password').value;
        const response = await fetch('/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, newPassword: newPassword.value })
        });
        const result = await response.json();
        const resetMessageBox = document.getElementById('reset-message-box');
        const resetMessageText = document.getElementById('reset-message-text');

        if (result.success) {
            resetMessageBox.className = 'success';
            resetMessageText.textContent = 'Your Password Has Been Changed!';
            resetMessageBox.style.display = 'block';
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else if (result.message === 'New Password Must Be Different from The Old One!') {
            resetMessageBox.className = 'error';
            resetMessageText.textContent = 'New Password Must Be Different from The Old One!';
            resetMessageBox.style.display = 'block';
        } else {
            resetMessageBox.className = 'error';
            resetMessageText.textContent = 'Reset Password Failed!';
            resetMessageBox.style.display = 'block';
        }
    }
});

const wrapper = document.querySelector(".wrapper"),
      resetForm = document.querySelector(".form.reset-password"),
      forgotHeader = document.querySelector(".form.forgot-password header"),
      resetHeader = document.querySelector(".form.reset-password header"),
      messageBox = document.getElementById('message-box'),
      messageText = document.getElementById('message-text'),
      closeMessageBtn = document.getElementById('close-message'),
      resetCloseMessageBtn = document.getElementById('reset-close-message');

async function checkEmailExists(email) {
    const response = await fetch('/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });

    const result = await response.json();
    return result.exists;
}

resetHeader.addEventListener("click", async () => {
    var email = document.getElementById('email-forgot-password');
    if (email.checkValidity()) {
        const emailExists = await checkEmailExists(email.value);
        if (emailExists) {
            wrapper.classList.add("active");
            forgotHeader.style.color = '#ccc';  
            resetHeader.style.cursor = 'default'; 
            forgotHeader.style.cursor = 'pointer';
            messageBox.style.display = 'none';  
        } else {
            messageBox.className = 'error';
            messageText.textContent = 'This Email Is Not Associated with An Account!';
            messageBox.style.display = 'block';
        }
    } else {
        email.reportValidity();
    }
});

forgotHeader.addEventListener("click", () => {
    wrapper.classList.remove("active");
    forgotHeader.style.color = '#fff';  
    resetHeader.style.cursor = 'pointer'; 
    forgotHeader.style.cursor = 'default';
    document.getElementById('reset-message-box').style.display = 'none';
});

closeMessageBtn.addEventListener('click', function() {
    messageBox.style.display = 'none';
});

resetCloseMessageBtn.addEventListener('click', function() {
    document.getElementById('reset-message-box').style.display = 'none';
});
