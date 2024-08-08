// Define the ChatBubble web component
class ChatBubble extends HTMLElement {
    constructor() {
        super();

        this.db = DB

        this.shadow = this.attachShadow({
            mode: 'open'
        });
        const style = document.createElement('style');
        style.textContent = /*css*/ `
    :host {
        display: flex;
        flex-direction: column;
    }
    #chats {
        list-style: none;
        padding: 20px;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        flex-grow: 1;
    }

    .message {
        margin-bottom: 15px;
        padding: 10px;
        border-radius: 20px;
        color: #333;
        max-width: 100%;
        display: inline-block;
        /* Adjust width to fit content */
    }

    .other-message {
        background: #e9e9eb;
        align-self: flex-start;
    }

    .my-message {
        background: #007bff;
        color: #fff;
        align-self: flex-end;
        text-align: right;
        /* Right justify the text */
        align-self: flex-end;
        /* Align the bubble to the right */
        margin-left: auto;
        /* Push the bubble to the right */
    }
`;
        this.shadow.appendChild(style);
        this.chats = document.createElement('ul');
        // set id = chats
        this.chats.id = 'chats';
        this.shadow.appendChild(this.chats);
    }
    title = ''
    description = ''
    updateGroupTitle(text, type) {
        if (text === undefined || type === undefined || text==='' || type === '') return
        this[type] += text
        // Clear any existing timeout to ensure only one update happens after 10 seconds
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }

        // Set a new timeout to update the group title after 10 seconds
        this.updateTimeout = setTimeout(() => {
            this.group.title = this.title.slice(0, 25)
            this.group.description = this.description.slice(0, 125)
            this.db.update(this.group);
            // Reset title and timeout after updating
            this.title = '';
            this.description = '';
            this.updateTimeout = null;

        }, 1000);
    }

    add(isUser, text) {
        // this.appendMessage(isUser,text)

        let m = {
            type: 'chats',
            parent: this.group,
            isUser: isUser,
            text: text
        }
        this.db.add(m)
        this.updateGroupTitle()
        //respond with only this template: { "summary": {"title": <title>,"description":<description>}}
        lamma3(`${this.chats.innerHTML} Respond in plain text with only 3-4 word title for the above chat`, "UPDATE_GROUP_TITLE") 
        lamma3(`${this.chats.innerHTML} Respond in plain text with only 1 sentence description for the above chat`, "UPDATE_GROUP_DESCRIPTION") 
    }
    
    appendMessage(isUser, text) {
        const message = document.createElement('li');
        const mdBlock = document.createElement('div');
        message.appendChild(mdBlock);

        message.className = 'message ' + (isUser ? 'my-message' : 'other-message');
        mdBlock.innerHTML = text;

        this.chats.appendChild(message);

        return mdBlock;
    }
    async setChats(group) {
        this.group = group;
        // Clear the existing messages
        this.chats.innerHTML = '';
        // Add the new messages
        let chats = await this.db.db.chats.where('parent.id').equals(group.id).toArray();
        if (chats)
            chats.forEach(message => {
                this.appendMessage(message.isUser, message.text);
            });
    }


}

// Register the new element
customElements.define('chat-bubble', ChatBubble);