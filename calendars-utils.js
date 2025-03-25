const ical = require('node-ical');
const axios = require('axios');

function parseTimeString(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

async function isSlotFree(calendarUrl, date, time) {
  try {
    const { hours, minutes } = parseTimeString(time);
    const slotStart = new Date(`${date}T${time}:00`);
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotStart.getMinutes() + 30);

    const response = await axios.get(calendarUrl);
    const data = await ical.async.parseICS(response.data);

    for (const k in data) {
      const event = data[k];
      if (event.type === 'VEVENT' && event.start && event.end) {
        if (
          (slotStart >= event.start && slotStart < event.end) ||
          (slotEnd > event.start && slotEnd <= event.end)
        ) {
          return false;
        }
      }
    }
    return true;
  } catch (err) {
    console.error(`Errore nel fetch di ${calendarUrl}:`, err.message);
    return false;
  }
}

async function getAvailableCollaborators(collaborators, date, time) {
  const checks = collaborators.map(async (c) => {
    const free = await isSlotFree(c.calendarUrl, date, time);
    return free ? c.name : null;
  });

  const results = await Promise.all(checks);
  return results.filter(name => name);
}

module.exports = {
  getAvailableCollaborators,
};
