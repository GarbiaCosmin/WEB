// script.js
document.addEventListener('DOMContentLoaded', function() {
    let hardTimerInterval;
    const userEmail = localStorage.getItem('userEmail');
    const adminButton = document.getElementById('admin-button');

    if (userEmail === 'anitastefanandrei@gmail.com' || userEmail === 'cosmin.garbia@yahoo.ro') {
        adminButton.style.display = 'block';
    } else {
        adminButton.style.display = 'none';
    }

    document.getElementById('logout-button').addEventListener('click', function() {
        localStorage.removeItem('userEmail');
        window.location.href = 'login.html';
    });

    function updateFullScreenButton(fullScreenIsActive) {
        document.getElementById('fullscreen-toggle').checked = fullScreenIsActive;
    }

    function enterFullScreen() {
        var settingsMenu = document.getElementById("fullscreen-view");
        if (settingsMenu.requestFullscreen) {
            settingsMenu.requestFullscreen().then(() => {
                updateFullScreenButton(true);
            });
        }
    }

    function exitFullScreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen().then(() => {
                updateFullScreenButton(false);
            });
        } 
    }

    function disableGameButtons(level) {
        document.getElementById(`next-${level}-level-button`).disabled = true;
        document.getElementById(`check-${level}-answer-button`).disabled = true;
    }
    
    function enableGameButtons(level) {
        document.getElementById(`next-${level}-level-button`).disabled = false;
        document.getElementById(`check-${level}-answer-button`).disabled = false;
    }
    
    function resetGame(level) {
        return fetch(`/reset-${level}-game`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById(`${level}-points-value`).textContent = '0';
                document.getElementById(`${level}-lives-value`).textContent = level === 'easy' ? '5' : level === 'medium' ? '4' : '3';
                if (level === 'hard') {
                    resetHardTimer();
                    startHardTimer();
                }
                enableGameButtons(level);
                return true;
            } else {
                console.error('Error resetting game:', data.message);
                return false;
            }
        })
        .catch(error => {
            console.error('Error resetting game:', error);
            return false;
        });
    }

    function playAgain(level) {
        resetGame(level).then(success => {
            if (success) {
                document.getElementById('end-game-overlay').style.display = 'none';
                document.getElementById('end-game-message').classList.add('hidden');
                document.getElementById(`${level}-level-menu`).style.display = 'flex';
                if (level === 'easy') loadRandomEasyImage();
                else if (level === 'medium') loadRandomMediumImage();
                else if (level === 'hard') loadRandomHardImage();
            }
        });
    }

    function startHardTimer() {
        const timeSpan = document.getElementById('hard-time-value');
        let timeRemaining = 100;
    
        if (hardTimerInterval) {
            clearInterval(hardTimerInterval);
        }
    
        hardTimerInterval = setInterval(() => {
            timeRemaining--;
            timeSpan.textContent = timeRemaining;
    
            if (timeRemaining <= 0) {
                clearInterval(hardTimerInterval);
                checkEndGame('hard', parseInt(document.getElementById('hard-lives-value').textContent), parseInt(document.getElementById('hard-points-value').textContent), timeRemaining);
            }
        }, 1000);
    }        
    
    function resetHardTimer() {
        if (hardTimerInterval) {
            clearInterval(hardTimerInterval);
        }
        document.getElementById('hard-time-value').textContent = '100';
    }

    function updateLeaderboard() {
        fetch('/get-scores')
            .then(response => response.json())
            .then(data => {
                const tableBody = document.querySelector('#leaderboard-window tbody');
                tableBody.innerHTML = ''; 

                data.sort((a, b) => b.points - a.points);

                data.forEach((score, index) => {
                    const row = document.createElement('tr');
                    const cellRank = document.createElement('td');
                    cellRank.textContent = index + 1;
                    row.appendChild(cellRank);

                    const cellPlayer = document.createElement('td');
                    cellPlayer.textContent = score.playerName;
                    row.appendChild(cellPlayer);

                    const cellScore = document.createElement('td');
                    cellScore.textContent = score.points;
                    row.appendChild(cellScore);

                    tableBody.appendChild(row);
                });
            })
            .catch(error => console.error('Error fetching scores:', error));
    }

    function loadRandomEasyImage() {
        fetch('/random-easy-image')
            .then(response => response.json())
            .then(data => {
                const imageUrl = `data:image/jpeg;base64,${data.imageBlob}`;
                const imageElement = document.getElementById('easy-level-image');
                imageElement.src = imageUrl;
                imageElement.setAttribute('data-filename', data.filename);
            })
            .catch(error => console.error('Error fetching image:', error));
    }

    function loadRandomMediumImage() {
        fetch('/random-medium-image')
            .then(response => response.json())
            .then(data => {
                const imageUrl = `data:image/jpeg;base64,${data.imageBlob}`;
                const imageElement = document.getElementById('medium-level-image');
                imageElement.src = imageUrl;
                imageElement.setAttribute('data-filename', data.filename);
            })
            .catch(error => console.error('Error fetching image:', error));
    }

    function loadRandomHardImage() {
        fetch('/random-hard-image')
            .then(response => response.json())
            .then(data => {
                const imageUrl = `data:image/jpeg;base64,${data.imageBlob}`;
                const imageElement = document.getElementById('hard-level-image');
                imageElement.src = imageUrl;
                imageElement.setAttribute('data-filename', data.filename);
            })
            .catch(error => console.error('Error fetching image:', error));
    }

    function showEndGameMessage(isWinner, playerName, points, reason = '', level) {
        if(level === 'hard') clearInterval(hardTimerInterval);
        disableGameButtons(level); 
    
        const overlay = document.getElementById('end-game-overlay');
        const messageBox = document.getElementById('end-game-message');
        const messageText = document.getElementById('end-game-text');
    
        saveScore(playerName, points, level);
    
        if (isWinner) {
            messageBox.className = 'win';
            messageText.textContent = `You won the game! ${playerName}, you have successfully completed all images with a score of ${points} points on the ${level} difficulty level!`;
        } else {
            if (reason === 'time') {
                messageText.textContent = `You lost the game! ${playerName}, you ran out of time, in the end you only got a score of ${points} points on the ${level} difficulty level!`;
            } else {
                messageText.textContent = `You lost the game! ${playerName}, you ran out of lives, in the end you only got a score of ${points} points on the ${level} difficulty level!`;
            }
            messageBox.className = 'lose';
        }
    
        overlay.style.display = 'flex';
        messageBox.classList.remove('hidden');
    }
    
    function saveScore(playerName, points, level) {
        fetch('/save-score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ playerName, points, level })
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                console.error('Error saving score:', data.message);
            }
        })
        .catch(error => console.error('Error saving score:', error));
    }    

    function checkEndGame(level, lives, points, timeRemaining) {
        const playerName = document.getElementById('player-name-box').value;
        fetch(`/check-all-visited-${level}`)
            .then(response => response.json())
            .then(data => {
                if (data.allVisited) {
                    if (lives > 0) {
                        showEndGameMessage(true, playerName, points, '', level);
                    } else {
                        showEndGameMessage(false, playerName, points, '', level);
                    }
                } else if (lives === 0) {
                    showEndGameMessage(false, playerName, points, 'lives', level);
                } else if (timeRemaining <= 0) {
                    showEndGameMessage(false, playerName, points, 'time', level);
                }
            })
            .catch(error => console.error('Error checking end game:', error));
    }            

    function checkEasyAnswer() {
        const userAnswer = document.getElementById('easy-answer-box').value.trim().toLowerCase();
        const imageElement = document.getElementById('easy-level-image');
        const filename = imageElement.getAttribute('data-filename').split('.')[0]; 
        const livesSpan = document.getElementById('easy-lives-value');
        const pointsSpan = document.getElementById('easy-points-value');

        fetch('/verify-easy-answer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ answer: userAnswer, filename: filename })
        })
        .then(response => response.json())
        .then(data => {
            if (data.correct) {
                pointsSpan.textContent = parseInt(pointsSpan.textContent) + 10;
            } else {
                livesSpan.textContent = parseInt(livesSpan.textContent) - 1;
            }
            document.getElementById('easy-answer-box').value = ''; 

            fetch('/update-easy-visited', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ filename: filename })
            })
            .then(() => {
                loadRandomEasyImage();
                checkEndGame('easy', parseInt(livesSpan.textContent), parseInt(pointsSpan.textContent));
            })
            .catch(error => console.error('Error updating visited field:', error));
        })
        .catch(error => console.error('Error verifying answer:', error));
    }

    function checkMediumAnswer() {
        const userAnswer = document.getElementById('medium-answer-box').value.trim().toLowerCase();
        const imageElement = document.getElementById('medium-level-image');
        const filename = imageElement.getAttribute('data-filename').split('.')[0]; 
        const livesSpan = document.getElementById('medium-lives-value');
        const pointsSpan = document.getElementById('medium-points-value');

        fetch('/verify-medium-answer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ answer: userAnswer, filename: filename })
        })
        .then(response => response.json())
        .then(data => {
            if (data.correct) {
                pointsSpan.textContent = parseInt(pointsSpan.textContent) + 20;
            } else {
                livesSpan.textContent = parseInt(livesSpan.textContent) - 1;
            }
            document.getElementById('medium-answer-box').value = ''; 

            fetch('/update-medium-visited', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ filename: filename })
            })
            .then(() => {
                loadRandomMediumImage();
                checkEndGame('medium', parseInt(livesSpan.textContent), parseInt(pointsSpan.textContent));
            })
            .catch(error => console.error('Error updating visited field:', error));
        })
        .catch(error => console.error('Error verifying answer:', error));
    }

    function checkHardAnswer() {
        const userAnswer = document.getElementById('hard-answer-box').value.trim().toLowerCase();
        const imageElement = document.getElementById('hard-level-image');
        const filename = imageElement.getAttribute('data-filename').split('.')[0]; 
        const livesSpan = document.getElementById('hard-lives-value');
        const pointsSpan = document.getElementById('hard-points-value');
        const timeRemaining = parseInt(document.getElementById('hard-time-value').textContent);
    
        fetch('/verify-hard-answer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ answer: userAnswer, filename: filename })
        })
        .then(response => response.json())
        .then(data => {
            if (data.correct) {
                pointsSpan.textContent = parseInt(pointsSpan.textContent) + 30;
            } else {
                livesSpan.textContent = parseInt(livesSpan.textContent) - 1;
            }
            document.getElementById('hard-answer-box').value = ''; 
    
            fetch('/update-hard-visited', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ filename: filename })
            })
            .then(() => {
                loadRandomHardImage();
                checkEndGame('hard', parseInt(livesSpan.textContent), parseInt(pointsSpan.textContent), timeRemaining);
            })
            .catch(error => console.error('Error updating visited field:', error));
        })
        .catch(error => console.error('Error verifying answer:', error));
    }        

    document.addEventListener('fullscreenchange', (event) => {
        if (document.fullscreenElement) {
            updateFullScreenButton(true);
        } else {
            updateFullScreenButton(false);
        }
    });

    // Definirea interactivitatii pentru butonul REPORT
    document.getElementById('report-button').addEventListener('click', function() {
        document.getElementById('report-overlay').style.display = 'flex';
    });

    document.getElementById('close-report-button').addEventListener('click', function() {
        document.getElementById('report-overlay').style.display = 'none';
    });

    document.getElementById('user-report-form').addEventListener('submit', function(event) {
        event.preventDefault();

        const email = document.getElementById('email-report').value;
        const message = document.getElementById('message-report').value;

        fetch('/submit-report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, message })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                document.getElementById('email-report').value = '';
                document.getElementById('message-report').value = '';

                document.getElementById('report-overlay').style.display = 'none';

                const confirmationMessage = document.createElement('div');
                confirmationMessage.textContent = 'Report submitted successfully!';
                confirmationMessage.style.color = 'green';
                document.body.appendChild(confirmationMessage);

                setTimeout(() => {
                    document.body.removeChild(confirmationMessage);
                }, 3000);
            } else {
                const errorMessage = document.createElement('div');
                errorMessage.textContent = 'Failed to submit report. Please try again later.';
                errorMessage.style.color = 'red';
                document.body.appendChild(errorMessage);

                setTimeout(() => {
                    document.body.removeChild(errorMessage);
                }, 3000);
            }
        })
        .catch(error => {
            console.error('Error:', error);

            const errorMessage = document.createElement('div');
            errorMessage.textContent = 'An error occurred while submitting the report.';
            errorMessage.style.color = 'red';
            document.body.appendChild(errorMessage);

            setTimeout(() => {
                document.body.removeChild(errorMessage);
            }, 3000);
        });
    });

    // Definirea interactivitatii pentru butonul LOGOUT
    document.getElementById('logout-button').addEventListener('click', async function() {
        try {
            const response = await fetch('/logout', {
                method: 'POST',
            });
            const data = await response.json();
            if (data.success) {
                localStorage.removeItem('userEmail');
                window.location.href = 'login.html';
            } else {
                alert('Failed to logout');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while logging out.');
        }
    });    

    // Definirea interactivitatii pentru meniul Dificultatilor
    document.getElementById('menu-window').addEventListener('submit', function(event) {
        event.preventDefault();
        document.getElementById('menu-window').style.display = 'none';
        document.getElementById('difficulty-menu').style.display = 'flex';
    });

    document.getElementById('close-difficulty-button').addEventListener('click', function() {
        document.getElementById('difficulty-menu').style.display = 'none';
        document.getElementById('menu-window').style.display = 'flex';
    });

    document.getElementById('close-button').addEventListener('click', function() {
        document.getElementById('end-game-overlay').style.display = 'none';
        document.getElementById('end-game-message').classList.add('hidden');
    });    

    document.getElementById('play-again-button').addEventListener('click', function() {
        const level = document.querySelector('#easy-level-menu').style.display === 'flex' ? 'easy' :
                      document.querySelector('#medium-level-menu').style.display === 'flex' ? 'medium' : 'hard';
        playAgain(level);
    });

    // Definirea interactivitatii pentru meniul NIVELULUI USOR
    document.getElementById('easy-level-button').addEventListener('click', function() {
        document.getElementById('difficulty-menu').style.display = 'none';
        document.getElementById('easy-level-menu').style.display = 'flex';
        loadRandomEasyImage();
        enableGameButtons('easy');
    });

    document.getElementById('next-easy-level-button').addEventListener('click', function() {
        loadRandomEasyImage();
    });

    document.getElementById('close-easy-level-button').addEventListener('click', function() {
        document.getElementById('easy-level-menu').style.display = 'none';
        document.getElementById('menu-window').style.display = 'flex';

        fetch('/reset-easy-game', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('easy-points-value').textContent = '0';
                document.getElementById('easy-lives-value').textContent = '5';
                enableGameButtons('easy');
            } else {
                console.error('Error resetting game:', data.message);
            }
        })
        .catch(error => console.error('Error resetting game:', error));
    });

    document.getElementById('easy-level-menu').addEventListener('submit', function(event) {
        event.preventDefault();
        checkEasyAnswer();
    });

    // Definirea interactivitatii pentru meniul NIVELULUI MEDIU
    document.getElementById('medium-level-button').addEventListener('click', function() {
        document.getElementById('difficulty-menu').style.display = 'none';
        document.getElementById('medium-level-menu').style.display = 'flex';
        loadRandomMediumImage();
        enableGameButtons('medium');
    });

    document.getElementById('next-medium-level-button').addEventListener('click', function() {
        loadRandomMediumImage();
    });

    document.getElementById('close-medium-level-button').addEventListener('click', function() {
        document.getElementById('medium-level-menu').style.display = 'none';
        document.getElementById('menu-window').style.display = 'flex';

        fetch('/reset-medium-game', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('medium-points-value').textContent = '0';
                document.getElementById('medium-lives-value').textContent = '4';
                enableGameButtons('medium');
            } else {
                console.error('Error resetting game:', data.message);
            }
        })
        .catch(error => console.error('Error resetting game:', error));
    });

    document.getElementById('medium-level-menu').addEventListener('submit', function(event) {
        event.preventDefault();
        checkMediumAnswer();
    });

    // Definirea interactivitatii pentru meniul NIVELULUI GREU
    document.getElementById('hard-level-button').addEventListener('click', function() {
        document.getElementById('difficulty-menu').style.display = 'none';
        document.getElementById('hard-level-menu').style.display = 'flex';
        loadRandomHardImage();
        resetHardTimer();
        startHardTimer();
        enableGameButtons('hard');
    });

    document.getElementById('next-hard-level-button').addEventListener('click', function() {
        loadRandomHardImage();
    });

    document.getElementById('close-hard-level-button').addEventListener('click', function() {
        document.getElementById('hard-level-menu').style.display = 'none';
        document.getElementById('menu-window').style.display = 'flex';
        resetHardTimer();

        fetch('/reset-hard-game', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('hard-points-value').textContent = '0';
                document.getElementById('hard-lives-value').textContent = '3';
                enableGameButtons('hard');
            } else {
                console.error('Error resetting game:', data.message);
            }
        })
        .catch(error => console.error('Error resetting game:', error));
    });

    document.getElementById('hard-level-menu').addEventListener('submit', function(event) {
        event.preventDefault();
        checkHardAnswer();
    });

    // Definirea interactivitatii pentru meniul SETARILOR
    document.getElementById('settings-button').addEventListener('click', function() {
        document.getElementById('menu-window').style.display = 'none';
        document.getElementById('settings-menu').style.display = 'flex';
    });

    document.getElementById('fullscreen-toggle').addEventListener('change', function() {
        if (this.checked) {
            enterFullScreen();
        } else {
            exitFullScreen();
        }
    });

    document.getElementById('close-settings-button').addEventListener('click', function() {
        document.getElementById('settings-menu').style.display = 'none';
        document.getElementById('menu-window').style.display = 'flex';
    });

    document.getElementById('volume-control').addEventListener('input', function() {
        var value = this.value;
        document.getElementById('volume-value').textContent = value;
        var percentage = (value - this.min) / (this.max - this.min) * 100;
        this.style.background = 'linear-gradient(to right, #10b339 ' + percentage + '%, #ccc ' + percentage + '%)';
    });

    // Funcția pentru a porni/opri muzica de fundal
    function toggleBackgroundMusic() {
        var backgroundMusic = document.getElementById('background-music');
        var musicToggle = document.getElementById('music-toggle');

        if (musicToggle.checked) {
            backgroundMusic.play();
        } else {
            backgroundMusic.pause();
            backgroundMusic.currentTime = 0;
        }
    }

    // Adaugă interactivitate pentru butonul de control al muzicii
    document.getElementById('music-toggle').addEventListener('change', function() {
        toggleBackgroundMusic(); 
    });

    document.getElementById('fullscreen-toggle').addEventListener('change', function() {
        if (this.checked) {
            enterFullScreen();
            toggleBackgroundMusic(); 
        } else {
            exitFullScreen();
            toggleBackgroundMusic(); 
        }
    });

    document.getElementById('volume-control').addEventListener('input', function() {
        var volume = parseFloat(this.value) / 100; 
        var backgroundMusic = document.getElementById('background-music');
        backgroundMusic.volume = volume;

        document.getElementById('volume-value').textContent = Math.round(volume * 100);
    });

    // Definirea interactivitatii pentru meniul INSTRUCTIUNILOR
    document.getElementById('instructions-button').addEventListener('click', function() {
        document.getElementById('menu-window').style.display = 'none';
        document.getElementById('instructions-menu').style.display = 'flex';
    });

    document.getElementById('close-instructions-button').addEventListener('click', function() {
        document.getElementById('instructions-menu').style.display = 'none';
        document.getElementById('menu-window').style.display = 'flex';
    });

    updateLeaderboard();
});
