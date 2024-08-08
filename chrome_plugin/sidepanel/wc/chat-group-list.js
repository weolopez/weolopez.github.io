// <script src="https://unpkg.com/dexie/dist/dexie.js"></script>
// import Dexie from 'dexie';

class ChatGroupList extends HTMLElement {
    constructor() {
        super();
        this.db = DB
        this.attachShadow({
            mode: 'open'
        });
        this.shadowRoot.innerHTML = /*html*/ `
        <style>
            :host {
                display: flex;
            }
        
            .groups {
                list-style: none;
                padding: 20px;
                display: flex;
                flex-direction: column;
                overflow-y: auto;
                flex-grow: 1;
            }
        
            .group {
                display: flex;
                align-items: center;
                padding: 10px;
                border-bottom: 1px solid #ccc;
                cursor: pointer;
            }
        
            .group img {
                border-radius: 50%;
                width: 40px;
                height: 40px;
                margin-right: 10px;
            }
        
            .group .details {
                flex-grow: 1;
            }
        
            .group .details .title {
                font-weight: bold;
            }
        
            .group .details .description {
                color: #666;
            }
        
            .delete-button {
                background-color: red;
                color: white;
                border: none;
                width: 15px;
                height: 15px;
                border-radius: 50%;
                cursor: pointer;
                position: absolute;
                right: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                line-height: 1;
                padding: 0;
            }
        </style>
        
        <ul class="groups"></ul>
        `;
        //listen to document.dispatchEvent(new CustomEvent('DB_UPDATED', {detail: {type: type, entity: entity}})); and if it is a groups type call this.render
        document.addEventListener('DB_UPDATED', (event) => {
            if (event.detail.type === 'groups') this.render()
        })
    }
    async connectedCallback() {
        if (this.db.groups === undefined) await this.db.load('groups')
        this.render();
    }

    render() {
        const groupsContainer = this.shadowRoot.querySelector('.groups');
        groupsContainer.innerHTML = '';
        this.groups.forEach((group, index) => {
            const groupElement = document.createElement('div');
            groupElement.classList.add('group');
            groupElement.innerHTML = `
<img src="${group.image}" alt="${group.title}">
<div class="details">
    <div class="title">${group.title}</div>
    <div class="description">${group.description} ${group.id}</div>
</div>
<button class="delete-button">x</button>
`;

            groupElement.querySelector('.delete-button').addEventListener('click', (event) => {
                event.stopPropagation();
                this.delete(group);
            });
            groupElement.addEventListener('click', () => this.onGroupClick(group, index));
            groupsContainer.appendChild(groupElement);
        });
    }

    get groups() {
        return (this.db.groups) ? this.db.groups : [];
    }

    set groups(value) {
        this.db.groups = value;
        this.render();
    }

    async add(group) {
        let id = await this.db.add(group)
        group.id = id;
        this.render();
        return group
    }

    async update(newGroup) {
        await this.db.update(newGroup)
        // this.groups = this.groups.map((group, i) => i === newGroup.id ? newGroup : group);
        this.render();
    }

    async delete(group) {
        // console.log('delete', group);
        await this.db.delete(group)
        //remove the group from the array by id
        // this.groups = this.groups.filter(g => g.id !== group.id);
        this.render();
    }

    onGroupClick(group, index) {
        const event = new CustomEvent('group-click', {
            detail: {
                group
            }
        });
        this.dispatchEvent(event);
    }

}

customElements.define('chat-group-list', ChatGroupList);