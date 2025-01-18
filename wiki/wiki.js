
    // Dummy execute function for demonstration
async function execute(command) {
    console.log("Executing command:", command);
     // Add your command execution logic here
     return await getOpenAIResponse("you are a copy editor", command)
}



// Show home page
function showHome() {
    document.getElementById('content').innerHTML = '<h2>Welcome to Browser Wiki</h2><p>Select an action from the navigation bar above.</p>';
    document.getElementById('editor').style.display = 'none';
    document.getElementById('pageList').style.display = 'none';
}

// Show all pages
function showAllPages() {
    const request = db.getAll('pages');

    request.onerror = event => showMessage("Error fetching pages", "error");
    request.onsuccess = event => {
        const pages = event.target.result;
        const list = document.getElementById('pageList');
        list.innerHTML = '<h2>All Pages</h2>';
        if (pages.length === 0) {
            list.innerHTML += '<p>No pages found.</p>';
        } else {
            const ul = document.createElement('ul');
            pages.forEach(page => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = '#'+encodeURIComponent(page.title);
                a.textContent = page.title;
                a.onclick = () => viewPage(page.title);
                li.appendChild(a);
                ul.appendChild(li);
            });
            list.appendChild(ul);
        }
        list.style.display = 'block';
        document.getElementById('editor').style.display = 'none';
        document.getElementById('content').innerHTML = '';
    };
}

// Show create page form
function showCreatePage() {
    document.getElementById('pageTitle').value = '';
    document.getElementById('pageContent').value = '';
    document.getElementById('editor').style.display = 'block';
    document.getElementById('pageList').style.display = 'none';
    document.getElementById('content').innerHTML = '';
    document.getElementById('saveButton').style.display = 'block';
    document.getElementById('editButton').style.display = 'none';
}

// Save page
async function savePage() {
    const title = document.getElementById('pageTitle').value.trim();
    const content = document.getElementById('pageContent').value.trim();
    
    if (!title || !content) {
        showMessage("Title and content are required", "error");
        return;
    }

    // Check for command in content
    const commandPattern = /\[(.*?)\]/;
    const commandMatch = content.match(commandPattern);
    if (commandMatch) {
        const command = commandMatch[1].trim();
        const result = await execute(command);
        content = content.replace(commandPattern, `<prompt type="text" value="${command}>${result}</prompt>`);
    }

    const request = db.save('pages', title, content);
    request.onerror = event => showMessage("Error saving page", "error");
    request.onsuccess = event => {
        showMessage("Page saved successfully", "success");
        viewPage(title);
    };
}

// View page
function viewPage(title) {
    const request = db.get('pages', title);

    request.onerror = event => showMessage("Error fetching page", "error");
    request.onsuccess = event => {
        const page = event.target.result;
        if (page) {
            document.getElementById('content').innerHTML = `
                <h2>${page.title}</h2>
                <div>${page.content}</div>
            `;
        } else {
            document.getElementById('content').innerHTML = `<p>Page not found.</p>`;
        }
        document.getElementById('editor').style.display = 'none';
        document.getElementById('saveButton').style.display = 'none';
        document.getElementById('editButton').style.display = 'block';
        document.getElementById('pageList').style.display = 'none';
    };
}

// Edit page
function editPage(title) {
    if (!title) {
        title = window.location.hash.substring(1);
        title = decodeURIComponent(title);
    }
    const request = db.get('pages', title);

    request.onerror = event => showMessage("Error fetching page", "error");
    request.onsuccess = event => {
        const page = event.target.result;
        if (page) {
            document.getElementById('pageTitle').value = page.title;
            document.getElementById('pageContent').value = page.content;
            document.getElementById('content').innerHTML = '';
            document.getElementById('pageList').style.display = 'none';
            document.getElementById('saveButton').style.display = 'block';
            document.getElementById('editButton').style.display = 'none';
            document.getElementById('editor').style.display = 'block';
        } else {
            showMessage("Page not found", "error");
        }
    };
}

// Show message
function showMessage(message, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.className = type;
    setTimeout(() => {
        messageDiv.textContent = '';
        messageDiv.className = '';
    }, 3000);
}

// Initialize the application
const db = new Database( 'WikiDB', ["pages", "images", "texts"]);

// Get page title from URL hash and view page
window.addEventListener('hashchange', () => {
    let hash = window.location.hash.substring(1);
    hash = decodeURIComponent(hash);
    if (hash) {
    viewPage(hash);
    } else {
    showHome();
    }
});

// Check initial hash on page load
window.addEventListener('load', () => {
    let hash = window.location.hash.substring(1);
    hash = decodeURIComponent(hash);
    if (hash) {
    viewPage(hash);
    } else {
    showHome();
    }
});