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
                children: ['Desktop', 'Documents', 'Downloads', 'Pictures', 'Music', 'Movies']
            },
            '/Desktop': {
                name: 'Desktop',
                type: 'folder',
                path: '/Desktop',
                children: ['Project Folder', 'Notes.txt', 'Screenshot.png']
            },
            '/Desktop/Project Folder': {
                name: 'Project Folder',
                type: 'folder',
                path: '/Desktop/Project Folder',
                children: ['index.html', 'style.css', 'script.js']
            },
            '/Desktop/Project Folder/index.html': {
                name: 'index.html',
                type: 'file',
                path: '/Desktop/Project Folder/index.html',
                size: 2048,
                modified: new Date('2024-01-15'),
                url: 'https://example.com/project/index.html'
            },
            '/Desktop/Project Folder/style.css': {
                name: 'style.css',
                type: 'file',
                path: '/Desktop/Project Folder/style.css',
                size: 1024,
                modified: new Date('2024-01-14')
            },
            '/Desktop/Project Folder/script.js': {
                name: 'script.js',
                type: 'file',
                path: '/Desktop/Project Folder/script.js',
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
            },
            '/Documents': {
                name: 'Documents',
                type: 'folder',
                path: '/Documents',
                children: ['Reports', 'Presentations', 'Budget.xlsx', 'Meeting Notes.docx']
            },
            '/Documents/Reports': {
                name: 'Reports',
                type: 'folder',
                path: '/Documents/Reports',
                children: ['Q1 Report.pdf', 'Q2 Report.pdf']
            },
            '/Documents/Reports/Q1 Report.pdf': {
                name: 'Q1 Report.pdf',
                type: 'file',
                path: '/Documents/Reports/Q1 Report.pdf',
                size: 1048576,
                modified: new Date('2024-01-05')
            },
            '/Documents/Reports/Q2 Report.pdf': {
                name: 'Q2 Report.pdf',
                type: 'file',
                path: '/Documents/Reports/Q2 Report.pdf',
                size: 1048576,
                modified: new Date('2024-01-08')
            },
            '/Documents/Presentations': {
                name: 'Presentations',
                type: 'folder',
                path: '/Documents/Presentations',
                children: ['Project Demo.pptx', 'Team Meeting.pptx']
            },
            '/Documents/Presentations/Project Demo.pptx': {
                name: 'Project Demo.pptx',
                type: 'file',
                path: '/Documents/Presentations/Project Demo.pptx',
                size: 2097152,
                modified: new Date('2024-01-07')
            },
            '/Documents/Presentations/Team Meeting.pptx': {
                name: 'Team Meeting.pptx',
                type: 'file',
                path: '/Documents/Presentations/Team Meeting.pptx',
                size: 1572864,
                modified: new Date('2024-01-09')
            },
            '/Documents/Budget.xlsx': {
                name: 'Budget.xlsx',
                type: 'file',
                path: '/Documents/Budget.xlsx',
                size: 32768,
                modified: new Date('2024-01-11')
            },
            '/Documents/Meeting Notes.docx': {
                name: 'Meeting Notes.docx',
                type: 'file',
                path: '/Documents/Meeting Notes.docx',
                size: 16384,
                modified: new Date('2024-01-13')
            },
            '/Downloads': {
                name: 'Downloads',
                type: 'folder',
                path: '/Downloads',
                children: ['installer.dmg', 'document.pdf', 'archive.zip']
            },
            '/Downloads/installer.dmg': {
                name: 'installer.dmg',
                type: 'file',
                path: '/Downloads/installer.dmg',
                size: 52428800,
                modified: new Date('2024-01-01')
            },
            '/Downloads/document.pdf': {
                name: 'document.pdf',
                type: 'file',
                path: '/Downloads/document.pdf',
                size: 524288,
                modified: new Date('2024-01-02')
            },
            '/Downloads/archive.zip': {
                name: 'archive.zip',
                type: 'file',
                path: '/Downloads/archive.zip',
                size: 1048576,
                modified: new Date('2024-01-03')
            },
            '/Pictures': {
                name: 'Pictures',
                type: 'folder',
                path: '/Pictures',
                children: ['Vacation', 'Family.jpg', 'Sunset.png']
            },
            '/Pictures/Vacation': {
                name: 'Vacation',
                type: 'folder',
                path: '/Pictures/Vacation',
                children: ['Beach.jpg', 'Mountains.jpg', 'City.jpg']
            },
            '/Pictures/Vacation/Beach.jpg': {
                name: 'Beach.jpg',
                type: 'file',
                path: '/Pictures/Vacation/Beach.jpg',
                size: 2097152,
                modified: new Date('2023-12-25')
            },
            '/Pictures/Vacation/Mountains.jpg': {
                name: 'Mountains.jpg',
                type: 'file',
                path: '/Pictures/Vacation/Mountains.jpg',
                size: 3145728,
                modified: new Date('2023-12-26')
            },
            '/Pictures/Vacation/City.jpg': {
                name: 'City.jpg',
                type: 'file',
                path: '/Pictures/Vacation/City.jpg',
                size: 1572864,
                modified: new Date('2023-12-27')
            },
            '/Pictures/Family.jpg': {
                name: 'Family.jpg',
                type: 'file',
                path: '/Pictures/Family.jpg',
                size: 4194304,
                modified: new Date('2023-12-20')
            },
            '/Pictures/Sunset.png': {
                name: 'Sunset.png',
                type: 'file',
                path: '/Pictures/Sunset.png',
                size: 1048576,
                modified: new Date('2023-12-22')
            },
            '/Music': {
                name: 'Music',
                type: 'folder',
                path: '/Music',
                children: ['Playlist 1', 'Song.mp3', 'Album.mp3']
            },
            '/Music/Playlist 1': {
                name: 'Playlist 1',
                type: 'folder',
                path: '/Music/Playlist 1',
                children: ['Track 1.mp3', 'Track 2.mp3', 'Track 3.mp3']
            },
            '/Music/Playlist 1/Track 1.mp3': {
                name: 'Track 1.mp3',
                type: 'file',
                path: '/Music/Playlist 1/Track 1.mp3',
                size: 5242880,
                modified: new Date('2023-11-15')
            },
            '/Music/Playlist 1/Track 2.mp3': {
                name: 'Track 2.mp3',
                type: 'file',
                path: '/Music/Playlist 1/Track 2.mp3',
                size: 4194304,
                modified: new Date('2023-11-16')
            },
            '/Music/Playlist 1/Track 3.mp3': {
                name: 'Track 3.mp3',
                type: 'file',
                path: '/Music/Playlist 1/Track 3.mp3',
                size: 3145728,
                modified: new Date('2023-11-17')
            },
            '/Music/Song.mp3': {
                name: 'Song.mp3',
                type: 'file',
                path: '/Music/Song.mp3',
                size: 6291456,
                modified: new Date('2023-11-10')
            },
            '/Music/Album.mp3': {
                name: 'Album.mp3',
                type: 'file',
                path: '/Music/Album.mp3',
                size: 7340032,
                modified: new Date('2023-11-12')
            },
            '/Movies': {
                name: 'Movies',
                type: 'folder',
                path: '/Movies',
                children: ['Home Videos', 'Movie.mp4', 'Trailer.mov']
            },
            '/Movies/Home Videos': {
                name: 'Home Videos',
                type: 'folder',
                path: '/Movies/Home Videos',
                children: ['Birthday.mp4', 'Wedding.mov']
            },
            '/Movies/Home Videos/Birthday.mp4': {
                name: 'Birthday.mp4',
                type: 'file',
                path: '/Movies/Home Videos/Birthday.mp4',
                size: 104857600,
                modified: new Date('2023-10-15')
            },
            '/Movies/Home Videos/Wedding.mov': {
                name: 'Wedding.mov',
                type: 'file',
                path: '/Movies/Home Videos/Wedding.mov',
                size: 209715200,
                modified: new Date('2023-10-20')
            },
            '/Movies/Movie.mp4': {
                name: 'Movie.mp4',
                type: 'file',
                path: '/Movies/Movie.mp4',
                size: 1073741824,
                modified: new Date('2023-10-05')
            },
            '/Movies/Trailer.mov': {
                name: 'Trailer.mov',
                type: 'file',
                path: '/Movies/Trailer.mov',
                size: 52428800,
                modified: new Date('2023-10-08')
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
                    const childPath = path === '/' ? `/${childName}` : `${path}/${childName}`;
                    const child = this.fileSystem[childPath];
                    
                    return {
                        name: child.name,
                        type: child.type,
                        path: child.path,
                        size: child.size || 0,
                        modified: child.modified || new Date()
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