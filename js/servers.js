// SnapSnap Servers & Channels

const Servers = {
    currentServer: null,
    currentChannel: null,
    servers: [],
    unsubServers: null,

    init(userId) {
        this.userId = userId;
        this.listenToServers();
    },

    listenToServers() {
        if (this.unsubServers) this.unsubServers();

        this.unsubServers = db.collection('servers')
            .where('memberIds', 'array-contains', this.userId)
            .orderBy('createdAt')
            .onSnapshot((snapshot) => {
                this.servers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                this.renderServerIcons();

                // If current server was deleted, go home
                if (this.currentServer && !this.servers.find(s => s.id === this.currentServer.id)) {
                    App.goHome();
                }
            });
    },

    renderServerIcons() {
        const container = document.getElementById('server-icons');
        container.innerHTML = '';

        this.servers.forEach(server => {
            const icon = document.createElement('div');
            icon.className = `server-icon${this.currentServer?.id === server.id ? ' active' : ''}`;
            icon.style.backgroundColor = server.iconColor || '#5865f2';
            icon.textContent = server.name.charAt(0).toUpperCase();
            icon.title = server.name;
            icon.addEventListener('click', () => this.selectServer(server));
            container.appendChild(icon);
        });
    },

    async selectServer(server) {
        this.currentServer = server;
        this.currentChannel = null;
        this.renderServerIcons();

        // Switch to server view
        document.getElementById('home-header').style.display = 'none';
        document.getElementById('server-header').style.display = 'flex';
        document.getElementById('server-name-header').textContent = server.name;
        document.getElementById('home-nav').style.display = 'none';
        document.getElementById('server-channels').style.display = 'block';
        document.getElementById('server-id-display').textContent = server.id;
        document.getElementById('home-btn').classList.remove('active');

        // Hide friends view
        document.getElementById('friends-view').style.display = 'none';
        document.getElementById('welcome-view').style.display = 'none';

        this.loadChannels(server.id);
    },

    async loadChannels(serverId) {
        const snapshot = await db.collection('servers').doc(serverId)
            .collection('channels').orderBy('createdAt').get();

        const container = document.getElementById('channel-list');
        container.innerHTML = '';

        const channels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        channels.forEach(channel => {
            const el = document.createElement('div');
            el.className = `channel-item${this.currentChannel?.id === channel.id ? ' active' : ''}`;
            el.innerHTML = `<span class="channel-hash">#</span> ${UI.escapeHTML(channel.name)}`;
            el.addEventListener('click', () => this.selectChannel(channel));
            container.appendChild(el);
        });

        // Auto-select first channel if none selected
        if (channels.length > 0 && !this.currentChannel) {
            this.selectChannel(channels[0]);
        }
    },

    selectChannel(channel) {
        this.currentChannel = channel;

        // Show chat view
        document.getElementById('chat-view').style.display = 'flex';
        document.getElementById('friends-view').style.display = 'none';
        document.getElementById('welcome-view').style.display = 'none';
        document.getElementById('chat-header-name').textContent = channel.name;
        document.querySelector('.chat-header-icon').textContent = '#';
        document.getElementById('message-input').placeholder = `Message #${channel.name}`;

        // Start listening to messages
        Messages.listen(
            db.collection('servers').doc(this.currentServer.id)
                .collection('channels').doc(channel.id)
                .collection('messages')
        );

        // Refresh channel list to show active state
        this.loadChannels(this.currentServer.id);
    },

    showCreateServerModal() {
        UI.showModal('Create a Server', `
            <div class="form-group">
                <label>SERVER NAME</label>
                <input type="text" id="new-server-name" placeholder="My Awesome Server" maxlength="30">
            </div>
            <button class="btn-primary" id="create-server-submit">Create</button>
            <div class="separator">or</div>
            <div class="form-group">
                <label>JOIN A SERVER</label>
                <input type="text" id="join-server-id" placeholder="Enter a server ID">
            </div>
            <button class="btn-primary" id="join-server-submit" style="background:#23a559">Join</button>
        `);

        document.getElementById('create-server-submit').addEventListener('click', () => this.createServer());
        document.getElementById('join-server-submit').addEventListener('click', () => this.joinServer());
    },

    async createServer() {
        const name = document.getElementById('new-server-name').value.trim();
        if (!name) return;

        const colors = ['#5865f2', '#eb459e', '#57f287', '#ed4245', '#f47b67', '#e8a62b', '#45ddc0'];
        const iconColor = colors[Math.floor(Math.random() * colors.length)];

        try {
            const serverRef = await db.collection('servers').add({
                name: name,
                ownerId: this.userId,
                memberIds: [this.userId],
                iconColor: iconColor,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Create default #general channel
            await serverRef.collection('channels').add({
                name: 'general',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            UI.closeModal();
            UI.toast(`Server "${name}" created!`, 'success');
        } catch (err) {
            UI.toast('Failed to create server: ' + err.message, 'error');
        }
    },

    async joinServer() {
        const serverId = document.getElementById('join-server-id').value.trim();
        if (!serverId) return;

        try {
            const serverDoc = await db.collection('servers').doc(serverId).get();
            if (!serverDoc.exists) {
                UI.toast('Server not found. Check the ID.', 'error');
                return;
            }

            const data = serverDoc.data();
            if (data.memberIds.includes(this.userId)) {
                UI.toast("You're already in this server!", 'error');
                return;
            }

            await db.collection('servers').doc(serverId).update({
                memberIds: firebase.firestore.FieldValue.arrayUnion(this.userId)
            });

            UI.closeModal();
            UI.toast(`Joined "${data.name}"!`, 'success');
        } catch (err) {
            UI.toast('Failed to join server: ' + err.message, 'error');
        }
    },

    showCreateChannelModal() {
        if (!this.currentServer) return;

        UI.showModal('Create Channel', `
            <div class="form-group">
                <label>CHANNEL NAME</label>
                <input type="text" id="new-channel-name" placeholder="new-channel" maxlength="30">
            </div>
            <button class="btn-primary" id="create-channel-submit">Create Channel</button>
        `);

        document.getElementById('create-channel-submit').addEventListener('click', async () => {
            const name = document.getElementById('new-channel-name').value.trim().toLowerCase().replace(/\s+/g, '-');
            if (!name) return;

            try {
                await db.collection('servers').doc(this.currentServer.id)
                    .collection('channels').add({
                        name: name,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });

                UI.closeModal();
                this.loadChannels(this.currentServer.id);
                UI.toast(`Channel #${name} created!`, 'success');
            } catch (err) {
                UI.toast('Failed to create channel: ' + err.message, 'error');
            }
        });
    },

    cleanup() {
        if (this.unsubServers) this.unsubServers();
    }
};
