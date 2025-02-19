import BasePage from './page-template.js';
import '../wikiike/wc/card-section.js';
class SomberReptilePage extends BasePage {
  // Override the lifecycle hook if additional mount logic is needed.
  componentDidMount() {
    super.componentDidMount();
    console.log('SomberReptilePage mounted.');
    // Additional mount logic can go here.
    document.addEventListener('EDIT', (e) => {
      this.edit(e.detail) 
    });
  }

  // Override the html() method to create a fancy modern marketing page.
  html() {
    return /*html*/`
      <section class="hero">
        <div class="content">
          <h1>Welcome to Somber Reptile</h1>
          <p>
            Explore a world of sleek design and modern aesthetics. Our exclusive collection
            redefines elegance in the modern age.
          </p>
          <button class="cta-btn">Discover More</button>
        </div>
      </section>
      <section class="features">
        <!--div class="feature">
        </div-->
        <card-section>
        <h2>Innovative Design</h2>
        <p>Experience cutting-edge visuals and an intuitive interface.</p>
      </card-section>
      <card-section>
        <h2>Modern Aesthetics</h2>
        <p>Clean lines, bold typography, and a dynamic layout set us apart.</p>
      </card-section>
      <card-section>
        <h2>Responsive Experience</h2>
        <p>Optimized for all devices, ensuring a seamless user journey.</p>
      </card-section>
        <card-section>
          <h2>Innovative Design</h2>
          <p>Experience cutting-edge visuals and an intuitive interface.</p>
        </card-section>
        <card-section>
          <h2>Modern Aesthetics</h2>
          <p>Clean lines, bold typography, and a dynamic layout set us apart.</p>
        </card-section>
        <card-section>
          <h2>Responsive Experience</h2>
          <p>Optimized for all devices, ensuring a seamless user journey.</p>
        </card-section>
      </section>
    `;
  }

  // Override render to include custom styles alongside inherited ones.
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #333;
          line-height: 1.6;
        }
        .hero {
          background: linear-gradient(135deg, #1e1e1e, #3a3a3a);
          color: #fff;
          padding: 4rem 2rem;
          text-align: center;
        }
        .hero .content {
          max-width: 800px;
          margin: 0 auto;
        }
        .cta-btn {
          margin-top: 1.5rem;
          padding: 0.75rem 1.5rem;
          background-color: #ff4500;
          border: none;
          color: #fff;
          font-size: 1rem;
          cursor: pointer;
          border-radius: 4px;
          transition: background-color 0.3s ease;
        }
        .cta-btn:hover {
          background-color: #e03e00;
        }
        .features {
          flex: 1;
          display: flex;
          flex-wrap: wrap; 
          justify-content: space-around;
          background: #f9f9f9;
          width: 100vw;
          overflow-y: scroll;
          padding: 0;
          margin: 0;
        }
        card-section {
          flex: 1;
          margin: 0 1rem;
          padding: 1rem;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }
        @media (max-width: 768px) {
          .features {
            flex-direction: column;
            align-items: center;
          }
          .feature {
            margin-bottom: 1.5rem;
            width: 80%;
          }
        }
        .page-container {
              display: flex;
              flex-direction: column;
              height: 100vh;
              width: 100%;
              max-width: 100%;
        }
      </style>
      <div class="page-container">
        ${this.html()}
      </div>
    `;
  }
}

customElements.define('wiki_ike-page', SomberReptilePage);
export default SomberReptilePage;