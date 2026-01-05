// resume-component.js

class ResumeComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  async connectedCallback() {
    try {
      const response = await fetch('/resume.json');
      const data = await response.json();
      this.render(data);
    } catch (error) {
      console.error('Error loading resume data:', error);
      this.shadowRoot.innerHTML = `<p>Error loading resume data.</p>`;
    }
  }

  render(data) {
    const { basics, expertise, skills, work, education, awards, patents } = data;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #333;
          line-height: 1.6;
          background-color: #fff;
        }
        main {
          max-width: 900px;
          margin: 0 auto;
          padding: 40px 20px;
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 40px;
        }
        header {
          grid-column: 1 / -1;
          border-bottom: 2px solid #eee;
          padding-bottom: 20px;
          margin-bottom: 20px;
        }
        h1 {
          margin: 0;
          font-size: 2.5rem;
          color: #1a1a1a;
          letter-spacing: -0.02em;
        }
        .subtitle {
          font-size: 1.2rem;
          color: #666;
          margin-top: 5px;
        }
        .summary {
          margin-top: 15px;
          font-size: 1.1rem;
          max-width: 800px;
        }
        section {
          margin-bottom: 30px;
        }
        h2 {
          font-size: 1.5rem;
          border-bottom: 1px solid #eee;
          padding-bottom: 8px;
          margin-bottom: 15px;
          color: #2c3e50;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .job, .edu-item {
          margin-bottom: 20px;
        }
        .job-header, .edu-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          flex-wrap: wrap;
        }
        .job-title {
          font-weight: 700;
          font-size: 1.1rem;
          color: #000;
        }
        .company {
          color: #0077b5;
          font-weight: 600;
        }
        .date {
          font-style: italic;
          color: #777;
          font-size: 0.9rem;
        }
        .location {
          font-size: 0.9rem;
          color: #888;
          margin-bottom: 5px;
        }
        .description {
          margin-top: 8px;
          text-align: justify;
        }
        aside {
          display: flex;
          flex-direction: column;
          gap: 25px;
        }
        .contact-info div {
          margin-bottom: 5px;
          font-size: 0.95rem;
        }
        .contact-info a {
          color: #0077b5;
          text-decoration: none;
        }
        .tag-container {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .tag {
          background: #f0f2f5;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 0.85rem;
          color: #444;
        }
        .award-item, .patent-item {
          margin-bottom: 12px;
          font-size: 0.9rem;
        }
        .award-title, .patent-title {
          font-weight: 600;
          display: block;
        }
        .patent-link {
          color: #0077b5;
          text-decoration: none;
          font-family: monospace;
        }
        @media (max-width: 768px) {
          main {
            grid-template-columns: 1fr;
          }
          aside {
            order: -1;
          }
        }
        @media print {
          main { padding: 0; gap: 20px; }
          .tag { border: 1px solid #ddd; background: none; }
        }
      </style>
      <main>
        <header>
          <h1>${basics.name}</h1>
          <div class="subtitle">${basics.label}</div>
          <div class="summary">${basics.summary}</div>
        </header>

        <div class="left-column">
          <section>
            <h2>Experience</h2>
            ${work.map(job => `
              <div class="job">
                <div class="job-header">
                  <span class="job-title">${job.position}</span>
                  <span class="date">${job.startDate} — ${job.endDate}</span>
                </div>
                <div class="company">${job.company}</div>
                <div class="location">${job.location}</div>
                <div class="description">${job.description}</div>
              </div>
            `).join('')}
          </section>

          <section>
            <h2>Education</h2>
            ${education.map(edu => `
              <div class="edu-item">
                <div class="edu-header">
                  <span class="job-title">${edu.institution}</span>
                  <span class="date">${edu.startDate} — ${edu.endDate}</span>
                </div>
                <div>${edu.studyType} in ${edu.area}</div>
              </div>
            `).join('')}
          </section>
        </div>

        <aside>
          <section class="contact-info">
            <h2>Contact</h2>
            <div>📧 <a href="mailto:${basics.email}">${basics.email}</a></div>
            <div>📱 ${basics.phone}</div>
            <div>📍 ${basics.address.city}, ${basics.address.region}</div>
          </section>

          <section>
            <h2>Expertise</h2>
            <div class="tag-container">
              ${expertise.map(item => `<span class="tag">${item}</span>`).join('')}
            </div>
          </section>

          <section>
            <h2>Skills</h2>
            <div class="tag-container">
              ${skills.map(skill => `<span class="tag">${skill}</span>`).join('')}
            </div>
          </section>

          <section>
            <h2>Awards</h2>
            ${awards.map(award => `
              <div class="award-item">
                <span class="award-title">${award.title} (${award.date})</span>
                <div>${award.description}</div>
              </div>
            `).join('')}
          </section>

          <section>
            <h2>Patents</h2>
            ${patents.map(patent => `
              <div class="patent-item">
                <a href="${patent.url}" target="_blank" class="patent-link">${patent.number}</a>
                <span class="patent-title">${patent.title}</span>
              </div>
            `).join('')}
          </section>
        </aside>
      </main>
    `;
  }
}

customElements.define('resume-component', ResumeComponent);