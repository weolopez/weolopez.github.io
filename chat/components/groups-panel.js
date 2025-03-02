import { joinRoom } from 'https://esm.run/trystero@0.20.1';

// Define the GroupsPanel web component
export class GroupsPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // State
    this._groups = [];
    this._activeGroup = '';
    this._room = null;
    this._peers = {};
    
    // Bound methods
    this._handleGroupClick = this._handleGroupClick.bind(this);
    this._handlePeerJoin = this._handlePeerJoin.bind(this);
    this._handlePeerLeave = this._handlePeerLeave.bind(this);
  }

  static get observedAttributes() {
    return ['groups', 'active-group'];
  }

  connectedCallback() {
    this._initStyles();
    this._updateGroups();
    this._setupTrystero();
  }

  disconnectedCallback() {
    // Cleanup event listeners
    const groupItems = this.shadowRoot.querySelectorAll('.group-item');
    groupItems.forEach(item => {
      item.removeEventListener('click', this._handleGroupClick);
    });
    
    // Disconnect from Trystero room if connected
    if (this._room) {
      // Trystero doesn't have a built-in disconnect method, but we can cleanup our listeners
      this._room = null;
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'groups' && oldValue !== newValue) {
      try {
        this._groups = JSON.parse(newValue);
        this._updateGroups();
      } catch (e) {
        console.error('Invalid groups JSON:', e);
      }
    }
    
    if (name === 'active-group' && oldValue !== newValue) {
      this._activeGroup = newValue;
      this._updateActiveGroup();
    }
  }

  _initStyles() {
    this.shadowRoot.innerHTML = `
      <style>
        .groups-panel {
          background-color: var(--panel-bg, #ffffff);
          border-radius: var(--border-radius, 8px);
          border: 1px solid var(--panel-border, #e5e7eb);
          overflow: hidden;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .panel-header {
          padding: 1.25rem;
          border-bottom: 1px solid var(--panel-border, #e5e7eb);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .panel-title {
          font-weight: 600;
          font-size: 1.125rem;
          color: var(--text-color, #1f2937);
        }
        
        .online-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.875rem;
          color: var(--text-light, #6b7280);
        }
        
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #10b981;
        }
        
        .groups-list {
          flex: 1;
          overflow-y: auto;
          padding: 0.75rem;
        }
        
        .group-item {
          padding: 0.75rem;
          border-radius: var(--border-radius, 8px);
          margin-bottom: 0.5rem;
          cursor: pointer;
          transition: background-color var(--transition-speed, 0.2s);
          animation: fade-in 0.3s ease-out;
          display: flex;
          justify-content: space-between;
        }
        
        .group-item:hover {
          background-color: var(--item-hover, #f9fafb);
        }
        
        .group-item.active {
          background-color: var(--selection, #e0e7ff);
        }
        
        .group-item:last-child {
          margin-bottom: 0;
        }
        
        .group-info {
          flex: 1;
        }
        
        .group-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.25rem;
        }
        
        .group-name {
          font-weight: 500;
          font-size: 0.9375rem;
        }
        
        .unread-badge {
          background-color: var(--primary-color, #6366f1);
          color: white;
          font-size: 0.75rem;
          font-weight: 500;
          padding: 0.125rem 0.5rem;
          border-radius: 9999px;
          opacity: 0;
          transition: opacity var(--transition-speed, 0.2s);
        }
        
        .unread-badge.show {
          opacity: 1;
        }
        
        .group-description {
          font-size: 0.8125rem;
          color: var(--text-light, #6b7280);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .members-count {
          font-size: 0.75rem;
          color: var(--text-light, #6b7280);
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .members-icon {
          width: 14px;
          height: 14px;
          fill: var(--text-light, #6b7280);
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
          }
        }
        
        .active-pulse {
          animation: pulse 0.5s ease-in-out;
        }
      </style>
      
      <div class="groups-panel">
        <div class="panel-header">
          <div class="panel-title">Groups</div>
          <div class="online-indicator">
            <div class="status-dot"></div>
            <span class="peer-count">Connecting...</span>
          </div>
        </div>
        
        <div class="groups-list"></div>
      </div>
    `;
  }

  _updateGroups() {
    if (!this.shadowRoot) return;
    
    const groupsList = this.shadowRoot.querySelector('.groups-list');
    if (!groupsList) return;
    
    // Clear existing groups
    groupsList.innerHTML = '';
    
    // Add groups
    this._groups.forEach(group => {
      const groupItem = document.createElement('div');
      groupItem.className = 'group-item';
      groupItem.dataset.id = group.id;
      
      // Set active class if this is the active group
      if (group.id === this._activeGroup) {
        groupItem.classList.add('active');
      }
      
      groupItem.innerHTML = `
        <div class="group-info">
          <div class="group-header">
            <span class="group-name">${group.name}</span>
            <span class="unread-badge ${group.unread > 0 ? 'show' : ''}">${group.unread}</span>
          </div>
          <div class="group-description">${group.description}</div>
        </div>
        <div class="members-count">
          <svg class="members-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"></path>
          </svg>
          <span>${group.members}</span>
        </div>
      `;
      
      // Add click event listener
      groupItem.addEventListener('click', this._handleGroupClick);
      
      groupsList.appendChild(groupItem);
    });
  }

  _updateActiveGroup() {
    const groupItems = this.shadowRoot.querySelectorAll('.group-item');
    groupItems.forEach(item => {
      if (item.dataset.id === this._activeGroup) {
        item.classList.add('active', 'active-pulse');
        
        // Remove pulse animation after it completes
        setTimeout(() => {
          item.classList.remove('active-pulse');
        }, 500);
      } else {
        item.classList.remove('active');
      }
    });
    
    // Dispatch event
    this.dispatchEvent(new CustomEvent('group-changed', {
      detail: { groupId: this._activeGroup },
      bubbles: true,
      composed: true
    }));
  }

  _handleGroupClick(event) {
    const groupItem = event.currentTarget;
    const groupId = groupItem.dataset.id;
    
    // Update active group
    this._activeGroup = groupId;
    this.setAttribute('active-group', groupId);
    
    // Update active class visually
    this._updateActiveGroup();
    
    // If this group has unread messages, clear them
    this._clearUnreadCount(groupId);
  }
  
  _clearUnreadCount(groupId) {
    // Update our internal data
    this._groups = this._groups.map(group => {
      if (group.id === groupId) {
        return { ...group, unread: 0 };
      }
      return group;
    });
    
    // Update the UI
    const groupItem = this.shadowRoot.querySelector(`.group-item[data-id="${groupId}"]`);
    if (groupItem) {
      const unreadBadge = groupItem.querySelector('.unread-badge');
      if (unreadBadge) {
        unreadBadge.classList.remove('show');
        unreadBadge.textContent = '0';
      }
    }
  }

  _setupTrystero() {
    try {
      // Initialize Trystero room with torrent strategy for better reliability
      const config = { 
        appId: 'messaging-components-demo',
        // Force torrent strategy which is more reliable for demos
        rtcConfig: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      };
      
      this._room = joinRoom(config, 'groups-panel');
      
      // Listen for peers joining and leaving
      this._room.onPeerJoin(this._handlePeerJoin);
      this._room.onPeerLeave(this._handlePeerLeave);
      
      // Update peer count
      this._updatePeerCount();
      
      // Update status to show we're online
      const peerCount = this.shadowRoot.querySelector('.peer-count');
      if (peerCount) {
        peerCount.textContent = 'Connected';
      }
      
    } catch (error) {
      console.error('Failed to initialize Trystero:', error);
      
      // Update status to show we're offline
      const peerCount = this.shadowRoot.querySelector('.peer-count');
      if (peerCount) {
        peerCount.textContent = 'Offline';
      }
      
      const statusDot = this.shadowRoot.querySelector('.status-dot');
      if (statusDot) {
        statusDot.style.backgroundColor = '#ef4444';
      }
    }
  }

  _handlePeerJoin(peerId) {
    this._peers[peerId] = true;
    this._updatePeerCount();
  }

  _handlePeerLeave(peerId) {
    delete this._peers[peerId];
    this._updatePeerCount();
  }

  _updatePeerCount() {
    const count = Object.keys(this._peers).length;
    const peerCount = this.shadowRoot.querySelector('.peer-count');
    if (peerCount) {
      peerCount.textContent = count === 1 ? '1 peer online' : `${count} peers online`;
    }
  }
  
  // Public API for updating groups
  addGroup(group) {
    this._groups.push(group);
    this._updateGroups();
  }
  
  removeGroup(groupId) {
    this._groups = this._groups.filter(group => group.id !== groupId);
    this._updateGroups();
  }
  
  updateGroupUnread(groupId, count) {
    this._groups = this._groups.map(group => {
      if (group.id === groupId) {
        return { ...group, unread: count };
      }
      return group;
    });
    
    // Update the UI
    const groupItem = this.shadowRoot.querySelector(`.group-item[data-id="${groupId}"]`);
    if (groupItem) {
      const unreadBadge = groupItem.querySelector('.unread-badge');
      if (unreadBadge) {
        unreadBadge.textContent = count;
        unreadBadge.classList.toggle('show', count > 0);
      }
    }
  }
}

// Register the web component
customElements.define('groups-panel', GroupsPanel);