export const templates = {
  page: {
    blank: "<p>Start your content here...</p>",
    simple: `
            <h1>Title</h1>
            <p>Write your introduction here...</p>
            <section contenteditable="true">
              <h2>Section Title</h2>
              <p>Section content...</p>
            </section>
          `,
    twoColumn: `
            <div style="display: flex; gap:10px;">
              <div style="flex: 1; padding: 10px; border-right: 1px solid #ccc;" contenteditable="true">
                <h2>Column 1</h2>
                <p>Content for column 1...</p>
              </div>
              <div style="flex: 1; padding: 10px;" contenteditable="true">
                <h2>Column 2</h2>
                <p>Content for column 2...</p>
              </div>
            </div>
          `,
    fancy: /*html*/ `
      <style>
        :host {
          display: block;
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
          display: flex;
          justify-content: space-around;
          padding: 2rem;
          background: #f9f9f9;
        }
        .feature {
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
      </style>
      <section class="hero">
        <div class="content">
          <h1>[Title]</h1>
          <p>
            Explore a world of sleek design and modern aesthetics. Our exclusive collection
            redefines elegance in the modern age.
          </p>
        </div>
      </section>
      <section class="features">
        <div class="feature">
          <h2>Innovative Design</h2>
          <p>Experience cutting-edge visuals and an intuitive interface.</p>
        </div>
        <div class="feature">
          <h2>Modern Aesthetics</h2>
          <p>Clean lines, bold typography, and a dynamic layout set us apart.</p>
        </div>
        <div class="feature">
          <h2>Responsive Experience</h2>
          <p>Optimized for all devices, ensuring a seamless user journey.</p>
        </div>
      </section>`,
  },
  section: {
    simple: "<h2>Section Title</h2><p>Section content...</p>",
    twoColumn: `
            <div style="display: flex; gap:10px;">
              <div style="flex: 1; padding: 10px; border-right: 1px solid #ccc;" contenteditable="true">
                <p>Column 1 content...</p>
              </div>
              <div style="flex: 1; padding: 10px;" contenteditable="true">
                <p>Column 2 content...</p>
              </div>
            </div>
          `,
    imageSection:
      '<h2>Image Section</h2><img src="https://via.placeholder.com/150" alt="Placeholder" style="max-width:100%;" />',
  },
};
