 // admin.js
 document.addEventListener('DOMContentLoaded', function() {
    var sidebarLinks = document.querySelectorAll('.admin-sidebar ul li a');
    var sections = document.querySelectorAll('.admin-section');

    sidebarLinks.forEach(function(link) {
        link.addEventListener('click', function(event) {
            event.preventDefault();

            sidebarLinks.forEach(function(link) {
                link.classList.remove('active');
            });

            sections.forEach(function(section) {
                section.classList.remove('active');
            });

            var targetSection = document.querySelector(this.getAttribute('href'));
            this.classList.add('active');
            targetSection.classList.add('active');
        });
    });
    
const reportsList = document.getElementById('reports-list');

async function fetchAndDisplayReports() {
    try {
        const response = await fetch('/reports'); 
        const reports = await response.json(); 

        reportsList.innerHTML = '';

        reports.forEach(report => {
            const li = document.createElement('li');
            li.textContent = `${report.email}: ${report.message}`; 
            reportsList.appendChild(li);
        });
    } catch (error) {
        console.error('Eroare la preluarea rapoartelor:', error);
        const errorMessage = document.createElement('li');
        errorMessage.textContent = 'Eroare la preluarea rapoartelor!';
        reportsList.appendChild(errorMessage); 
    }
}

fetchAndDisplayReports();

    const addUserButton = document.getElementById("add-user-button");

    addUserButton.addEventListener("click", function() {
        window.location.href = "registration.html";
    });

    fetchUsers();
});

async function fetchUsers() {
    const addUserButton = document.getElementById("add-user-button");
    try {
        const response = await fetch('/users'); 
        if (!response.ok) {
            throw new Error('Endpoint necunoscut sau răspuns incorect');
        }
        const users = await response.json(); 

        const userTableBody = document.getElementById('user-table-body');
        userTableBody.innerHTML = ''; 

        users.forEach(user => {
            const fullName = `${user['first-name-registration']} ${user['last-name-registration']}`;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user._id}</td>
                <td>${fullName}</td>
                <td>${user['email-registration']}</td>
                <td>${user['role-registration']}</td>
                <td>
                    <button class="edit-user-button admin-button">Edit</button>
                    <button class="delete-user-button admin-button">Delete</button>
                    <form class="edit-user-form" style="display: none;">
                        <input type="text" class="edit-firstname" placeholder="First Name">
                        <input type="text" class="edit-lastname" placeholder="Last Name">
                        <input type="email" class="edit-email" placeholder="Email">
                        <select class="edit-role">
                            <option value="ADMIN">ADMIN</option>
                            <option value="USER">USER</option>
                        </select>
                        <button type="button" class="save-edit-button admin-button">Save</button>
                    </form>
                </td>
            `;
            userTableBody.appendChild(row);

            const editButton = row.querySelector('.edit-user-button');
            const deleteButton = row.querySelector('.delete-user-button');
            const editForm = row.querySelector('.edit-user-form');

            editButton.addEventListener('click', function() {
                editForm.style.display = 'block';

                const firstNameInput = editForm.querySelector('.edit-firstname');
                const lastNameInput = editForm.querySelector('.edit-lastname');
                const emailInput = editForm.querySelector('.edit-email');
                const roleSelect = editForm.querySelector('.edit-role');

                firstNameInput.value = user['first-name-registration'];
                lastNameInput.value = user['last-name-registration'];
                emailInput.value = user['email-registration'];
                roleSelect.value = user['role-registration'];
            });

            deleteButton.addEventListener('click', async function() {
                try {
                    const confirmation = confirm(`Sunteți sigur că doriți să ștergeți utilizatorul cu ID-ul ${user._id}?`);
            
                    if (confirmation) {
                        const response = await fetch('/delete-user', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ userId: user._id }), 
                        });
            
                        const data = await response.json();
                        if (data.success) {
                            alert(data.message);
                            fetchUsers(); 
                        } else {
                            alert('Eroare la ștergerea utilizatorului: ' + data.message);
                        }
                    }
                } catch (error) {
                    console.error('Eroare:', error);
                    alert('A apărut o eroare la ștergerea utilizatorului.');
                }
            });
            

            const saveEditButton = editForm.querySelector('.save-edit-button');
            saveEditButton.addEventListener('click', function() {
                const newFirstName = editForm.querySelector('.edit-firstname').value;
                const newLastName = editForm.querySelector('.edit-lastname').value;
                const newEmail = editForm.querySelector('.edit-email').value;
                const newRole = editForm.querySelector('.edit-role').value;

                const data = {
                    _id: user._id,
                    firstName: newFirstName,
                    lastName: newLastName,
                    email: newEmail,
                    role: newRole,
                };

                fetch('/edit-user', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            alert(data.message);
                            fetchUsers(); 
                        } else {
                            alert('Eroare la salvarea modificărilor: ' + data.message);
                        }
                    })
                    .catch(error => {
                        console.error('Eroare:', error);
                        alert('A apărut o eroare la salvarea modificărilor.');
                    });

                editForm.style.display = 'none';
            });
        });
        addUserButton.style.display = 'block'; 
    } catch (error) {
        console.error('Eroare la preluarea utilizatorilor:', error);
        const userTableBody = document.getElementById('user-table-body');
        userTableBody.innerHTML = ''; 
        const errorMessage = document.createElement('tr');
        errorMessage.innerHTML = `<td colspan="5">Eroare la preluarea utilizatorilor!</td>`;
        userTableBody.appendChild(errorMessage);
        addUserButton.style.display = 'none'; 
    }
}

fetchUsers();

async function fetchGameLeaderboard() {
    try {
        const response = await fetch('/leaderboard');
        if (!response.ok) {
            throw new Error('Endpoint necunoscut sau răspuns incorect');
        }
        const leaderboard = await response.json();

        const gameLeaderboardTableBody = document.getElementById('game-leaderboard-table-body');
        gameLeaderboardTableBody.innerHTML = ''; 

        leaderboard.forEach(game => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${game._id}</td>
                <td>${game.playerName}</td>
                <td>${game.points}</td>
                <td>${game.level}</td>
            `;
            gameLeaderboardTableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Eroare la preluarea clasamentului jocurilor:', error);
        const gameLeaderboardTableBody = document.getElementById('game-leaderboard-table-body');
        gameLeaderboardTableBody.innerHTML = ''; 
        const errorMessage = document.createElement('tr');
        errorMessage.innerHTML = `<td colspan="4">Eroare la preluarea clasamentului jocurilor!</td>`;
        gameLeaderboardTableBody.appendChild(errorMessage);
    }
}

fetchGameLeaderboard();