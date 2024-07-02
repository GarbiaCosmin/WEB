// Funcție pentru a obține datele utilizatorului curent
async function getCurrentUser() {
    try {
        const response = await fetch('/current-user'); 
        if (!response.ok) {
            throw new Error('Failed to fetch current user');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching current user:', error);
        return null;
    }
}

// Funcție pentru afișarea informațiilor utilizatorului în secțiunea "Personal Info"
async function displayUserInfo() {
    try {
        const userInfo = await getCurrentUser();
        if (userInfo) {
            const personalInfoSection = document.getElementById('personal_info');
            if (personalInfoSection) {
                // Construim HTML-ul pentru afișarea informațiilor personale
                const infoHTML = `
                    <h2>Personal Information</h2>
                    <div class="info-container">
                        <p><strong>First Name:</strong> ${userInfo['first-name-registration']}</p>
                        <p><strong>Last Name:</strong> ${userInfo['last-name-registration']}</p>
                        <p><strong>Email:</strong> ${userInfo['email-registration']}</p>
                        <p><strong>Phone:</strong> ${userInfo['phone-registration']}</p>
                        <p><strong>Birth Date:</strong> ${new Date(userInfo['birth-date-registration']).toLocaleDateString()}</p>
                        <p><strong>Gender:</strong> ${userInfo['gender-registration']}</p>
                        <p><strong>Age:</strong> ${userInfo['age-registration']}</p>
                        <p><strong>Role:</strong> ${userInfo['role-registration']}</p>
                        <p><strong>Terms and Conditions:</strong> ${userInfo['terms-conditions'] ? 'Accepted' : 'Not Accepted'}</p>
                    </div>
                `;

                // Actualizăm conținutul secțiunii "Personal Info"
                personalInfoSection.innerHTML = infoHTML;
                personalInfoSection.classList.add('active'); 
            } else {
                console.error('Personal Info section not found');
            }
        } else {
            console.error('Failed to get current user info');
        }
    } catch (error) {
        console.error('Error displaying user info:', error);
    }
}

// Funcție pentru popularea formularului de editare cu datele utilizatorului
async function populateEditProfileForm() {
    try {
        const userInfo = await getCurrentUser();
        if (userInfo) {
            document.getElementById('first-name').value = userInfo['first-name-registration'];
            document.getElementById('last-name').value = userInfo['last-name-registration'];
            document.getElementById('email').value = userInfo['email-registration'];
            document.getElementById('phone').value = userInfo['phone-registration'];
            document.getElementById('birth-date').value = new Date(userInfo['birth-date-registration']).toISOString().split('T')[0];
            document.getElementById('gender').value = userInfo['gender-registration'];
            document.getElementById('age').value = userInfo['age-registration'];
        } else {
            console.error('Failed to get current user info');
        }
    } catch (error) {
        console.error('Error populating edit profile form:', error);
    }
}

// Funcție pentru trimiterea modificărilor de profil
async function submitProfileEdits() {
    const editedData = {
        'first-name-registration': document.getElementById('first-name').value,
        'last-name-registration': document.getElementById('last-name').value,
        'phone-registration': document.getElementById('phone').value,
        'birth-date-registration': document.getElementById('birth-date').value,
        'gender-registration': document.getElementById('gender').value,
        'age-registration': document.getElementById('age').value
    };

    try {
        const response = await fetch('/edit-user1', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(editedData)
        });

        const result = await response.json();
        if (result.success) {
            alert('Profile updated successfully!');
        } else {
            alert('Failed to update profile: ' + result.message);
        }
    } catch (error) {
        console.error('Error updating profile:', error);
    }
}

// Funcție pentru gestionarea navigației între secțiuni pe baza clicurilor pe link-uri
function setupNavigation() {
    const links = document.querySelectorAll('.profile-sidebar ul li a');

    links.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();

            const targetSectionId = link.getAttribute('href').substring(1); 
            const targetSection = document.getElementById(targetSectionId);

            if (targetSection) {
                const sections = document.querySelectorAll('.profile-section');
                sections.forEach(section => {
                    if (section === targetSection) {
                        section.classList.add('active');
                    } else {
                        section.classList.remove('active');
                    }
                });

                // În funcție de secțiunea selectată, putem adăuga logica specifică (de exemplu, încărcarea datelor)
                if (targetSectionId === 'personal_info') {
                    displayUserInfo();
                } else if (targetSectionId === 'edit_profile') {
                    populateEditProfileForm();
                } else if (targetSectionId === 'change_password') {
                    window.location.href = 'forgot-password.html';
                }
            } else {
                console.error('Target section not found');
            }
        });
    });
}

// Apelăm funcția pentru a inițializa navigarea între secțiuni
setupNavigation();

// Apelăm funcția pentru a afișa informațiile la încărcarea paginii
displayUserInfo();
