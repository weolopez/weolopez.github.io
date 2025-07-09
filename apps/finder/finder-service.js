export class FinderService {
    constructor() {
        this.fileSystem = this.initializeFileSystem();
    }

    initializeFileSystem() {
        return {
            '/': {
                name: 'Home',
                type: 'folder',
                path: '/',
                children: ['Desktop']
            },
            '/Desktop': {
                name: 'Desktop',
                type: 'folder',
                path: '/Desktop',
                children: [
                    { id: 'finder', name: 'Finder', icon: '📁', sourceUrl: 'https://weolopez.com/apps/finder/finder-webapp.js', tag: "finder-webapp", onstartup: false  },
                    { id: 'chat', name: 'Chat', icon: '💬', sourceUrl: '/chat/chat-component.js', tag: "chat-component", onstartup: false },
                    { id: 'notification', name: 'Notification', icon: '🔔', sourceUrl: '/apps/notification/notification-display-component.js', tag:"notification-display-component", onstartup: true }
                ]
            },
            '/Desktop/Config': {
                name: 'Config',
                type: 'folder',
                path: '/Desktop/Config',
                children: [
                    { id: 'finder', name: 'Finder', icon: '📁', sourceUrl: 'https://weolopez.com/apps/finder/finder-webapp.js', tag: "finder-webapp", onstartup: false  },
                    { id: 'chat', name: 'Chat', icon: '💬', sourceUrl: '/chat/chat-component.js', tag: "chat-component", onstartup: false },
                    { id: 'notification', name: 'Notification', icon: '🔔', sourceUrl: '/apps/notification/notification-display-component.js', tag:"notification-display-component", onstartup: true }
                ]
            },
            '/Desktop/Config/index.html': {
                name: 'index.html',
                type: 'file',
                path: '/Desktop/Config/index.html',
                size: 2048,
                modified: new Date('2024-01-15'),
                url: 'https://example.com/project/index.html'
            },
            '/Desktop/Config/style.css': {
                name: 'style.css',
                type: 'file',
                path: '/Desktop/Config/style.css',
                size: 1024,
                modified: new Date('2024-01-14')
            },
            '/Desktop/Config/script.js': {
                name: 'script.js',
                type: 'file',
                path: '/Desktop/Config/script.js',
                size: 3072,
                modified: new Date('2024-01-16')
            },
            '/Desktop/Notes.txt': {
                name: 'Notes.txt',
                type: 'file',
                path: '/Desktop/Notes.txt',
                size: 512,
                modified: new Date('2024-01-10')
            },
            '/Desktop/Screenshot.png': {
                name: 'Screenshot.png',
                type: 'file',
                path: '/Desktop/Screenshot.png',
                size: 204800,
                modified: new Date('2024-01-12')
            }
        };
    }

    async getDirectoryContents(path) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const directory = this.fileSystem[path];
                
                if (!directory) {
                    reject(new Error(`Directory not found: ${path}`));
                    return;
                }

                if (directory.type !== 'folder') {
                    reject(new Error(`Path is not a directory: ${path}`));
                    return;
                }

                const contents = directory.children.map(childName => {
                    let child
                    if (typeof childName === 'object') {
                        childName = childName.name; // Handle case where children are objects
                        const childPath = path ;
                        child = this.fileSystem[childPath];
                        child = child.children.filter(c => c.name === childName);
                        child = child.length > 0 ? child[0] : null;
                        //default child.type to 'file' if not specified
                        child.type = child.type || 'file';
                        child.path = child.path || `${path}/${childName}`;
                    } else {

                        const childPath = path === '/' ? `/${childName}` : `${path}/${childName}`;
                        child = this.fileSystem[childPath];
                    }

                    
                    return {
                        name: child.name,
                        type: child.type,
                        path: child.path,
                        size: child.size || 0,
                        modified: child.modified || new Date(),
                        ...child 
                    };
                });

                resolve(contents);
            }, 100); // Simulate network delay
        });
    }

    async searchFiles(query, basePath = '/') {
        return new Promise((resolve) => {
            setTimeout(() => {
                const results = [];
                const searchTerm = query.toLowerCase();
                
                Object.values(this.fileSystem).forEach(item => {
                    if (item.name.toLowerCase().includes(searchTerm) && 
                        item.path.startsWith(basePath)) {
                        results.push({
                            name: item.name,
                            type: item.type,
                            path: item.path,
                            size: item.size || 0,
                            modified: item.modified || new Date()
                        });
                    }
                });
                
                resolve(results);
            }, 200);
        });
    }

    async createFolder(parentPath, name) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const newPath = parentPath === '/' ? `/${name}` : `${parentPath}/${name}`;
                
                if (this.fileSystem[newPath]) {
                    reject(new Error(`Item already exists: ${name}`));
                    return;
                }

                this.fileSystem[newPath] = {
                    name: name,
                    type: 'folder',
                    path: newPath,
                    children: []
                };

                const parent = this.fileSystem[parentPath];
                if (parent && parent.children) {
                    parent.children.push(name);
                }

                resolve(this.fileSystem[newPath]);
            }, 100);
        });
    }

    async deleteItem(path) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const item = this.fileSystem[path];
                if (!item) {
                    reject(new Error(`Item not found: ${path}`));
                    return;
                }

                // Remove from parent's children array
                const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
                const parent = this.fileSystem[parentPath];
                if (parent && parent.children) {
                    const index = parent.children.indexOf(item.name);
                    if (index > -1) {
                        parent.children.splice(index, 1);
                    }
                }

                // If it's a folder, recursively delete children
                if (item.type === 'folder' && item.children) {
                    item.children.forEach(childName => {
                        const childPath = path === '/' ? `/${childName}` : `${path}/${childName}`;
                        delete this.fileSystem[childPath];
                    });
                }

                delete this.fileSystem[path];
                resolve();
            }, 100);
        });
    }

    async renameItem(path, newName) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const item = this.fileSystem[path];
                if (!item) {
                    reject(new Error(`Item not found: ${path}`));
                    return;
                }

                const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
                const newPath = parentPath === '/' ? `/${newName}` : `${parentPath}/${newName}`;

                if (this.fileSystem[newPath]) {
                    reject(new Error(`Item already exists: ${newName}`));
                    return;
                }

                // Update the item
                item.name = newName;
                item.path = newPath;

                // Move in filesystem
                this.fileSystem[newPath] = item;
                delete this.fileSystem[path];

                // Update parent's children array
                const parent = this.fileSystem[parentPath];
                if (parent && parent.children) {
                    const index = parent.children.findIndex(name => 
                        (parentPath === '/' ? `/${name}` : `${parentPath}/${name}`) === path
                    );
                    if (index > -1) {
                        parent.children[index] = newName;
                    }
                }

                resolve(item);
            }, 100);
        });
    }

    async getItemInfo(path) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const item = this.fileSystem[path];
                if (!item) {
                    reject(new Error(`Item not found: ${path}`));
                    return;
                }

                resolve({
                    name: item.name,
                    type: item.type,
                    path: item.path,
                    size: item.size || 0,
                    modified: item.modified || new Date(),
                    created: item.created || new Date(),
                    permissions: item.permissions || 'read-write',
                    url: item.url || ''
                });
            }, 50);
        });
    }

    async updateItemUrl(path, newUrl) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const item = this.fileSystem[path];
                if (!item) {
                    reject(new Error(`Item not found: ${path}`));
                    return;
                }
                item.url = newUrl;
                resolve(item);
            }, 100);
        });
    }

    async duplicateItem(path, newName) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const item = this.fileSystem[path];
                if (!item) {
                    reject(new Error(`Item not found: ${path}`));
                    return;
                }

                const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
                const newPath = parentPath === '/' ? `/${newName}` : `${parentPath}/${newName}`;

                if (this.fileSystem[newPath]) {
                    reject(new Error(`Item already exists: ${newName}`));
                    return;
                }

                // Create duplicate item
                const duplicateItem = {
                    name: newName,
                    type: item.type,
                    path: newPath,
                    size: item.size || 0,
                    modified: new Date(),
                    created: new Date(),
                    permissions: item.permissions || 'read-write'
                };

                if (item.type === 'folder') {
                    duplicateItem.children = [];
                    
                    // Recursively duplicate children
                    if (item.children && item.children.length > 0) {
                        item.children.forEach(childName => {
                            const childPath = path === '/' ? `/${childName}` : `${path}/${childName}`;
                            const newChildPath = newPath === '/' ? `/${childName}` : `${newPath}/${childName}`;
                            const childItem = this.fileSystem[childPath];
                            
                            if (childItem) {
                                const duplicateChild = {
                                    name: childItem.name,
                                    type: childItem.type,
                                    path: newChildPath,
                                    size: childItem.size || 0,
                                    modified: new Date(),
                                    created: new Date(),
                                    permissions: childItem.permissions || 'read-write'
                                };
                                
                                if (childItem.type === 'folder') {
                                    duplicateChild.children = childItem.children ? [...childItem.children] : [];
                                }
                                
                                this.fileSystem[newChildPath] = duplicateChild;
                                duplicateItem.children.push(childName);
                            }
                        });
                    }
                }

                this.fileSystem[newPath] = duplicateItem;

                // Add to parent's children array
                const parent = this.fileSystem[parentPath];
                if (parent && parent.children) {
                    parent.children.push(newName);
                }

                resolve(duplicateItem);
            }, 150);
        });
    }

    async moveItem(fromPath, toPath) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const item = this.fileSystem[fromPath];
                if (!item) {
                    reject(new Error(`Item not found: ${fromPath}`));
                    return;
                }

                if (this.fileSystem[toPath]) {
                    reject(new Error(`Destination already exists: ${toPath}`));
                    return;
                }

                // Remove from old parent
                const oldParentPath = fromPath.substring(0, fromPath.lastIndexOf('/')) || '/';
                const oldParent = this.fileSystem[oldParentPath];
                if (oldParent && oldParent.children) {
                    const index = oldParent.children.indexOf(item.name);
                    if (index > -1) {
                        oldParent.children.splice(index, 1);
                    }
                }

                // Update item path and name
                const newName = toPath.split('/').pop();
                item.name = newName;
                item.path = toPath;

                // Move in filesystem
                this.fileSystem[toPath] = item;
                delete this.fileSystem[fromPath];

                // Add to new parent
                const newParentPath = toPath.substring(0, toPath.lastIndexOf('/')) || '/';
                const newParent = this.fileSystem[newParentPath];
                if (newParent && newParent.children) {
                    newParent.children.push(newName);
                }

                // Update children paths if it's a folder
                if (item.type === 'folder' && item.children) {
                    this.updateChildrenPaths(fromPath, toPath);
                }

                resolve(item);
            }, 100);
        });
    }

    updateChildrenPaths(oldBasePath, newBasePath) {
        Object.keys(this.fileSystem).forEach(path => {
            if (path.startsWith(oldBasePath + '/')) {
                const relativePath = path.substring(oldBasePath.length);
                const newPath = newBasePath + relativePath;
                
                const item = this.fileSystem[path];
                item.path = newPath;
                
                this.fileSystem[newPath] = item;
                delete this.fileSystem[path];
            }
        });
    }

    async createFile(parentPath, name, content = '') {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const newPath = parentPath === '/' ? `/${name}` : `${parentPath}/${name}`;
                
                if (this.fileSystem[newPath]) {
                    reject(new Error(`File already exists: ${name}`));
                    return;
                }

                const newFile = {
                    name: name,
                    type: 'file',
                    path: newPath,
                    size: content.length,
                    modified: new Date(),
                    created: new Date(),
                    permissions: 'read-write',
                    content: content
                };

                this.fileSystem[newPath] = newFile;

                const parent = this.fileSystem[parentPath];
                if (parent && parent.children) {
                    parent.children.push(name);
                }

                resolve(newFile);
            }, 100);
        });
    }
}