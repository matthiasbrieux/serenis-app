/* Dashboard-only read-only view of the existing /api/agenda response from loadData(). */
(() => {
  'use strict';
  const element = (tag, text, className) => {
    const node = document.createElement(tag); node.textContent = text;
    if (className) node.className = className; return node;
  };
  const agendaLink = (label, className) => {
    const link = element('a', label, className); link.href = '/mon-agenda'; return link;
  };
  window.renderDashboardAvailability = slots => {
    const target = document.getElementById('mvAvailability'); if (!target) return;
    const now = new Date();
    const today = new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
    const time = new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);
    const validTime = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d/.test(value);
    const available = (Array.isArray(slots) ? slots : []).filter(slot => {
      if (slot.active === 0 || !validTime(slot.start_time) || !validTime(slot.end_time)) return false;
      if (slot.specific_date) return /^\d{4}-\d{2}-\d{2}$/.test(slot.specific_date) && (slot.specific_date > today || (slot.specific_date === today && slot.end_time.slice(0,5) > time));
      return Number(slot.is_recurring) === 1 && Number.isInteger(Number(slot.day_of_week)) && Number(slot.day_of_week) >= 0 && Number(slot.day_of_week) <= 6;
    }).sort((a,b) => (a.specific_date || '9999').localeCompare(b.specific_date || '9999') || a.start_time.localeCompare(b.start_time));
    target.replaceChildren();
    target.classList.toggle('is-empty', !available.length);
    if (!available.length) {
      target.append(element('p', 'Aucune disponibilité renseignée pour le moment.', 'mv-empty'), agendaLink('+ Ajouter mes disponibilités', 'mv-primary mv-availability-empty-action'));
      return;
    }
    const weekdays = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
    for (const slot of available.slice(0,3)) {
      const card = element('div', '', 'mv-availability-slot');
      if (slot.specific_date) {
        const date = new Date(slot.specific_date+'T12:00:00Z');
        card.append(element('span', new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',weekday:'short'}).format(date), 'mv-availability-day'));
        const label = element('time', new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',day:'numeric',month:'short'}).format(date), 'mv-availability-date'); label.dateTime=slot.specific_date; card.append(label);
      } else {
        card.append(element('span','Chaque','mv-availability-day'),element('strong',weekdays[Number(slot.day_of_week)],'mv-availability-date'));
      }
      card.append(element('span',slot.start_time.slice(0,5)+' – '+slot.end_time.slice(0,5),'mv-availability-time'));
      const state = element('span','Créneau ouvert','mv-availability-state');
      const check = element('span','', 'mv-availability-check'); check.setAttribute('aria-hidden','true');
      check.innerHTML='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12 4 4 10-10"/></svg>';
      state.prepend(check);card.append(state);target.append(card);
    }
    const add = agendaLink('', 'mv-availability-add');
    const plus = element('span','+', 'mv-availability-plus'); plus.setAttribute('aria-hidden','true');
    add.append(plus, element('span','Ajouter un créneau'));target.append(add);
  };
})();
