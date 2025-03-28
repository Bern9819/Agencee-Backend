const express = require('express');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');
const { getAvailableCollaborators } = require ('./calendars-utils');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const collaboratorsFile = 'collaborators.json';
const eventsFile = 'events.json';
const users = [{ username: 'admin', password: 'password123' }];

// Utils per leggere/scrivere file JSON
function readJsonFile(file) {
  try {
    return JSON.parse(fs.readFileSync(file));
  } catch {
    return [];
  }
}

function writeJsonFile(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Login semplice
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (user) res.json({ success: true });
  else res.status(401).json({ success: false, message: 'Credenziali errate' });
});

// Collaborators
app.get('/collaborators', (req, res) => res.json(readJsonFile(collaboratorsFile)));

app.post('/collaborators', (req, res) => {
  const { name, calendarType, calendarUrl } = req.body;
  if (!name || !calendarType || !calendarUrl)
    return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });

  const collaborators = readJsonFile(collaboratorsFile);
  const newCollab = { id: Date.now(), name, calendarType, calendarUrl };
  collaborators.push(newCollab);
  writeJsonFile(collaboratorsFile, collaborators);
  res.status(201).json(newCollab);
});

app.delete('/collaborators/:id', (req, res) => {
  let collaborators = readJsonFile(collaboratorsFile);
  collaborators = collaborators.filter(c => c.id !== parseInt(req.params.id));
  writeJsonFile(collaboratorsFile, collaborators);
  res.json({ message: 'Collaboratore rimosso' });
});

// Eventi / Servizi
app.get('/events', (req, res) => res.json(readJsonFile(eventsFile)));

app.post('/events', (req, res) => {
  const { name, type, location } = req.body;
  if (!name || !type || !location)
    return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });

  const events = readJsonFile(eventsFile);
  const newEvent = { id: Date.now(), name, type, location };
  events.push(newEvent);
  writeJsonFile(eventsFile, events);
  res.status(201).json(newEvent);
});

app.delete('/events/:id', (req, res) => {
  let events = readJsonFile(eventsFile);
  events = events.filter(e => e.id !== parseInt(req.params.id));
  writeJsonFile(eventsFile, events);
  res.json({ message: 'Evento rimosso' });
});

// Availability API
app.get('/availability/all', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Parametro "date" mancante' });

  const slotDurationMinutes = 30;
  const timeSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00'];

  try {
    const collaborators = readJsonFile(collaboratorsFile);
    const results = {};

    for (const slot of timeSlots) {
      const freeCollaborators = await getAvailableCollaborators(collaborators, date, slot);
      if (freeCollaborators.length > 0) {
        results[slot] = freeCollaborators;
      }
    }

    res.json(results);
  } catch (err) {
    console.error('Errore su /availability/all:', err.message);
    res.status(500).json({ error: 'Errore interno' });
  }
});


// Default route
app.get('/', (req, res) => res.send('✅ Agencee API attivo'));

app.listen(port, () => {
  console.log(`✅ Server attivo su http://localhost:${port}`);
});
