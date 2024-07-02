// server.js
const http = require('http');
const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Joi = require('joi');
const allowedEmails = ['cosmin.garbia@yahoo.ro', 'anitastefanandrei@gmail.com'];

const PORT = 4000;
const url = 'mongodb://localhost:27017';
const dbName = 'frowDB';
const client = new MongoClient(url);
let db;

function parseCookies(request) {
    const list = {};
    const cookieHeader = request.headers.cookie;

    if (cookieHeader) {
        cookieHeader.split(';').forEach(cookie => {
            let [name, ...rest] = cookie.split('=');
            name = name?.trim();
            if (!name) return;
            const value = rest.join('=').trim();
            if (!value) return;
            list[name] = decodeURIComponent(value);
        });
    }

    return list;
}

function generateRSSFeed(scores) {
    let rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
    <title>Top Players Leaderboard</title>
    <description>Top players and their scores</description>
    <link>http://localhost:4000/rss</link>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`;

    scores.forEach(score => {
        rssFeed += `
        <item>
            <title>${escapeXml(score.playerName)}</title>
            <link>http://localhost:4000/player/${escapeXml(score.playerName)}</link>
            <description>Points: ${escapeXml(score.points)}, Level: ${escapeXml(score.level)}</description>
            <pubDate>${new Date(score.timestamp).toUTCString()}</pubDate>
            <guid>http://localhost:4000/player/${escapeXml(score.playerName)}</guid>
        </item>`;
    });

    rssFeed += `
</channel>
</rss>`;

    return rssFeed;
}

function escapeXml(unsafe) {
    return String(unsafe).replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}

