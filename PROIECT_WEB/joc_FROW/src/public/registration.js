 // registration.js
document.addEventListener('DOMContentLoaded', function() {
    const slidePage = document.querySelector(".slide-page");
    const nextBtnFirst = document.querySelector(".firstNext");
    const prevBtnSec = document.querySelector(".prev-1");
    const nextBtnSec = document.querySelector(".next-1");
    const prevBtnThird = document.querySelector(".prev-2");
    const nextBtnThird = document.querySelector(".next-2");
    const prevBtnFourth = document.querySelector(".prev-3");
    const submitBtn = document.querySelector(".submit");
    const progressText = document.querySelectorAll(".step p");
    const progressCheck = document.querySelectorAll(".step .check");
    const bullet = document.querySelectorAll(".step .bullet");
    const messageBox = document.getElementById('message-box');
    const messageText = document.getElementById('message-text');
    const closeMessageBtn = document.getElementById('close-message');
    const checkboxes = document.querySelectorAll('input[name="terms-conditions"]');
    let current = 1;

    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            checkboxes.forEach(box => box.checked = this.checked);
        });
    });

    nextBtnFirst.addEventListener("click", function(event){
        event.preventDefault();
        if (document.getElementById('first-name-registration').checkValidity() && document.getElementById('last-name-registration').checkValidity()) {
            slidePage.style.marginLeft = "-25%";
            bullet[current - 1].classList.add("active");
            progressCheck[current - 1].classList.add("active");
            progressText[current - 1].classList.add("active");
            current += 1;
        } else {
            document.getElementById('first-name-registration').reportValidity();
            document.getElementById('last-name-registration').reportValidity();
        }
    });

    nextBtnSec.addEventListener("click", function(event){
        event.preventDefault();
        if (document.getElementById('email-registration').checkValidity() && document.getElementById('phone-registration').checkValidity()) {
            slidePage.style.marginLeft = "-50%";
            bullet[current - 1].classList.add("active");
            progressCheck[current - 1].classList.add("active");
            progressText[current - 1].classList.add("active");
            current += 1;
        } else {
            document.getElementById('email-registration').reportValidity();
            document.getElementById('phone-registration').reportValidity();
        }
    });

    nextBtnThird.addEventListener("click", function(event){
        event.preventDefault();
        if (document.getElementById('birth-date-registration').checkValidity() && document.getElementById('gender-registration').checkValidity()) {
            slidePage.style.marginLeft = "-75%";
            bullet[current - 1].classList.add("active");
            progressCheck[current - 1].classList.add("active");
            progressText[current - 1].classList.add("active");
            current += 1;
        } else {
            document.getElementById('birth-date-registration').reportValidity();
            document.getElementById('gender-registration').reportValidity();
        }
    });

    submitBtn.addEventListener("click", function(event){
        event.preventDefault();
        if (document.getElementById('age-registration').checkValidity() && document.getElementById('password-registration').checkValidity() && document.querySelector('input[name="terms-conditions"]').checkValidity()) {
            bullet[current - 1].classList.add("active");
            progressCheck[current - 1].classList.add("active");
            progressText[current - 1].classList.add("active");
            const formData = new FormData(document.getElementById('registration-form'));
            const plainFormData = Object.fromEntries(formData.entries());
            const formDataJsonString = JSON.stringify(plainFormData);

            fetch('/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: formDataJsonString
            })
            .then(response => response.json())
            .then(data => {
                if (data.message === 'Registration Completed Successfully!') {
                    messageBox.className = 'success';
                    messageText.textContent = data.message;
                    messageBox.style.display = 'block';
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                } else if (data.message === 'This Email Address Already In Use!') {
                    messageBox.className = 'error';
                    messageText.textContent = data.message;
                    messageBox.style.display = 'block';
                } else {
                    messageBox.className = 'error';
                    messageText.textContent = 'Registration Failed!';
                    messageBox.style.display = 'block';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                messageBox.className = 'error';
                messageText.textContent = 'Registration Failed!';
                messageBox.style.display = 'block';
            });
        } else {
            document.getElementById('age-registration').reportValidity();
            document.getElementById('password-registration').reportValidity();
            document.querySelector('input[name="terms-conditions"]').reportValidity();
        }
    });

    prevBtnSec.addEventListener("click", function(event){
        event.preventDefault();
        slidePage.style.marginLeft = "0%";
        bullet[current - 2].classList.remove("active");
        progressCheck[current - 2].classList.remove("active");
        progressText[current - 2].classList.remove("active");
        current -= 1;
    });

    prevBtnThird.addEventListener("click", function(event){
        event.preventDefault();
        slidePage.style.marginLeft = "-25%";
        bullet[current - 2].classList.remove("active");
        progressCheck[current - 2].classList.remove("active");
        progressText[current - 2].classList.remove("active");
        current -= 1;
    });

    prevBtnFourth.addEventListener("click", function(event){
        event.preventDefault();
        slidePage.style.marginLeft = "-50%";
        bullet[current - 2].classList.remove("active");
        progressCheck[current - 2].classList.remove("active");
        progressText[current - 2].classList.remove("active");
        current -= 1;
    });

    closeMessageBtn.addEventListener('click', function() {
        messageBox.style.display = 'none';
    });
});
