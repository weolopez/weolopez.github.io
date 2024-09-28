class AppointmentCalendar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.appointments = JSON.parse(localStorage.getItem('appointments')) || [];
    this.currentDate = new Date();
    this.currentView = 'month';
  }

  connectedCallback() {
    this.render();
    this.addEventListeners();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: Arial, sans-serif;
        }
        .calendar {
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .view-selector {
          display: flex;
        }
        .view-selector button {
          margin-left: 0.5rem;
        }
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 1px;
          background-color: #ddd;
        }
        .calendar-cell {
          background-color: white;
          padding: 0.5rem;
          min-height: 100px;
        }
        .calendar-cell.other-month {
          opacity: 0.5;
        }
        .appointment {
          background-color: #007bff;
          color: white;
          padding: 0.25rem;
          margin-bottom: 0.25rem;
          font-size: 0.8rem;
          cursor: pointer;
        }
        .appointment.busy {
          background-color: #dc3545;
        }
        @media (max-width: 600px) {
          .calendar-grid {
            grid-template-columns: repeat(1, 1fr);
          }
        }
      </style>
      <div class="calendar">
        <div class="header">
          <button id="prev">&lt;</button>
          <h2 id="current-date"></h2>
          <button id="next">&gt;</button>
        </div>
        <div class="view-selector">
          <button id="month-view">Month</button>
          <button id="week-view">Week</button>
          <button id="day-view">Day</button>
        </div>
        <div class="calendar-grid" id="calendar-grid"></div>
      </div>
    `;
  }

  addEventListeners() {
    this.shadowRoot.getElementById('prev').addEventListener('click', () => this.navigateDate(-1));
    this.shadowRoot.getElementById('next').addEventListener('click', () => this.navigateDate(1));
    this.shadowRoot.getElementById('month-view').addEventListener('click', () => this.setView('month'));
    this.shadowRoot.getElementById('week-view').addEventListener('click', () => this.setView('week'));
    this.shadowRoot.getElementById('day-view').addEventListener('click', () => this.setView('day'));
    this.shadowRoot.getElementById('calendar-grid').addEventListener('click', (e) => {
      if (e.target.classList.contains('calendar-cell')) {
        this.requestAppointment(new Date(e.target.dataset.date));
      }
    });
  }

  navigateDate(direction) {
    const increment = this.currentView === 'month' ? 'Month' : this.currentView === 'week' ? 'Week' : 'Date';
    this.currentDate = new Date(this.currentDate[`set${increment}`](this.currentDate[`get${increment}`]() + direction));
    this.updateCalendar();
  }

  setView(view) {
    this.currentView = view;
    this.updateCalendar();
  }

  updateCalendar() {
    const grid = this.shadowRoot.getElementById('calendar-grid');
    grid.innerHTML = '';
    
    const currentDateElement = this.shadowRoot.getElementById('current-date');
    currentDateElement.textContent = this.formatDate(this.currentDate);

    if (this.currentView === 'month') {
      this.renderMonthView(grid);
    } else if (this.currentView === 'week') {
      this.renderWeekView(grid);
    } else {
      this.renderDayView(grid);
    }
  }

  renderMonthView(grid) {
    const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
    const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
    
    let currentDate = new Date(firstDay);
    currentDate.setDate(currentDate.getDate() - currentDate.getDay());

    while (currentDate <= lastDay || grid.children.length < 42) {
      const cell = document.createElement('div');
      cell.classList.add('calendar-cell');
      cell.textContent = currentDate.getDate();
      cell.dataset.date = currentDate.toISOString();

      if (currentDate.getMonth() !== this.currentDate.getMonth()) {
        cell.classList.add('other-month');
      }

      this.renderAppointments(cell, currentDate);
      grid.appendChild(cell);

      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  renderWeekView(grid) {
    const startOfWeek = new Date(this.currentDate);
    startOfWeek.setDate(this.currentDate.getDate() - this.currentDate.getDay());

    for (let i = 0; i < 7; i++) {
      const cell = document.createElement('div');
      cell.classList.add('calendar-cell');
      cell.textContent = this.formatDate(startOfWeek);
      cell.dataset.date = startOfWeek.toISOString();

      this.renderAppointments(cell, startOfWeek);
      grid.appendChild(cell);

      startOfWeek.setDate(startOfWeek.getDate() + 1);
    }
  }

  renderDayView(grid) {
    const cell = document.createElement('div');
    cell.classList.add('calendar-cell');
    cell.textContent = this.formatDate(this.currentDate);
    cell.dataset.date = this.currentDate.toISOString();

    const hoursContainer = document.createElement('div');
    for (let hour = 0; hour < 24; hour++) {
      const hourElement = document.createElement('div');
      hourElement.textContent = `${hour}:00`;
      hoursContainer.appendChild(hourElement);
    }

    cell.appendChild(hoursContainer);
    this.renderAppointments(cell, this.currentDate);
    grid.appendChild(cell);
  }

  renderAppointments(cell, date) {
    const dayAppointments = this.appointments.filter(app => 
      new Date(app.date).toDateString() === date.toDateString()
    );

    dayAppointments.forEach(app => {
      const appElement = document.createElement('div');
      appElement.classList.add('appointment');
      appElement.textContent = `${app.time} - ${app.status}`;
      if (app.status === 'accepted') {
        appElement.classList.add('busy');
      }
      appElement.addEventListener('click', () => this.handleAppointmentClick(app));
      cell.appendChild(appElement);
    });
  }

  requestAppointment(date) {
    const time = prompt('Enter appointment time (HH:MM):');
    if (time) {
      const newAppointment = { date: date.toISOString(), time, status: 'requested' };
      this.appointments.push(newAppointment);
      this.saveAppointments();
      this.updateCalendar();
    }
  }

  handleAppointmentClick(appointment) {
    if (appointment.status === 'requested') {
      if (confirm('Accept this appointment?')) {
        appointment.status = 'accepted';
        this.saveAppointments();
        this.updateCalendar();
        this.generateICalendar(appointment);
      }
    } else if (appointment.status === 'accepted') {
      this.generateICalendar(appointment);
    }
  }

  generateICalendar(appointment) {
    const startDate = new Date(`${appointment.date}T${appointment.time}`);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

    const icalContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${this.formatDateForICal(startDate)}
DTEND:${this.formatDateForICal(endDate)}
SUMMARY:Appointment
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icalContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'appointment.ics';
    a.click();
  }

  formatDateForICal(date) {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  formatDate(date) {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  saveAppointments() {
    localStorage.setItem('appointments', JSON.stringify(this.appointments));
  }
}

customElements.define('appointment-calendar', AppointmentCalendar);