async function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${hash}$${salt}`;
}

async function verifyPassword(password, hashedPassword) {
    const [hash, salt] = hashedPassword.split('$');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
}

async function resetGame(collectionName) {
    const collection = db.collection(collectionName);
    await collection.updateMany({ visited: 'yes' }, { $set: { visited: 'no' } });
}

async function getRandomEasyImage() {
    const collection = db.collection('EasyLevel');
    const randomImage = await collection.aggregate([
        { $match: { visited: 'no' } }, 
        { $sample: { size: 1 } }
    ]).toArray();
    if (randomImage.length > 0) {
        const imagePath = path.join(__dirname, 'public', randomImage[0].path.replace(/^C:\\Resurse_TWEB\\Fruits_on_the_Web\\src\\public\\/, ''));
        const imageBuffer = fs.readFileSync(imagePath);
        const imageBase64 = imageBuffer.toString('base64');
        return { imageBase64, filename: path.basename(imagePath) };
    }
    return null;
}

async function getRandomMediumImage() {
    const collection = db.collection('MediumLevel');
    const randomImage = await collection.aggregate([
        { $match: { visited: 'no' } }, 
        { $sample: { size: 1 } }
    ]).toArray();
    if (randomImage.length > 0) {
        const imagePath = path.join(__dirname, 'public', randomImage[0].path.replace(/^C:\\Resurse_TWEB\\Fruits_on_the_Web\\src\\public\\/, ''));
        const imageBuffer = fs.readFileSync(imagePath);
        const imageBase64 = imageBuffer.toString('base64');
        return { imageBase64, filename: path.basename(imagePath) };
    }
    return null;
}

async function getRandomHardImage() {
    const collection = db.collection('HardLevel');
    const randomImage = await collection.aggregate([
        { $match: { visited: 'no' } }, 
        { $sample: { size: 1 } }
    ]).toArray();
    if (randomImage.length > 0) {
        const imagePath = path.join(__dirname, 'public', randomImage[0].path.replace(/^C:\\Resurse_TWEB\\Fruits_on_the_Web\\src\\public\\/, ''));
        const imageBuffer = fs.readFileSync(imagePath);
        const imageBase64 = imageBuffer.toString('base64');
        return { imageBase64, filename: path.basename(imagePath) };
    }
    return null;
}

async function checkAllVisited(collectionName) {
    const collection = db.collection(collectionName);
    const count = await collection.countDocuments({ visited: 'no' });
    return count === 0;
}

async function handleRequest(req, res) {
    const collectionRegistration = db.collection('Registrations');
    const collectionReports = db.collection('Reports');
    const publicPath = path.join(__dirname, 'public');

    const serveStaticFile = (fileName, contentType) => {
        const filePath = path.join(publicPath, fileName);
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Fisierul nu a fost gasit.');
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(data);
            }
        });
    };

    const cookies = parseCookies(req);
    const loggedInEmail = cookies['email'];

    if (req.method === 'GET') {
        if (req.url === '/' || req.url.match(/\.(html|css|js|ico|png|jpg|mp3)$/)) {
            let filePath = req.url === '/' ? 'login.html' : req.url.substring(1);
            let contentType = 'text/html';
            if (filePath.match(/\.css$/)) {
                contentType = 'text/css';
            } else if (filePath.match(/\.js$/)) {
                contentType = 'application/javascript';
            } else if (filePath.match(/\.ico$/)) {
                contentType = 'image/x-icon';
            } else if (filePath.match(/\.(png|jpg)$/)) {
                contentType = 'image/png';
            } else if (filePath.match(/\.mp3$/)) {
                contentType = 'audio/mpeg';
            }
            serveStaticFile(filePath, contentType);
            return;

        } else if (req.url === '/users') {
            try {
                if (!loggedInEmail) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Unauthorized' }));
                    return;
                }

                if (!allowedEmails.includes(loggedInEmail)) {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Access forbidden' }));
                    return;
                }

                const users = await collectionRegistration.find({}).toArray();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(users));
            } catch (err) {
                console.error('Eroare la preluarea utilizatorilor:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Eroare la preluarea utilizatorilor!' }));
            }
            return;

        } else if (req.url === '/reports') {
            if (!loggedInEmail) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Not authenticated' }));
                return;
            }
        
            if (!allowedEmails.includes(loggedInEmail)) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Access forbidden' }));
                return;
            }
        
            try {
                const reports = await collectionReports.find({}).toArray();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(reports));
            } catch (err) {
                console.error('Eroare la preluarea rapoartelor:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Eroare la preluarea rapoartelor!' }));
            }
            return;
            
        } else if (req.url === '/random-easy-image') {
            const imageData = await getRandomEasyImage();
            if (imageData) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ imageBlob: imageData.imageBase64, filename: imageData.filename }));
            } else {
                res.writeHead(404);
                res.end('Image not found');
            }
            return;

        } else if (req.url === '/random-medium-image') {
            const imageData = await getRandomMediumImage();
            if (imageData) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ imageBlob: imageData.imageBase64, filename: imageData.filename }));
            } else {
                res.writeHead(404);
                res.end('Image not found');
            }
            return;
        
        } else if (req.url === '/random-hard-image') {
            const imageData = await getRandomHardImage();
            if (imageData) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ imageBlob: imageData.imageBase64, filename: imageData.filename }));
            } else {
                res.writeHead(404);
                res.end('Image not found');
            }
            return;

        } else if (req.url === '/check-all-visited-easy') {
            const allVisited = await checkAllVisited('EasyLevel');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ allVisited }));
            return;

        } else if (req.url === '/check-all-visited-medium') {
            const allVisited = await checkAllVisited('MediumLevel');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ allVisited }));
            return;
            
        } else if (req.url === '/check-all-visited-hard') {
            const allVisited = await checkAllVisited('HardLevel');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ allVisited }));
            return;
            
        } else if (req.url === '/get-scores') {
            try {
                const scores = await db.collection('Scores').find().toArray();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(scores));
            } catch (err) {
                console.error('Error fetching scores:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Failed to fetch scores' }));
            }
            return;

        } else if (req.url === '/current-user') {
            if (!loggedInEmail) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Not authenticated' }));
                return;
            }
            try {
                const user = await collectionRegistration.findOne({ "email-registration": loggedInEmail });
                if (!user) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'User not found' }));
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(user));
                }
            } catch (err) {
                console.error('Eroare la preluarea utilizatorului curent:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Failed to fetch current user' }));
            }
            return;
            
        } else if (req.url === '/rss') {
            try {
                const scores = await db.collection('Scores').find().sort({ points: -1 }).toArray();
                const rssFeed = generateRSSFeed(scores);
                res.writeHead(200, { 'Content-Type': 'application/rss+xml' });
                res.end(rssFeed);
            } catch (err) {
                console.error('Error fetching scores for RSS feed:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Failed to fetch scores for RSS feed' }));
            }
            return;

        } else if (req.url === '/leaderboard') {
            try {
                if (!loggedInEmail) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Unauthorized' }));
                    return;
                }
        
                if (!allowedEmails.includes(loggedInEmail)) {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Access forbidden' }));
                    return;
                }
        
                const collection = db.collection('Scores');
                const leaderboard = await collection.find().toArray();
        
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(leaderboard));
            } catch (error) {
                console.error('Eroare la preluarea leaderboard-ului jocurilor:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Eroare la preluarea leaderboard-ului jocurilor' }));
            }
            return;
        }      

    } else if (req.method === 'POST') {
        if (req.url === '/register') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    const hashedPassword = await hashPassword(data["password-registration"]);
                    const userData = {
                        "first-name-registration": data["first-name-registration"],
                        "last-name-registration": data["last-name-registration"],
                        "terms-conditions": data["terms-conditions"],
                        "email-registration": data["email-registration"],
                        "phone-registration": data["phone-registration"],
                        "birth-date-registration": data["birth-date-registration"],
                        "gender-registration": data["gender-registration"],
                        "age-registration": data["age-registration"],
                        "password-registration": hashedPassword,
                        "role-registration": data["role-registration"] || "USER"
                    };
                    await collectionRegistration.insertOne(userData);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Registration Completed Successfully!' }));
                } catch (err) {
                    console.error('Eroare la inserarea datelor in baza de date:', err);
                    if (err.code === 11000) {
                        res.writeHead(409, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ message: 'This Email Address Already In Use!' }));
                    } else {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ message: 'Registration Failed!' }));
                    }
                }
            });
            return;      

        } else if (req.url === '/login') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', async () => {
                try {
                    const schema = Joi.object({
                        "email-login": Joi.string().email().required(),
                        "password-login": Joi.string().required()
                    });

                    const { error, value } = schema.validate(JSON.parse(body));
                    if (error) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ message: 'Invalid input' }));
                        return;
                    }

                    const user = await collectionRegistration.findOne({ "email-registration": value["email-login"] });
                    if (!user) {
                        res.writeHead(401, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ message: 'This FROW Account Doesn\'t Exist!' }));
                        return;
                    } else if (!(await verifyPassword(value["password-login"], user["password-registration"]))) {
                        res.writeHead(401, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ message: 'Incorrect Email/Password Combination!' }));
                        return;
                    } else {
                        res.writeHead(200, { 
                            'Content-Type': 'application/json',
                            'Set-Cookie': `email=${encodeURIComponent(value["email-login"])}; HttpOnly; Path=/`
                        });
                        res.end(JSON.stringify({ message: 'Successfully Logged In!' }));
                        return;
                    }
                } catch (err) {
                    console.error('Eroare la autentificare:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Login Failed!' }));
                }
            });
            return;

        } else if (req.url === '/check-email') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', async () => {
                try {
                    const schema = Joi.object({
                        email: Joi.string().email().required()
                    });

                    const { error, value } = schema.validate(JSON.parse(body));
                    if (error) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ message: 'Invalid input' }));
                        return;
                    }

                    const user = await collectionRegistration.findOne({ "email-registration": value.email });
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ exists: !!user }));
                } catch (err) {
                    console.error('Eroare la verificarea emailului:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ exists: false }));
                }
            });
            return;

        } else if (req.url === '/reset-password') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', async () => {
                try {
                    const schema = Joi.object({
                        email: Joi.string().email().required(),
                        newPassword: Joi.string().required()
                    });

                    const { error, value } = schema.validate(JSON.parse(body));
                    if (error) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: 'Invalid input' }));
                        return;
                    }

                    const user = await collectionRegistration.findOne({ "email-registration": value.email });
                    if (!user) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: 'User Not Found!' }));
                        return;
                    }

                    const isSamePassword = await verifyPassword(value.newPassword, user["password-registration"]);
                    if (isSamePassword) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: 'New Password Must Be Different from The Old One!' }));
                        return;
                    }

                    const hashedPassword = await hashPassword(value.newPassword);
                    const result = await collectionRegistration.updateOne(
                        { "email-registration": value.email },
                        { $set: { "password-registration": hashedPassword } }
                    );

                    if (result.modifiedCount > 0) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, message: 'Password Reset Successfully!' }));
                    } else {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: 'Failed to Reset Password!' }));
                    }
                } catch (err) {
                    console.error('Eroare la resetarea parolei:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Failed to Reset Password!' }));
                }
            });
            return;

        } else if (req.url === '/edit-user') {
            if (!loggedInEmail) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Not authenticated' }));
                return;
            }
        
            if (!allowedEmails.includes(loggedInEmail)) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Access forbidden' }));
                return;
            }
        
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', async () => {
                try {
                    const schema = Joi.object({
                        _id: Joi.string().required(),
                        firstName: Joi.string().required(),
                        lastName: Joi.string().required(),
                        email: Joi.string().email().required(),
                        role: Joi.string().valid('USER', 'ADMIN').required()
                    });
        
                    const { error, value } = schema.validate(JSON.parse(body));
                    if (error) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: 'Invalid input' }));
                        return;
                    }
        
                    const result = await collectionRegistration.updateOne(
                        { _id: new ObjectId(value._id) },
                        { $set: {
                            'first-name-registration': value.firstName,
                            'last-name-registration': value.lastName,
                            'email-registration': value.email,
                            'role-registration': value.role
                        } }
                    );
        
                    if (result.modifiedCount > 0) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, message: 'Utilizatorul a fost actualizat cu succes!' }));
                    } else {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: 'Nu s-a putut actualiza utilizatorul!' }));
                    }
                } catch (err) {
                    console.error('Eroare la editarea utilizatorului:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Eroare la editarea utilizatorului!' }));
                }
            });
            return;

        } else if (req.url === '/delete-user') {
            if (!loggedInEmail) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Not authenticated' }));
                return;
            }
        
            if (!allowedEmails.includes(loggedInEmail)) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Access forbidden' }));
                return;
            }
        
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', async () => {
                try {
                    const schema = Joi.object({
                        userId: Joi.string().required()
                    });
        
                    const { error, value } = schema.validate(JSON.parse(body));
                    if (error) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: 'Invalid input' }));
                        return;
                    }
        
                    const result = await collectionRegistration.deleteOne({ _id: new ObjectId(value.userId) });
        
                    if (result.deletedCount > 0) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, message: 'Utilizatorul a fost șters cu succes!' }));
                    } else {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: 'Utilizatorul nu a fost găsit!' }));
                    }
                } catch (err) {
                    console.error('Eroare la ștergerea utilizatorului:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Eroare la ștergerea utilizatorului!' }));
                }
            });
            return;

        } else if (req.url === '/submit-report') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', async () => {
                try {
                    const schema = Joi.object({
                        email: Joi.string().email().required(),
                        message: Joi.string().required()
                    });
        
                    const { error, value } = schema.validate(JSON.parse(body));
                    if (error) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: 'Invalid input' }));
                        return;
                    }
        
                    const user = await collectionRegistration.findOne({ "email-registration": value.email });
                    if (!user) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: 'User Not Found!' }));
                        return;
                    }
        
                    const result = await collectionReports.insertOne({ email: value.email, message: value.message });
        
                    if (result.acknowledged && result.insertedId) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, message: 'Report Submitted Successfully!' }));
                    } else {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: 'Failed to Submit Report!' }));
                    }
                } catch (err) {
                    console.error('Error submitting report:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Failed to Submit Report!' }));
                }
            });
            return;

        } else if (req.url === '/verify-easy-answer') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', async () => {
                try {
                    const { answer, filename } = JSON.parse(body);

                    const document = await db.collection('EasyLevel').findOne({ path: { $regex: new RegExp(filename + '\\.jpg$', 'i') } });

                    if (!document) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ correct: false }));
                        return;
                    }

                    const correct = document.name.toLowerCase() === answer.toLowerCase();
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ correct: correct }));
                } catch (error) {
                    console.error('Error verifying answer:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Failed to verify answer' }));
                }
            });
            return;

        } else if (req.url === '/verify-medium-answer') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', async () => {
                try {
                    const { answer, filename } = JSON.parse(body);

                    const document = await db.collection('MediumLevel').findOne({ path: { $regex: new RegExp(filename + '\\.jpg$', 'i') } });

                    if (!document) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ correct: false }));
                        return;
                    }

                    const correct = document.name.toLowerCase() === answer.toLowerCase();
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ correct: correct }));
                } catch (error) {
                    console.error('Error verifying answer:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Failed to verify answer' }));
                }
            });
            return;

        } else if (req.url === '/verify-hard-answer') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', async () => {
                try {
                    const { answer, filename } = JSON.parse(body);

                    const document = await db.collection('HardLevel').findOne({ path: { $regex: new RegExp(filename + '\\.jpg$', 'i') } });

                    if (!document) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ correct: false }));
                        return;
                    }

                    const correct = document.name.toLowerCase() === answer.toLowerCase();
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ correct: correct }));
                } catch (error) {
                    console.error('Error verifying answer:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Failed to verify answer' }));
                }
            });
            return;

        } else if (req.url === '/update-easy-visited') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', async () => {
                try {
                    const { filename } = JSON.parse(body);
                    const result = await db.collection('EasyLevel').updateOne(
                        { path: { $regex: new RegExp(filename + '\\.jpg$', 'i') } },
                        { $set: { visited: 'yes' } }
                    );
                    if (result.modifiedCount > 0) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                    } else {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: 'Image not found' }));
                    }
                } catch (err) {
                    console.error('Error updating visited field:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Failed to update visited field' }));
                }
            });
            return;

        } else if (req.url === '/update-medium-visited') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', async () => {
                try {
                    const { filename } = JSON.parse(body);
                    const result = await db.collection('MediumLevel').updateOne(
                        { path: { $regex: new RegExp(filename + '\\.jpg$', 'i') } },
                        { $set: { visited: 'yes' } }
                    );
                    if (result.modifiedCount > 0) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                    } else {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: 'Image not found' }));
                    }
                } catch (err) {
                    console.error('Error updating visited field:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Failed to update visited field' }));
                }
            });
            return;

        } else if (req.url === '/update-hard-visited') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', async () => {
                try {
                    const { filename } = JSON.parse(body);
                    const result = await db.collection('HardLevel').updateOne(
                        { path: { $regex: new RegExp(filename + '\\.jpg$', 'i') } },
                        { $set: { visited: 'yes' } }
                    );
                    if (result.modifiedCount > 0) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                    } else {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: 'Image not found' }));
                    }
                } catch (err) {
                    console.error('Error updating visited field:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Failed to update visited field' }));
                }
            });
            return;

        } else if (req.url === '/reset-easy-game') {
            try {
                await resetGame('EasyLevel');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (err) {
                console.error('Error resetting game:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Failed to reset game' }));
            }
            return;
        
        } else if (req.url === '/reset-medium-game') {
            try {
                await resetGame('MediumLevel');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (err) {
                console.error('Error resetting game:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Failed to reset game' }));
            }
            return;
        
        } else if (req.url === '/reset-hard-game') {
            try {
                await resetGame('HardLevel');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (err) {
                console.error('Error resetting game:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Failed to reset game' }));
            }
            return;

        } else if (req.url === '/save-score') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', async () => {
                try {
                    const { playerName, points, level } = JSON.parse(body);
                    const collection = db.collection('Scores');
        
                    const existingScore = await collection.findOne({ playerName: playerName });
        
                    if (existingScore) {
                        if (points > existingScore.points) {
                            await collection.updateOne(
                                { _id: existingScore._id },
                                { $set: { points: points, level: level } }
                            );
                        }
                    } else {
                        await collection.insertOne({ playerName, points, level });
                    }
        
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (err) {
                    console.error('Error saving score:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Failed to save score' }));
                }
            });
            return;
            
        } else if (req.url === '/edit-user1') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', async () => {
                try {
                    if (!loggedInEmail) {
                        res.writeHead(401, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: 'Unauthorized' }));
                        return;
                    }
    
                    const schema = Joi.object({
                        'first-name-registration': Joi.string().required(),
                        'last-name-registration': Joi.string().required(),
                        'phone-registration': Joi.string().required(),
                        'birth-date-registration': Joi.date().required(),
                        'gender-registration': Joi.string().valid('male', 'female', 'other').required(),
                        'age-registration': Joi.number().integer().min(0).required()
                    });
    
                    const { error, value } = schema.validate(JSON.parse(body));
                    if (error) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: 'Invalid input' }));
                        return;
                    }
    
                    const result = await collectionRegistration.updateOne(
                        { "email-registration": loggedInEmail },
                        {
                            $set: {
                                'first-name-registration': value['first-name-registration'],
                                'last-name-registration': value['last-name-registration'],
                                'phone-registration': value['phone-registration'],
                                'birth-date-registration': value['birth-date-registration'],
                                'gender-registration': value['gender-registration'],
                                'age-registration': value['age-registration']
                            }
                        }
                    );
    
                    if (result.modifiedCount > 0) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, message: 'User updated successfully!' }));
                    } else {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: 'Failed to update user!' }));
                    }
                } catch (err) {
                    console.error('Error updating user:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Error updating user!' }));
                }
            });
            return; 
            
        } else if (req.url === '/logout') {
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Set-Cookie': 'email=; HttpOnly; Path=/; Max-Age=0'
            });
            res.end(JSON.stringify({ success: true, message: 'Successfully Logged Out!' }));
            return;
        }
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Endpoint necunoscut.');
}

const server = http.createServer((req, res) => {
    handleRequest(req, res).catch((err) => {
        console.error('A aparut o eroare:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('A aparut o eroare in prelucrarea cererii.');
    });
});

async function startServer() {
    try {
        await client.connect();
        console.log('Conexiune la MongoDB reusita!');
        db = client.db(dbName);
        await db.collection('Reports').createIndex({ "email": 1 });
        await db.collection('Registrations').createIndex({ "email-registration": 1 }, { unique: true });
        server.listen(PORT, () => {
            console.log(`Serverul asculta la http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('Eroare la conectarea cu MongoDB:', err);
    }
}

startServer();
