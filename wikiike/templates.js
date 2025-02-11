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
